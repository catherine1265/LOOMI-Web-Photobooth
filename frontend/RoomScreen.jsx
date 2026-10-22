// Room page (/room/:code): header, combined preview canvas and the layer panel.
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { moveLayer } from "../lib/layers.js";
import { colorFor, createCompositor } from "./compositor.js";
import { RoomClient, loadSession } from "./roomClient.js";
import { CenteredMessage, Link, copyText, linkClass, navigate } from "./ui.jsx";
import CaptureBooth from "./CaptureBooth.jsx";
import Navbar from "./pages/Navbar/tampilan/Navbar.jsx";
import "./pages/PhotoType/components/SelfPhoto/style/SelfPhoto.css";

// ---- Room screen -----------------------------------------------------------------------

export function RoomScreen({ code, frameType, onEdit }) {
  const [session] = useState(() => loadSession(code));
  if (!session) {
    return (
      <CenteredMessage>
        <p>You need the meeting password to enter this room.</p>
        <Link href={`/?join=${encodeURIComponent(code)}`} className={linkClass}>
          Join meeting {code}
        </Link>
      </CenteredMessage>
    );
  }
  return <ConnectedRoom session={session} frameType={frameType} onEdit={onEdit} />;
}

function ConnectedRoom({ session, frameType, onEdit }) {
  const [client, setClient] = useState(null);

  useEffect(() => {
    const created = new RoomClient(session);
    setClient(created);
    created.connect();
    return () => {
      created.disconnect();
    };
  }, [session]);

  if (!client) return <CenteredMessage>Connecting…</CenteredMessage>;
  return <RoomView client={client} frameType={frameType} onEdit={onEdit} />;
}

const CONNECTION_STATUS = {
  connecting: { label: "Connecting" },
  connected: { label: "Connected" },
  reconnecting: { label: "Reconnecting" },
  disconnected: { label: "Disconnected" },
};

function CopyCodeButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="room-pill"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied!" : "Copy code"}</span>
    </button>
  );
}

function RoomView({ client, frameType, onEdit }) {
  const canvasRef = useRef(null);
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [toast, setToast] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const { session } = client;
  const state = snap.state;
  const stack = state?.stack ?? [];
  const isHost = state?.hostIdentity === session.identity;
  const status = CONNECTION_STATUS[snap.connection];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function leave() {
    setLeaving(true);
    await client.leave();
    navigate("/");
  }

  if (snap.ended) {
    return (
      <CenteredMessage>
        <p className="text-lg font-semibold">This meeting has ended.</p>
        <Link href="/" className={linkClass}>
          Back to home
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <main className="self-photo-page room-photo-page">
      <Navbar />

      <section className="self-photo-layout room-photo-layout">
        <header className="room-topbar">
          <span className="room-chip room-chip--code">
            Meeting code <strong className="room-code">{session.code}</strong>
          </span>
          <CopyCodeButton text={session.code} />
          <span role="status" className="room-chip">
            <span className={`room-dot room-dot--${snap.connection}`} aria-hidden="true" />
            {status.label}
          </span>
          {isHost && <span className="room-chip room-chip--solid">You are the host</span>}
          <button
            type="button"
            onClick={() => client.setCameraEnabled(!snap.cameraOn)}
            aria-pressed={!snap.cameraOn}
            className="room-pill room-topbar__push"
          >
            {snap.cameraOn ? "Turn camera off" : "Turn camera on"}
          </button>
          <button type="button" onClick={leave} disabled={leaving} className="room-pill room-pill--primary">
            {leaving ? "Leaving…" : "Leave"}
          </button>
        </header>

        {snap.notice && (
          <p role="status" className="room-banner">
            {snap.notice}
          </p>
        )}

        <CaptureBooth
          client={client}
          snap={snap}
          initialFrameType={frameType}
          canvasRef={canvasRef}
          onEdit={onEdit}
          layers={
            state ? (
              <LayerPanel
                stack={stack}
                hostIdentity={state.hostIdentity}
                localIdentity={session.identity}
                onReorder={(order) => client.reorder(order)}
                onTransferHost={(identity) => client.transferHost(identity)}
                onError={setToast}
              />
            ) : (
              <p className="room-layers__loading">Loading layers…</p>
            )
          }
        >
          <PreviewCanvas client={client} stack={stack} canvasRef={canvasRef} />
        </CaptureBooth>
        <p className="room-sr-only">
          Preview of the combined image: the bottom layer fills the background, the other layers are drawn on top in stack order.
        </p>
      </section>

      <div aria-live="assertive" className="room-toast-area">
        {toast && (
          <p role="alert" className="room-toast">
            {toast}
          </p>
        )}
      </div>
    </main>
  );
}

// ---- Preview canvas ----------------------------------------------------------------------

const FRAME_INTERVAL_MS = 1000 / 30;

function PreviewCanvas({ client, stack, canvasRef }) {
  const stackRef = useRef(stack);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    const compositor = createCompositor();

    let raf = 0;
    let last = 0;

    const loop = (t) => {
      raf = requestAnimationFrame(loop);

      if (t - last < FRAME_INTERVAL_MS) return;

      last = t;

      const layers = stackRef.current.map((e) => ({
        identity: e.identity,
        name: e.name,
        video:
          e.absentSince === undefined
            ? client.getVideoElement(e.identity)
            : null,
      }));

      compositor.render(
        layers,
        canvas,
        client.session.identity
      );
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      compositor.dispose();
    };
  }, [client, canvasRef]);

  const description =
    stack.length === 0
      ? "Combined preview, waiting for participants."
      : `Combined preview. Background: ${
          stack[stack.length - 1].name
        }. Top layer: ${stack[0].name}.`;

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      role="img"
      aria-label={description}
      className="room-canvas"
    />
  );
}
// ---- Layer panel (host drags to reorder; everyone else sees it read-only) ----------------

function describePosition(index, count) {
  if (index < 0) return "unknown position";
  const role =
    index === 0 && count === 1 ? " (top and background)" : index === 0 ? " (top)" : index === count - 1 ? " (background)" : "";
  return `layer ${index + 1} of ${count}${role}`;
}

function LayerPanel({ stack, hostIdentity, localIdentity, onReorder, onTransferHost, onError }) {
  const isHost = hostIdentity === localIdentity;
  const [pendingOrder, setPendingOrder] = useState(null);

  // While a reorder request is in flight, show the new order right away.
  const items = useMemo(() => {
    if (!pendingOrder) return stack;
    const byId = new Map(stack.map((e) => [e.identity, e]));
    const ordered = pendingOrder.filter((id) => byId.has(id)).map((id) => byId.get(id));
    const rest = stack.filter((e) => !pendingOrder.includes(e.identity));
    return [...ordered, ...rest];
  }, [stack, pendingOrder]);
  const ids = items.map((e) => e.identity);
  const nameOf = (id) => items.find((e) => e.identity === id)?.name ?? String(id);
  const positionOf = (id) => describePosition(ids.indexOf(String(id)), ids.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} is over ${positionOf(over.id)}.` : `${nameOf(active.id)} is not over a layer.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped at ${positionOf(over.id)}.` : `${nameOf(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Reordering cancelled. ${nameOf(active.id)} was not moved.`,
  };

  async function commit(order) {
    setPendingOrder(order);
    const result = await onReorder(order);
    setPendingOrder(null);
    if (!result.ok) onError(result.message);
  }

  function move(from, to) {
    if (to < 0 || to >= items.length) return;
    commit(moveLayer(items, from, to).map((e) => e.identity));
  }

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  }

  async function makeHost(identity) {
    const result = await onTransferHost(identity);
    if (!result.ok) onError(result.message);
  }

  return (
    <section aria-labelledby="layers-title" className="room-layers">
      <div className="room-layers__head">
        <h2 id="layers-title" className="room-layers__title">
          Layers <span>· {items.length} participant{items.length === 1 ? "" : "s"}</span>
        </h2>
        <span className="room-layers__hint">{isHost ? "Drag to reorder" : "Set by the host"}</span>
      </div>
      <p id="layers-help" className="room-sr-only">
        The first layer is drawn on top. The last layer is the background.
        {isHost && " To reorder with the keyboard, focus a drag handle, press Space, use the arrow keys, then press Space again."}
      </p>

      <DndContext
        id="layer-stack"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To pick up a layer, press Space or Enter. Use the up and down arrow keys to move it. Press Space or Enter again to drop it, or Escape to cancel.",
          },
        }}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <ol aria-describedby="layers-help" className="room-layers__row">
            {items.map((entry, index) => (
              <LayerRow
                key={entry.identity}
                entry={entry}
                index={index}
                count={items.length}
                isHost={isHost}
                isRowHost={entry.identity === hostIdentity}
                isYou={entry.identity === localIdentity}
                onMove={move}
                onMakeHost={makeHost}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function LayerRow({ entry, index, count, isHost, isRowHost, isYou, onMove, onMakeHost }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.identity,
    disabled: !isHost,
  });
  const isTop = index === 0;
  const isBottom = index === count - 1;
  const absent = entry.absentSince !== undefined;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`room-layer${isDragging ? " room-layer--dragging" : ""}${absent ? " room-layer--absent" : ""}`}
    >
      {isHost && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${entry.name}, ${describePosition(index, count)}`}
          className="room-layer__grip"
        >
          <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true" fill="currentColor">
            {[3, 9, 15].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.6" />, <circle key={`b${y}`} cx="9" cy={y} r="1.6" />])}
          </svg>
        </button>
      )}
      <span className="room-layer__index" aria-hidden="true">
        {index + 1}
      </span>
      <span className="room-layer__dot" style={{ background: colorFor(entry.identity) }} aria-hidden="true" />
      <div className="room-layer__body">
        <div className="room-layer__name">
          <span>{entry.name}</span>
          {isYou && <span className="room-layer__you">(you)</span>}
        </div>
        <div className="room-layer__tags">
          {isTop && <Tag>Top</Tag>}
          {isBottom && <Tag>Background</Tag>}
          {isRowHost && <Tag solid>Host</Tag>}
          {absent && <Tag>Reconnecting…</Tag>}
          {isHost && !isRowHost && !absent && (
            <button
              type="button"
              onClick={() => onMakeHost(entry.identity)}
              className="room-tag room-tag--button"
              aria-label={`Make ${entry.name} the host`}
            >
              Make host
            </button>
          )}
        </div>
      </div>
      {isHost && (
        <div className="room-layer__moves">
          <IconButton label={`Move ${entry.name} up`} disabled={isTop} onClick={() => onMove(index, index - 1)}>
            ↑
          </IconButton>
          <IconButton label={`Move ${entry.name} down`} disabled={isBottom} onClick={() => onMove(index, index + 1)}>
            ↓
          </IconButton>
        </div>
      )}
    </li>
  );
}

function Tag({ solid, children }) {
  return <span className={`room-tag${solid ? " room-tag--solid" : ""}`}>{children}</span>;
}

function IconButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="room-layer__move"
    >
      {children}
    </button>
  );
}

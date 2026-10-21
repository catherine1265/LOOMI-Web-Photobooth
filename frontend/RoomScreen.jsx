// Room page (/room/:code): connects to the meeting and shows the colab photo booth.
import { useEffect, useState } from "react";
import { RoomClient, loadSession } from "./roomClient.js";
import { Link } from "./ui.jsx";
import ColabRoom from "./pages/PhotoType/components/ColabRoom/ColabRoom.jsx";
import RoomMessage from "./pages/PhotoType/components/ColabRoom/RoomMessage.jsx";

export function RoomScreen({ code, frameType, onDone }) {
import { CenteredMessage, CopyButton, Link, linkClass, navigate } from "./ui.jsx";
import CaptureBooth from "./CaptureBooth.jsx";

// ---- Room screen -----------------------------------------------------------------------

export function RoomScreen({ code, frameType, onEdit }) {
  const [session] = useState(() => loadSession(code));
  if (!session) {
    return (
      <RoomMessage>
        <p className="colab-room-message__title">You need the meeting password to enter this room.</p>
        <Link href={`/?join=${encodeURIComponent(code)}`} className="colab-room-message__button">
          Join meeting {code}
        </Link>
      </RoomMessage>
    );
  }
  return <ConnectedRoom session={session} frameType={frameType} onDone={onDone} />;
}

function ConnectedRoom({ session, frameType, onDone }) {
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

  if (!client) {
  if (!client) return <CenteredMessage>Connecting…</CenteredMessage>;
  return <RoomView client={client} frameType={frameType} onEdit={onEdit} />;
}

const CONNECTION_STATUS = {
  connecting: { label: "Connecting", dot: "bg-amber-400 animate-pulse" },
  connected: { label: "Connected", dot: "bg-emerald-500" },
  reconnecting: { label: "Reconnecting", dot: "bg-amber-500 animate-pulse" },
  disconnected: { label: "Disconnected", dot: "bg-red-500" },
};

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
      <RoomMessage>
        <p className="colab-room-message__title">Connecting…</p>
      </RoomMessage>
    );
  }
  return <ColabRoom client={client} frameType={frameType} onDone={onDone} />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="mr-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Meeting code</p>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-[0.15em]">{session.code}</h1>
            <CopyButton text={session.code} label="Copy code" className="py-1 text-xs" />
          </div>
        </div>
        <span role="status" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-slate-800">
          <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </span>
        {isHost && (
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">You are the host</span>
        )}
        <button
          type="button"
          onClick={() => client.setCameraEnabled(!snap.cameraOn)}
          aria-pressed={!snap.cameraOn}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {snap.cameraOn ? "Turn camera off" : "Turn camera on"}
        </button>
        <button
          type="button"
          onClick={leave}
          disabled={leaving}
          className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {leaving ? "Leaving…" : "Leave"}
        </button>
      </header>

      {snap.notice && (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {snap.notice}
        </p>
      )}

      <main className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section aria-label="Preview" className="flex flex-col gap-2">
          <CaptureBooth client={client} snap={snap} initialFrameType={frameType} canvasRef={canvasRef} onEdit={onEdit}>
            <PreviewCanvas client={client} stack={stack} canvasRef={canvasRef} />
          </CaptureBooth>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Preview of the combined image: the bottom layer fills the background, the other layers are drawn on top in stack
            order.
          </p>
        </section>

        <aside className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100/60 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          {state ? (
            <LayerPanel
              stack={stack}
              hostIdentity={state.hostIdentity}
              localIdentity={session.identity}
              onReorder={(order) => client.reorder(order)}
              onTransferHost={(identity) => client.transferHost(identity)}
              onError={setToast}
            />
          ) : (
            <p className="p-2 text-sm text-slate-500">Loading layers…</p>
          )}
        </aside>
      </main>

      <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-4">
        {toast && (
          <p
            role="alert"
            className="pointer-events-auto rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900"
          >
            {toast}
          </p>
        )}
      </div>
    </div>
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
        video: e.absentSince === undefined ? client.getVideoElement(e.identity) : null,
      }));
      compositor.render(layers, canvas);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      compositor.dispose();
    };
  }, [client]);

  const description =
    stack.length === 0
      ? "Combined preview, waiting for participants."
      : `Combined preview. Background: ${stack[stack.length - 1].name}. Top layer: ${stack[0].name}.`;

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      role="img"
      aria-label={description}
      className="aspect-video w-full rounded-2xl bg-slate-900 shadow-lg"
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
    <section aria-labelledby="layers-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="layers-title" className="text-base font-semibold">
          Layers <span className="font-normal text-slate-500">· {items.length} participant{items.length === 1 ? "" : "s"}</span>
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{isHost ? "Drag to reorder" : "Set by the host"}</span>
      </div>
      <p id="layers-help" className="sr-only">
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
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol aria-describedby="layers-help" className="flex flex-col gap-2">
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
      className={`relative flex items-center gap-2 rounded-xl border bg-white p-2 pr-3 dark:bg-slate-900 ${
        isDragging
          ? "z-10 scale-[1.02] border-indigo-500 shadow-xl ring-2 ring-indigo-500/40"
          : "border-slate-200 shadow-sm dark:border-slate-800"
      } ${absent ? "opacity-60" : ""}`}
    >
      {isHost && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${entry.name}, ${describePosition(index, count)}`}
          className={`flex h-9 w-7 shrink-0 touch-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true" fill="currentColor">
            {[3, 9, 15].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.6" />, <circle key={`b${y}`} cx="9" cy={y} r="1.6" />])}
          </svg>
        </button>
      )}
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-slate-400" aria-hidden="true">
        {index + 1}
      </span>
      <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: colorFor(entry.identity) }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{entry.name}</span>
          {isYou && <span className="text-xs text-slate-500">(you)</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {isTop && <Tag tone="amber">Top</Tag>}
          {isBottom && <Tag tone="sky">Background</Tag>}
          {isRowHost && <Tag tone="indigo">Host</Tag>}
          {absent && <Tag tone="slate">Reconnecting…</Tag>}
          {isHost && !isRowHost && !absent && (
            <button
              type="button"
              onClick={() => onMakeHost(entry.identity)}
              className="rounded border border-slate-300 px-1.5 py-px text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={`Make ${entry.name} the host`}
            >
              Make host
            </button>
          )}
        </div>
      </div>
      {isHost && (
        <div className="flex shrink-0 items-center">
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

const TAG_TONES = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function Tag({ tone, children }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${TAG_TONES[tone]}`}>{children}</span>;
}

function IconButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

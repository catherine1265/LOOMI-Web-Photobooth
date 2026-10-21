import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { moveLayer } from "../../../../../lib/layers.js";
import { colorFor } from "../../../../compositor.js";

function describePosition(index, count) {
  if (index < 0) return "unknown position";
  const role =
    index === 0 && count === 1 ? " (top and background)" : index === 0 ? " (top)" : index === count - 1 ? " (background)" : "";
  return `layer ${index + 1} of ${count}${role}`;
}

export default function LayerPanel({ stack, hostIdentity, localIdentity, onReorder, onTransferHost, onError }) {
  const isHost = hostIdentity === localIdentity;
  const [pendingOrder, setPendingOrder] = useState(null);

  const items = useMemo(() => {
    if (!pendingOrder) return stack;
    const byId = new Map(stack.map((entry) => [entry.identity, entry]));
    const ordered = pendingOrder.filter((id) => byId.has(id)).map((id) => byId.get(id));
    const rest = stack.filter((entry) => !pendingOrder.includes(entry.identity));
    return [...ordered, ...rest];
  }, [stack, pendingOrder]);
  const ids = items.map((entry) => entry.identity);
  const nameOf = (id) => items.find((entry) => entry.identity === id)?.name ?? String(id);
  const positionOf = (id) => describePosition(ids.indexOf(String(id)), ids.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
    commit(moveLayer(items, from, to).map((entry) => entry.identity));
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
    <aside className="colab-layers" aria-labelledby="layers-title">
      <div className="colab-layers__header">
        <h2 id="layers-title" className="colab-layers__title">
          Layers
        </h2>
        <span className="colab-layers__count">
          {items.length} participant{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="colab-layers__hint">{isHost ? "Drag to reorder" : "Set by the host"}</p>
      <p id="layers-help" className="colab-room-sr-only">
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
          <ol aria-describedby="layers-help" className="colab-layers__list">
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
    </aside>
  );
}

function LayerRow({ entry, index, count, isHost, isRowHost, isYou, onMove, onMakeHost }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.identity,
    disabled: !isHost,
  });
  const absent = entry.absentSince !== undefined;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`colab-layer${isDragging ? " colab-layer--dragging" : ""}${absent ? " colab-layer--absent" : ""}`}
    >
      {isHost && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${entry.name}, ${describePosition(index, count)}`}
          className="colab-layer__grip"
        >
          <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true" fill="currentColor">
            {[3, 9, 15].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.6" />, <circle key={`b${y}`} cx="9" cy={y} r="1.6" />])}
          </svg>
        </button>
      )}
      <span className="colab-layer__index" aria-hidden="true">
        {index + 1}
      </span>
      <span className="colab-layer__swatch" style={{ background: colorFor(entry.identity) }} aria-hidden="true" />
      <div className="colab-layer__body">
        <div className="colab-layer__name">
          <span>{entry.name}</span>
          {isYou && <span className="colab-layer__you">(you)</span>}
        </div>
        <div className="colab-layer__tags">
          {index === 0 && <span className="colab-tag">Top</span>}
          {index === count - 1 && <span className="colab-tag">Background</span>}
          {isRowHost && <span className="colab-tag colab-tag--host">Host</span>}
          {absent && <span className="colab-tag">Reconnecting…</span>}
          {isHost && !isRowHost && !absent && (
            <button
              type="button"
              className="colab-tag colab-tag--button"
              onClick={() => onMakeHost(entry.identity)}
              aria-label={`Make ${entry.name} the host`}
            >
              Make host
            </button>
          )}
        </div>
      </div>
      {isHost && (
        <div className="colab-layer__moves">
          <button
            type="button"
            className="colab-layer__move"
            aria-label={`Move ${entry.name} up`}
            title={`Move ${entry.name} up`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="colab-layer__move"
            aria-label={`Move ${entry.name} down`}
            title={`Move ${entry.name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
          >
            ↓
          </button>
        </div>
      )}
    </li>
  );
}

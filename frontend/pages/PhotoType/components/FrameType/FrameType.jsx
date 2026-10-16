import { useLayoutEffect, useRef, useState } from "react";
import "./style/FrameType.css";
import Navbar from "../../../Navbar/tampilan/Navbar";
import FrameTypeCard from "./FrameTypeCard";

export const photoTypes = [
  { id: "1x1", label: "1x1", image: null, slots: 1, columns: 1 },
  { id: "1x2", label: "1x2", image: null, slots: 2, columns: 1 },
  { id: "1x3", label: "1x3", image: null, slots: 3, columns: 1 },
  { id: "1x4", label: "1x4", image: null, slots: 4, columns: 1 },
  { id: "2x2", label: "2x2", image: null, slots: 4, columns: 2 },
];

const NOTCH_R = 24;
const PITCH_X = 75;
const PITCH_Y = 70;
const EDGE_GAP = 44;

function countNotches(length, pitch) {
  let n = Math.round((length - EDGE_GAP * 2) / pitch);
  while (n > 0 && (length - EDGE_GAP * 2) / n < NOTCH_R * 2 + 6) n--;
  return Math.max(n, 0);
}

function buildTicketPath(w, h) {
  const r = NOTCH_R;
  const nx = countNotches(w, PITCH_X);
  const ny = countNotches(h, PITCH_Y);
  const sx = nx ? (w - EDGE_GAP * 2) / nx : 0;
  const sy = ny ? (h - EDGE_GAP * 2) / ny : 0;
  const cx = (i) => EDGE_GAP + sx * (i + 0.5);
  const cy = (i) => EDGE_GAP + sy * (i + 0.5);

  let d = "M0 0";

  for (let i = 0; i < nx; i++) d += ` H${cx(i) - r} A${r} ${r} 0 0 0 ${cx(i) + r} 0`;
  d += ` H${w}`;

  for (let i = 0; i < ny; i++) d += ` V${cy(i) - r} A${r} ${r} 0 0 0 ${w} ${cy(i) + r}`;
  d += ` V${h}`;

  for (let i = nx - 1; i >= 0; i--) d += ` H${cx(i) + r} A${r} ${r} 0 0 0 ${cx(i) - r} ${h}`;
  d += " H0";

  for (let i = ny - 1; i >= 0; i--) d += ` V${cy(i) + r} A${r} ${r} 0 0 0 0 ${cy(i) - r}`;

  return d + " Z";
}

function TicketFrame() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="frame-type__frame" ref={ref} aria-hidden="true">
      {size.w > 0 && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <path d={buildTicketPath(size.w, size.h)} />
        </svg>
      )}
    </div>
  );
}

function Sparkle({ className = "" }) {
  return (
    <svg
      className={`frame-type__sparkle ${className}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path d="M50 2 L53.8 40.8 L71.2 28.8 L59.2 46.2 L98 50 L59.2 53.8 L71.2 71.2 L53.8 59.2 L50 98 L46.2 59.2 L28.8 71.2 L40.8 53.8 L2 50 L40.8 46.2 L28.8 28.8 L46.2 40.8Z" />
    </svg>
  );
}

export default function FrameType({ onSelect, onBack }) {
  const [selectedId, setSelectedId] = useState(null);

  function handleSelect(id) {
    setSelectedId(id);
    onSelect?.(id);
  }

  return (
    <main className="frame-type-page">
      <Navbar />

      <section className="frame-type">
        <div className="frame-type__heading">
          <span>CHOOSE YOUR FRAME TYPE</span>
        </div>

        <div className="frame-type__ticket">
          <TicketFrame />
          <Sparkle className="frame-type__sparkle--left" />
          <Sparkle className="frame-type__sparkle--right" />

          <div className="frame-type__options">
            {photoTypes.map((layout) => (
              <FrameTypeCard
                key={layout.id}
                layout={layout}
                selected={selectedId === layout.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            className="frame-type__back"
            onClick={onBack}
          >
            Back
          </button>
        )}
      </section>
    </main>
  );
}

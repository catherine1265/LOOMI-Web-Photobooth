import { useLayoutEffect, useRef, useState } from "react";
import "./style/PhotoType.css";
import Navbar from "../Navbar/tampilan/Navbar";


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

  // atas (kiri -> kanan)
  for (let i = 0; i < nx; i++) d += ` H${cx(i) - r} A${r} ${r} 0 0 0 ${cx(i) + r} 0`;
  d += ` H${w}`;

  // kanan (atas -> bawah)
  for (let i = 0; i < ny; i++) d += ` V${cy(i) - r} A${r} ${r} 0 0 0 ${w} ${cy(i) + r}`;
  d += ` V${h}`;

  // bawah (kanan -> kiri)
  for (let i = nx - 1; i >= 0; i--) d += ` H${cx(i) + r} A${r} ${r} 0 0 0 ${cx(i) - r} ${h}`;
  d += ` H0`;

  // kiri (bawah -> atas)
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
    <div className="photo-type__frame" ref={ref} aria-hidden="true">
      {size.w > 0 && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <path d={buildTicketPath(size.w, size.h)} />
        </svg>
      )}
    </div>
  );
}

const PhotoIcon = ({ type }) => {
  if (type === "self") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="30.5" r="19" fill="currentColor" />
        <path
          d="M13 82 C13 66 30 55.5 50 55.5 C70 55.5 87 66 87 82 Q87 87.5 81 87.5 H19 Q13 87.5 13 82Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (type === "colab") {
    return (
      <svg viewBox="0 0 140 100" aria-hidden="true">
        <circle cx="36" cy="34.5" r="17.5" fill="currentColor" />
        <circle cx="104" cy="34.5" r="17.5" fill="currentColor" />
        <path
          d="M3.5 77 C3.5 64 18 55.5 36 55.5 C54 55.5 68.5 64 68.5 77 Q68.5 82.5 62.5 82.5 H9.5 Q3.5 82.5 3.5 77Z"
          fill="currentColor"
        />
        <path
          d="M71.5 77 C71.5 64 86 55.5 104 55.5 C122 55.5 136.5 64 136.5 77 Q136.5 82.5 130.5 82.5 H77.5 Q71.5 82.5 71.5 77Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="46" cy="30" r="15.5" fill="currentColor" />
      <path
        d="M21.5 77 C21.5 64 32 55.5 46 55.5 C54 55.5 60 58 64 65 L46.5 82.5 H27.5 Q21.5 82.5 21.5 77Z"
        fill="currentColor"
      />
      <g transform="translate(75.35 68.15) rotate(45)" fill="currentColor">
        <rect x="-7.5" y="-25" width="15" height="10" rx="3.5" />
        <path d="M-7.5 -12 H7.5 V12 L0 25 L-7.5 12Z" />
      </g>
    </svg>
  );
};

function Sparkle({ className = "" }) {
  return (
    <svg
      className={`photo-type__sparkle ${className}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M50 2 L53.8 40.8 L71.2 28.8 L59.2 46.2 L98 50 L59.2 53.8 L71.2 71.2 L53.8 59.2 L50 98 L46.2 59.2 L28.8 71.2 L40.8 53.8 L2 50 L40.8 46.2 L28.8 28.8 L46.2 40.8Z"
        fill="#f7e9b0"
        stroke="#652b2b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PhotoType({ onSelfPhoto, onColabPhoto, onEditPhoto }) {
  const options = [
    { type: "self", label: "Self Photo", action: onSelfPhoto },
    { type: "colab", label: "Colab Photo", action: onColabPhoto },
    { type: "edit", label: "Edit Photo", action: onEditPhoto },
  ];

  return (
    <main className="photo-type-page">
      <Navbar />

      <section className="photo-type">
        <div className="photo-type__heading">
          <span>CHOOSE YOUR PHOTO TYPE</span>
        </div>

        <div className="photo-type__ticket">
          <TicketFrame />
          <Sparkle className="photo-type__sparkle--left" />
          <Sparkle className="photo-type__sparkle--right" />

          <div className="photo-type__options">
            {options.map((option) => (
              <button
                className="photo-type__option"
                key={option.type}
                type="button"
                onClick={option.action}
                aria-label={option.label}
              >
                <span className={`photo-type__icon photo-type__icon--${option.type}`}>
                  <PhotoIcon type={option.type} />
                </span>

                <span className="photo-type__label">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
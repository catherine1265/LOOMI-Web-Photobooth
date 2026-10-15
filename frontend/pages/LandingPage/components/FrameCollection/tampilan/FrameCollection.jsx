import "../style/FrameCollection.css";

const frames = [
  { id: 1, name: "Frame 1", color: "beige" },
  { id: 2, name: "Frame 2", color: "pink" },
  { id: 3, name: "Frame 3", color: "blue" },
  { id: 4, name: "Frame 4", color: "peach" },
  { id: 5, name: "Frame 5", color: "pink" },
  { id: 6, name: "Frame 6", color: "yellow" },
  { id: 7, name: "Frame 7", color: "blue" },
  { id: 8, name: "Frame 8", color: "peach" },
];

/* bentuk bintang: SAMA dengan sparkle di FeatureSection */
const STAR_PATH =
  "M185.3 166.3 Q203 136 221 47 Q203 136 207.3 170.7 " +
  "Q223.6 171.4 270 132 Q223.6 171.4 222.8 191 " +
  "Q244.6 209.2 320 222 Q244.6 209.2 217.6 219.9 " +
  "Q210.2 237.8 238 290 Q210.2 237.8 195 233.6 " +
  "Q178.7 258.8 163 340 Q178.7 258.8 172.5 229.2 " +
  "Q156.4 227.3 110 265 Q156.4 227.3 157 208.2 " +
  "Q136.2 189.5 62 175 Q136.2 189.5 162.7 179.8 " +
  "Q169.4 161.4 141 108 Q169.4 161.4 185.3 166.3 Z";

/* warna sparkle (tetap seperti sebelumnya) */
const SPARKLE_FILL = "#fdf3ec";
const SPARKLE_STROKE = "#682326";

function Sparkle({ className = "" }) {
  return (
    <svg
      className={`collection-sparkle ${className}`}
      viewBox="55 40 272 308"
      aria-hidden="true"
    >
      <g transform="rotate(-20 190 200)">
        <path
          d={STAR_PATH}
          fill={SPARKLE_FILL}
          stroke={SPARKLE_STROKE}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d={STAR_PATH}
          transform="translate(190 200) scale(0.55) translate(-190 -200)"
          fill={SPARKLE_FILL}
          stroke={SPARKLE_STROKE}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d={STAR_PATH}
          transform="translate(190 200) scale(0.2) translate(-190 -200)"
          fill={SPARKLE_STROKE}
          stroke={SPARKLE_STROKE}
          strokeWidth="12"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default function FrameCollection() {
  return (
    <section className="frame-collection" id="frame-collection">
      <div className="collection-curtain" aria-hidden="true" />

      <div className="collection-stage">
        {/* JUDUL + SPARKLE (sparkle mengikuti tepi judul) */}
        <div className="collection-heading">
          <Sparkle className="collection-sparkle-left" />
          <h2 className="collection-title">FRAME COLLECTION</h2>
          <Sparkle className="collection-sparkle-right" />
        </div>

        <div className="collection-grid">
          {frames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              className={`collection-frame ${frame.color}`}
              aria-label={`Choose ${frame.name}`}
              onClick={() => console.log(`Selected ${frame.name}`)}
            >
              <span className="folder-tab" aria-hidden="true" />

              <span className="folder-body">
                <span className="folder-preview" aria-hidden="true" />
                <span className="folder-handle" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="collection-bottom-nav" aria-hidden="true" />
    </section>
  );
}
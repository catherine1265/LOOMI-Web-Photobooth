
import "../style/FeatureSection.css";

/* Ukuran badan frame */
const CARD_W = 173;
const CARD_H = 210;
const SCALLOP_R = 10.5;

/* Titik tengah lingkaran scallop di sekeliling frame */
const SCALLOPS = (() => {
  const nx = 9;
  const ny = 11;
  const pts = [];

  for (let i = 0; i <= nx; i += 1) {
    const x = (CARD_W / nx) * i;
    pts.push([x, 0], [x, CARD_H]);
  }

  for (let j = 1; j < ny; j += 1) {
    const y = (CARD_H / ny) * j;
    pts.push([0, y], [CARD_W, y]);
  }

  return pts;
})();

/* Bentuk bintang: sama dengan sparkle di Landing Page */
const STAR_PATH =
  "M185.3 166.3 Q203 136 221 47 Q203 136 207.3 170.7 " +
  "Q223.6 171.4 270 132 Q223.6 171.4 222.8 191 " +
  "Q244.6 209.2 320 222 Q244.6 209.2 217.6 219.9 " +
  "Q210.2 237.8 238 290 Q210.2 237.8 195 233.6 " +
  "Q178.7 258.8 163 340 Q178.7 258.8 172.5 229.2 " +
  "Q156.4 227.3 110 265 Q156.4 227.3 157 208.2 " +
  "Q136.2 189.5 62 175 Q136.2 189.5 162.7 179.8 " +
  "Q169.4 161.4 141 108 Q169.4 161.4 185.3 166.3 Z";

/* Warna sparkle */
const SPARKLE_STROKE = "#45596b";

function Sparkle({ className }) {
  return (
    <svg
      className={className}
      viewBox="55 40 272 308"
      aria-hidden="true"
    >
      <g transform="rotate(-20 190 200)">
        <path
          d={STAR_PATH}
          fill="#f9d3d8"
          stroke={SPARKLE_STROKE}
          strokeWidth="7"
          strokeLinejoin="round"
        />

        <path
          d={STAR_PATH}
          transform="translate(190 200) scale(0.55) translate(-190 -200)"
          fill="#fdeaec"
          stroke={SPARKLE_STROKE}
          strokeWidth="5"
          strokeLinejoin="round"
        />

        <path
          d={STAR_PATH}
          transform="translate(190 200) scale(0.2) translate(-190 -200)"
          fill="#f3e08a"
          stroke={SPARKLE_STROKE}
          strokeWidth="12"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/* Jepitan frame */
function Clip({ x, y, tilt }) {
  return (
    <svg
      className="frame-clip"
      viewBox="0 0 60 80"
      aria-hidden="true"
      style={{ "--cx": x, "--cy": y }}
    >
      {/* Penjepit belakang */}
      <rect
        x="23.5"
        y="2"
        width="13"
        height="58"
        rx="2.5"
        fill="#d6c3b4"
        stroke="#8c6d5f"
        strokeWidth="1"
      />

      {/* Penjepit depan */}
      <g transform={`rotate(${tilt} 30 48)`}>
        <rect
          x="23"
          y="0"
          width="14"
          height="66"
          rx="2.5"
          fill="#fdf1ea"
          stroke="#8c6d5f"
          strokeWidth="1"
        />

        <rect
          x="23.7"
          y="1"
          width="3.6"
          height="64"
          rx="1.5"
          fill="#ecd7ca"
        />
      </g>

      {/* Pin */}
      <circle
        cx="30"
        cy="48"
        r="4.6"
        fill="#d6e3ea"
        stroke="#7b6c70"
        strokeWidth="1.1"
      />
    </svg>
  );
}

/* Data posisi dan rotasi kartu */
const features = [
  {
    title: "Self Photo",
    mode: "self",
    image : "/images/SelfPhoto.png",
    x: 140,
    y: 356,
    r: -7,
    clips: [{ x: 172, y: -20, tilt: 30 }],
  },
  {
    title: "Colab Photo",
    mode: "colab",
    image : "/images/ColabPhoto.png",
    x: 454.5,
    y: 354.5,
    r: 0,
    clips: [
      { x: -3, y: -13, tilt: -36 },
      { x: 176, y: -14, tilt: 33 },
    ],
  },
  {
    title: "Customize Photo",
    mode: "customize",
    x: 777,
    y: 343,
    r: 6,
    clips: [{ x: -3.5, y: -14, tilt: -37 }],
  },
];

export default function FeatureSection({
  onSelfPhoto,
  onColabPhoto,
  onEditPhoto,
}) {
  /* Navigasi berdasarkan kartu yang diklik */
  const handleSelect = (mode) => {
    if (mode === "self") {
      onSelfPhoto?.();
    } else if (mode === "colab") {
      onColabPhoto?.();
    } else if (mode === "customize") {
      onEditPhoto?.();
    }
  };

  return (
    <section className="feature-section" id="features">
      <div className="feature-curtain" aria-hidden="true" />

      <div className="feature-stage">
        {/* TALI */}
        <svg
          className="feature-string"
          viewBox="0 0 938 300"
          aria-hidden="true"
        >
          <path
            d="M-2000 -275 L0 178 C150 212 300 241 450 241 C600 241 780 190 938 163 L2938 -179"
            fill="none"
            stroke="#672629"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>

        {/* JUDUL + SPARKLE */}
        <Sparkle className="feature-sparkle sparkle-left" />

        <h2 className="feature-title">OUR FEATURES</h2>

        <Sparkle className="feature-sparkle sparkle-right" />

        {/* FRAME KARTU */}
        {features.map((feature) => (
          <article
            className="feature-frame"
            key={feature.title}
            style={{
              "--x": feature.x,
              "--y": feature.y,
              "--r": feature.r,
            }}
          >
            <svg
              className="frame-scallop"
              viewBox={`-12 -12 ${CARD_W + 24} ${CARD_H + 24}`}
              aria-hidden="true"
            >
              <g
                fill="#6f433f"
                stroke="#6f433f"
                strokeWidth="2.6"
              >
                {SCALLOPS.map(([cx, cy], i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={SCALLOP_R}
                  />
                ))}
              </g>

              <g fill="#c8dae2">
                {SCALLOPS.map(([cx, cy], i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={SCALLOP_R}
                  />
                ))}
              </g>
            </svg>

            <div className="frame-body" aria-hidden="true" />
            <div className="frame-photo">
              <img
                src={feature.image}
                alt={feature.title}
                loading="lazy"
              />
            </div>

            <button
              type="button"
              className="frame-button"
              onClick={() => handleSelect(feature.mode)}
            >
              {feature.title}
            </button>

            {feature.clips.map((clip, i) => (
              <Clip key={i} {...clip} />
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

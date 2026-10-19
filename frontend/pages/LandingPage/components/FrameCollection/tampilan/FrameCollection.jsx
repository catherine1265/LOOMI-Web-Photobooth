import { useState } from "react";
import "../style/FrameCollection.css";
import { frameThemes } from "../../../../EditPage/editorData.js";
import { getSlotRects, printSpec } from "../../../../../printSpec.js";

/* Folder = tema yang sama dengan tab Frame di halaman edit.
   Di sini hanya untuk melihat-lihat, frame tidak bisa dipilih. */
const FOLDER_COLORS = {
  y2k: "blue",
  vintage: "beige",
  kidcore: "yellow",
  soft: "pink",
};

/* Kotak foto kosong di tiap frame (posisi diambil dari printSpec 1x3,
   jadi sama dengan strip di halaman edit) */
const PREVIEW_SPEC = printSpec["1x3"];
const PREVIEW_SLOTS = getSlotRects(PREVIEW_SPEC).map((slot) => ({
  left: `${(slot.x / PREVIEW_SPEC.width) * 100}%`,
  top: `${(slot.y / PREVIEW_SPEC.height) * 100}%`,
  width: `${(slot.width / PREVIEW_SPEC.width) * 100}%`,
  height: `${(slot.height / PREVIEW_SPEC.height) * 100}%`,
}));

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
  const [themeId, setThemeId] = useState(null);
  const theme = frameThemes.find((item) => item.id === themeId);

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

        {theme ? (
          <div className="collection-viewer">
            <div className="collection-viewer-header">
              <button
                type="button"
                className="collection-back"
                aria-label="Back to frame folders"
                onClick={() => setThemeId(null)}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m15 5-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <p className="collection-viewer-title">{theme.label}</p>
            </div>

            <div className="collection-viewer-list">
              {theme.frames.length === 0 && (
                <p className="collection-viewer-empty">Frames coming soon.</p>
              )}
              {theme.frames.map((frame) => (
                <div
                  key={frame.id}
                  className="collection-strip"
                  style={{ backgroundImage: `url("${frame.src}")` }}
                  role="img"
                  aria-label={`${theme.label} frame`}
                >
                  {PREVIEW_SLOTS.map((slot, index) => (
                    <span key={index} className="collection-strip-slot" style={slot} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="collection-grid">
            {frameThemes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`collection-frame ${FOLDER_COLORS[item.id] ?? "beige"}`}
                aria-label={`Open ${item.label} frames`}
                onClick={() => setThemeId(item.id)}
              >
                <span className="folder-tab" aria-hidden="true" />

                <span className="folder-body">
                  <span
                    className="folder-preview"
                    aria-hidden="true"
                    style={
                      item.cover || item.frames[0]
                        ? { backgroundImage: `url("${item.cover ?? item.frames[0].src}")` }
                        : undefined
                    }
                  />
                  <span className="folder-handle" aria-hidden="true" />
                </span>

                <span className="folder-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="collection-bottom-nav" aria-hidden="true" />
    </section>
  );
}
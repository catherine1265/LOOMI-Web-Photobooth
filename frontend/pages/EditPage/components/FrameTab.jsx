import { useRef, useState } from "react";
import { frameThemes, validateImage } from "../editorData.js";

export default function FrameTab({ background, onSelect }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [themeId, setThemeId] = useState(null);

  const theme = frameThemes.find((item) => item.id === themeId);

  function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const problem = validateImage(file);
    setError(problem);
    if (!problem) onSelect({ src: URL.createObjectURL(file) });
  }

  return (
    <div className="edit-frames">
      {theme ? (
        <>
          <div className="edit-frames__header">
            <button
              type="button"
              className="edit-frames__back"
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
            <p className="edit-frames__title">{theme.label}</p>
          </div>

          <div className="edit-frames__box">
            {theme.frames.length === 0 && (
              <p className="edit-frames__empty">
                Add images to frontend/assets/frames/{theme.id} to show them here.
              </p>
            )}
            <div className="edit-frames__options">
              {theme.frames.map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  className="edit-frames__option"
                  aria-pressed={background?.src === frame.src}
                  aria-label={`${theme.label} ${frame.id} frame`}
                  onClick={() => onSelect(background?.src === frame.src ? null : { src: frame.src })}
                >
                  <span
                    className="edit-frames__option-image"
                    style={{ backgroundImage: `url("${frame.src}")` }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="edit-frames__grid">
          {frameThemes.map((item) => (
            <button
              key={item.id}
              type="button"
              className="edit-frames__item"
              aria-label={`${item.label} frames`}
              onClick={() => setThemeId(item.id)}
            >
              <span className="edit-frames__folder">
                <span className="edit-frames__tab" />
                <span
                  className="edit-frames__body"
                  style={
                    item.cover || item.frames[0]
                      ? { backgroundImage: `url("${item.cover ?? item.frames[0].src}")` }
                      : { backgroundColor: item.accent }
                  }
                >
                  {!item.cover && <span className="edit-frames__label">{item.label}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="edit-frames__footer">
        {error && (
          <p className="edit-tab__error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="edit-tab__upload" onClick={() => inputRef.current?.click()}>
          UPLOAD
        </button>
        <input
          ref={inputRef}
          className="edit-tab__file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          aria-label="Upload a background"
        />
      </div>
    </div>
  );
}
import { useRef, useState } from "react";
import { frames, validateImage } from "../editorData.js";

export default function FrameTab({ background, onSelect }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

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
      <div className="edit-frames__grid">
        {frames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            className="edit-frames__item"
            aria-pressed={background?.src === frame.src}
            aria-label={`${frame.id} frame`}
            onClick={() => onSelect(background?.src === frame.src ? null : { src: frame.src })}
          >
            <span className="edit-frames__strip" style={{ background: frame.accent }} />
            <span className="edit-frames__folder">
              <span className="edit-frames__tab" />
              <span
                className="edit-frames__body"
                style={{ backgroundImage: `url(${frame.src})` }}
              />
            </span>
          </button>
        ))}
      </div>

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

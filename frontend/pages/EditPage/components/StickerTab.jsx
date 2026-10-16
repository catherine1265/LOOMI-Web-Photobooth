import { useRef, useState } from "react";
import { stickers, validateImage } from "../editorData.js";

export default function StickerTab({ onAdd }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const problem = validateImage(file);
    setError(problem);
    if (!problem) onAdd(URL.createObjectURL(file));
  }

  return (
    <div className="edit-stickers">
      <div className="edit-stickers__box">
        <div className="edit-stickers__grid">
          {stickers.length === 0 && (
            <p className="edit-stickers__empty">
              Add images to frontend/assets/stickers to show them here.
            </p>
          )}
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className="edit-stickers__item"
              aria-label={`Add ${sticker.id} sticker`}
              onClick={() => onAdd(sticker.src)}
            >
              <img src={sticker.src} alt="" />
            </button>
          ))}
        </div>
      </div>

      <div className="edit-stickers__footer">
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
          aria-label="Upload a sticker"
        />
      </div>
    </div>
  );
}

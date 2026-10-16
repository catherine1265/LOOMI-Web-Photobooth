import { useRef, useState } from "react";
import "./style/UploadPhoto.css";
import Navbar from "../../../Navbar/tampilan/Navbar";
import { photoTypes } from "../FrameType/FrameType";
import { saveSoloSession } from "../../../../photoStore.js";

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to load this image."));
    reader.readAsDataURL(file);
  });
}

export default function UploadPhoto({ frameType, onBack, onContinue }) {
  const frame =
    photoTypes.find((type) => type.id === frameType) ??
    photoTypes.find((type) => type.id === "1x3");
  const slots = frame.slots;

  const inputRef = useRef(null);
  const targetRef = useRef(null);
  const [photos, setPhotos] = useState(() => Array(slots).fill(null));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filled = photos.filter(Boolean).length;

  function openPicker(slotIndex = null) {
    targetRef.current = slotIndex;
    inputRef.current?.click();
  }

  async function handleFiles(event) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;

    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Please select image files only.");
      return;
    }

    try {
      const sources = await Promise.all(files.map(readFile));
      const next = [...photos];
      const target = targetRef.current;

      if (target !== null) {
        next[target] = sources[0];
      } else {
        sources.forEach((source) => {
          const empty = next.indexOf(null);
          if (empty !== -1) next[empty] = source;
        });
      }

      setPhotos(next);
      setError(
        target === null && sources.length > slots - filled
          ? `Only ${slots} photo${slots > 1 ? "s" : ""} fit in this frame.`
          : ""
      );
    } catch (readError) {
      setError(readError.message);
    }
  }

  async function handleContinue() {
    if (filled < slots) {
      const missing = slots - filled;
      setError(`Upload ${missing} more photo${missing > 1 ? "s" : ""} to fill the frame.`);
      return;
    }

    setSaving(true);
    try {
      await saveSoloSession(frame.id, photos);
      onContinue?.();
    } catch (saveError) {
      setError(saveError.message || "Unable to save the photos.");
      setSaving(false);
    }
  }

  return (
    <main className="upload-photo-page">
      <Navbar />

      <section className="upload-photo">
        <div
          className={`upload-photo__frame upload-photo__frame--${frame.id}`}
          style={{ "--columns": frame.columns, "--rows": slots / frame.columns }}
        >
          {photos.map((photo, index) => (
            <button
              key={index}
              type="button"
              className="upload-photo__slot"
              onClick={() => openPicker(index)}
              aria-label={photo ? `Replace photo ${index + 1}` : `Upload photo ${index + 1}`}
            >
              {photo ? <img src={photo} alt={`Photo ${index + 1}`} /> : <span aria-hidden="true">+</span>}
            </button>
          ))}
        </div>

        <div className="upload-photo__actions">
          <button type="button" className="upload-photo__button" onClick={() => openPicker()}>
            Upload Photo
          </button>
          <button
            type="button"
            className="upload-photo__button upload-photo__button--primary"
            onClick={handleContinue}
            disabled={saving}
          >
            CONTINUE
          </button>
        </div>

        <input
          ref={inputRef}
          className="upload-photo__input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          aria-label="Upload photos"
        />

        {error && (
          <p className="upload-photo__error" role="alert">
            {error}
          </p>
        )}

        {onBack && (
          <button type="button" className="upload-photo__back" onClick={onBack}>
            Back
          </button>
        )}
      </section>
    </main>
  );
}

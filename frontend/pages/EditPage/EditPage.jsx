import { useEffect, useRef, useState } from "react";
import "./style/EditPage.css";
import Navbar from "../Navbar/tampilan/Navbar";
import { clearPhotoSession, usePhotoSession } from "../../photoStore.js";
import { renderStrip } from "../../renderStrip.js";

export default function EditPage({ onEmpty, onRetake }) {
  const session = usePhotoSession();
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) onEmpty();
  }, [session, onEmpty]);

  useEffect(() => {
    if (!session || !canvasRef.current) return;

    const background = getComputedStyle(pageRef.current)
      .getPropertyValue("--pt-cream")
      .trim();

    renderStrip(canvasRef.current, session.frameType, session.photos, background)
      .then(() => setError(""))
      .catch((renderError) => setError(renderError.message));
  }, [session]);

  function handleDownload() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) {
        setError("Unable to create the image.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `loomi-${session.frameType}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function handleRetake() {
    const frameType = session?.frameType;
    clearPhotoSession();
    onRetake(frameType);
  }

  if (!session) return null;

  return (
    <main className="edit-page" ref={pageRef}>
      <Navbar />

      <section className="edit-page__content">
        <div className="edit-page__preview">
          <canvas
            ref={canvasRef}
            className="edit-page__canvas"
            aria-label="Final photo strip preview"
          />
        </div>

        {error && (
          <p className="edit-page__error" role="alert">
            {error}
          </p>
        )}

        <div className="edit-page__actions">
          <button type="button" className="edit-page__button" onClick={handleRetake}>
            Retake
          </button>
          <button
            type="button"
            className="edit-page__button edit-page__button--primary"
            onClick={handleDownload}
          >
            Download
          </button>
        </div>
      </section>
    </main>
  );
}

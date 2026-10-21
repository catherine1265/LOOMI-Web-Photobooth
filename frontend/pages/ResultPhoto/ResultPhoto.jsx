import { useState } from "react";
import Navbar from "../Navbar/tampilan/Navbar";
import "./Style/ResultPhoto.css";

import {
  clearResultPhoto,
  getResultPhoto,
  hasResultPersistenceWarning,
} from "./ResultPhoto.js";

import { clearPhotoSession } from "../../photoStore.js";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m21 3-7.5 18-3.8-7.7L2 9.5 21 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.7 13.3 21 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ResultPhoto({ onGetAnother }) {
  const photo = getResultPhoto();
  const [message, setMessage] = useState("");

  function handleDownload() {
    if (!photo) return;

    const link = document.createElement("a");
    link.href = photo;
    link.download = "loomi-photo.png";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleShare() {
    if (!photo) return;

    try {
      if (!navigator.share) {
        setMessage("Browser ini belum mendukung fitur berbagi.");
        return;
      }

      const response = await fetch(photo);
      const blob = await response.blob();

      const file = new File([blob], "loomi-photo.png", {
        type: "image/png",
      });

      if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
        setMessage("Berbagi gambar tidak didukung browser ini.");
        return;
      }

      await navigator.share({
        title: "LOOMI Photo",
        files: [file],
      });

      setMessage("");
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage("Foto gagal dibagikan. Silakan unduh foto.");
      }
    }
  }

  function handleGetAnother() {
    clearResultPhoto();
    clearPhotoSession();
    onGetAnother?.();
  }

  return (
    <main className="result-photo-page">
      <Navbar />

      <section className="result-photo">
        {hasResultPersistenceWarning() && <p role="status">Storage is full. Download your photo before refreshing this page.</p>}
        {photo ? (
          <div className="result-photo__content">
            <div className="result-photo__printer">
              {/* Kepala printer: badan pil + garis slot pink */}
              <div className="result-photo__head" aria-hidden="true">
                <div className="result-photo__slot-shell" />
                <div className="result-photo__slot-bar" />
              </div>

              {/* Kertas keluar dari slot ke bawah */}
              <div className="result-photo__paper-clip">
                <div className="result-photo__paper">
                  <img
                    className="result-photo__image"
                    src={photo}
                    alt="Your finished LOOMI photo"
                  />
                </div>
              </div>
            </div>

            <div className="result-photo__actions">
              <button
                type="button"
                className="result-photo__action"
                onClick={handleDownload}
                aria-label="Download photo"
                title="Download photo"
              >
                <DownloadIcon />
              </button>

              <button
                type="button"
                className="result-photo__action"
                onClick={handleShare}
                aria-label="Share photo"
                title="Share photo"
              >
                <ShareIcon />
              </button>
            </div>

            {message && (
              <p className="result-photo__message" role="status">
                {message}
              </p>
            )}
          </div>
        ) : (
          <p className="result-photo__empty">
            No finished photo yet. Please take a photo first.
          </p>
        )}

        <button
          type="button"
          className="result-photo__again"
          onClick={handleGetAnother}
        >
          Get Another One!
        </button>
      </section>
    </main>
  );
}


import { useEffect, useRef, useState } from "react";
import "./style/SelfPhoto.css";
import Navbar from "../../../Navbar/tampilan/Navbar";

function Sparkle({ className = "" }) {
  return (
    <svg
      className={`self-photo__sparkle ${className}`}
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

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5h3l1.5-2h7l1.5 2h3A1.5 1.5 0 0 1 21.5 9v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"
        fill="currentColor"
      />
      <circle cx="12" cy="13.5" r="4" fill="#fff5cb" />
      <circle cx="12" cy="13.5" r="2.4" fill="currentColor" />
    </svg>
  );
}

function RetakeIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M13 15.5A16 16 0 1 1 9 29"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M5 7v12h12"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BlurredPlaceholder({ photo, index }) {
  return (
    <div className="self-photo__result-image">
      {photo ? (
        <img
          src={photo}
          alt={`Blurred photo result ${index + 1}`}
        />
      ) : (
        <div
          className={`self-photo__mosaic self-photo__mosaic--${index + 1}`}
          aria-label="Photo result placeholder"
          role="img"
        />
      )}

      <span className="self-photo__result-overlay" />
    </div>
  );
}

export default function SelfPhoto({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const uploadRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState("loading");
  const [cameraError, setCameraError] = useState("");
  const [photo, setPhoto] = useState(null);
  const [doneMessage, setDoneMessage] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let currentStream = null;

    async function startCamera() {
      setCameraStatus("loading");
      setCameraError("");

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access requires localhost or HTTPS."
          );
        }

        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          currentStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = currentStream;
        videoRef.current.srcObject = currentStream;
        await videoRef.current.play();

        if (!cancelled) {
          setCameraStatus("ready");
        }
      } catch (error) {
        if (cancelled) return;

        setCameraStatus("error");

        if (error.name === "NotAllowedError") {
          setCameraError(
            "Allow camera access in your browser settings, then try again."
          );
        } else if (error.name === "NotFoundError") {
          setCameraError("No camera was found on this device.");
        } else if (error.name === "NotReadableError") {
          setCameraError(
            "The camera may be in use by another application."
          );
        } else {
          setCameraError(
            error.message || "Unable to start the camera."
          );
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;

      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }

      if (streamRef.current === currentStream) {
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [retryToken]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      cameraStatus !== "ready" ||
      !video ||
      !canvas ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setCameraError("The camera is not ready yet.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture the photo.");
      return;
    }

    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setPhoto(canvas.toDataURL("image/jpeg", 0.92));
    setCameraError("");
    setDoneMessage("");
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCameraError("Please select an image file.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
        setCameraError("");
        setDoneMessage("");
      }
    };

    reader.onerror = () => {
      setCameraError("Unable to load this image.");
    };

    reader.readAsDataURL(file);
  }

  function retakePhoto() {
    setPhoto(null);
    setDoneMessage("");
    setCameraError("");

    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  }

  function retryCamera() {
    setPhoto(null);
    setCameraError("");
    setRetryToken((previous) => previous + 1);
  }

  function handleDone() {
    if (!photo) {
      setDoneMessage("Take a photo or upload one first.");
      return;
    }

    setDoneMessage(
      "Photo preview is ready. Processed photo results will be available when the backend is implemented."
    );
  }

  return (
    <main className="self-photo-page">
      <Navbar />

      <section className="self-photo-layout">
        <div className="self-photo-stage">
          {/* LEFT: CAMERA */}
          <div className="self-photo-left">
            <section className="self-photo-camera-card">
              <Sparkle className="self-photo__sparkle--camera" />

              <div className="self-photo-camera-viewport">
                <video
                  ref={videoRef}
                  className={`self-photo-video ${
                    photo ? "self-photo-video--hidden" : ""
                  }`}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera preview"
                />

                {photo && (
                  <img
                    className="self-photo-upload-preview"
                    src={photo}
                    alt="Selected photo preview"
                  />
                )}

                {cameraStatus === "loading" && !photo && (
                  <div className="self-photo-camera-message">
                    <span className="self-photo-spinner" />
                    <p>Starting camera...</p>
                  </div>
                )}

                {cameraStatus === "error" && !photo && (
                  <div className="self-photo-camera-message">
                    <p>{cameraError}</p>
                    <button
                      className="self-photo-small-button"
                      type="button"
                      onClick={retryCamera}
                    >
                      TRY AGAIN
                    </button>
                  </div>
                )}
              </div>

              <button
                className="self-photo-shutter"
                type="button"
                onClick={capturePhoto}
                disabled={cameraStatus !== "ready"}
                aria-label="Take a photo"
                title="Take a photo"
              >
                <CameraIcon />
              </button>

              <Sparkle className="self-photo__sparkle--camera-bottom" />
            </section>

            <div className="self-photo-actions">
              <button
                type="button"
                className="self-photo-action"
                onClick={capturePhoto}
                disabled={cameraStatus !== "ready"}
              >
                Take a Photo
              </button>

              <button
                type="button"
                className="self-photo-action"
                onClick={() => uploadRef.current?.click()}
              >
                Upload Photo
              </button>

              <input
                ref={uploadRef}
                className="self-photo-file-input"
                type="file"
                accept="image/*"
                onChange={handleUpload}
                aria-label="Upload a photo"
              />
            </div>

            {cameraError && cameraStatus === "ready" && (
              <p className="self-photo-error" role="alert">
                {cameraError}
              </p>
            )}
          </div>

          {/* RIGHT: PHOTO RESULTS */}
          <section
            className="self-photo-results"
            aria-label="Photo results"
          >
            <div className="self-photo-results-list">
              {[0, 1, 2].map((index) => (
                <BlurredPlaceholder
                  key={index}
                  photo={photo}
                  index={index}
                />
              ))}
            </div>

            <button
              type="button"
              className="self-photo-retake"
              onClick={retakePhoto}
              aria-label="Retake photo"
              title="Retake photo"
            >
              <RetakeIcon />
            </button>

            <button
              type="button"
              className="self-photo-done"
              onClick={handleDone}
            >
              DONE
            </button>

            {onBack && (
              <button
                type="button"
                className="self-photo-back"
                onClick={onBack}
              >
                Back
              </button>
            )}
          </section>
        </div>

        {doneMessage && (
          <p className="self-photo-done-message" role="status">
            {doneMessage}
          </p>
        )}
      </section>

      <canvas ref={canvasRef} className="self-photo-canvas" />
    </main>
  );
}

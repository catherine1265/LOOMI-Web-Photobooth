
import { useEffect, useRef, useState } from "react";
import "./style/SelfPhoto.css";
import Navbar from "../../../Navbar/tampilan/Navbar";
import { photoTypes } from "../FrameType/FrameType";
import { saveSoloSession } from "../../../../photoStore.js";
import { getSlotRatio } from "../../../../printSpec.js";
import { poses } from "./poses.js";
import PoseIdeas from "./PoseIdeas.jsx";

export function Sparkle({ className = "" }) {
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

export function CameraIcon() {
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

export function RetakeIcon() {
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

export function BlurredPlaceholder({ photo, index }) {
function BlurredPlaceholder({ photo, index, hint, onHintClick }) {
  return (
    <div className="self-photo__result-image">
      {!photo && hint ? (
        <button
          type="button"
          className="self-photo__pose-hint"
          onClick={onHintClick}
          aria-label={`Pose idea for photo ${index + 1}. Click to change the pose ideas`}
          title="Click to change the pose ideas"
        >
          <img src={hint} alt="" loading="lazy" />
          <span className="self-photo__pose-tag">Pose</span>
        </button>
      ) : photo ? (
        <img
          src={photo}
          alt={`Photo result ${index + 1}`}
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

function drawMirrored(canvas, video, area) {
  canvas.width = area.width;
  canvas.height = area.height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(
    video,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  context.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function SelfPhoto({ onBack, onDone, frameType }) {
  const frame =
    photoTypes.find((type) => type.id === frameType) ??
    photoTypes.find((type) => type.id === "1x3");
  const slots = frame.slots;
  const slotRatio = getSlotRatio(frame.id);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const uploadRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState("loading");
  const [cameraError, setCameraError] = useState("");
  const [photos, setPhotos] = useState([]);
  const [doneMessage, setDoneMessage] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [poseOpen, setPoseOpen] = useState(false);
  const [selectedPoses, setSelectedPoses] = useState([]);

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

    const { videoWidth, videoHeight } = video;
    let cropWidth = videoWidth;
    let cropHeight = videoWidth / slotRatio;

    if (cropHeight > videoHeight) {
      cropHeight = videoHeight;
      cropWidth = videoHeight * slotRatio;
    }

    const crop = {
      x: (videoWidth - cropWidth) / 2,
      y: (videoHeight - cropHeight) / 2,
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };

    const original = drawMirrored(canvas, video, {
      x: 0,
      y: 0,
      width: videoWidth,
      height: videoHeight,
    });
    const src = drawMirrored(canvas, video, crop);

    if (!src || !original) {
      setCameraError("Unable to capture the photo.");
      return;
    }

    addPhoto({ src, original });
  }

  function togglePose(source) {
    setSelectedPoses((previous) => {
      if (previous.includes(source)) return previous.filter((item) => item !== source);
      return previous.length < slots ? [...previous, source] : previous;
    });
  }

  function addPhoto(source) {
    if (photos.length >= slots) {
      setDoneMessage("The frame is full. Use retake to replace the last photo.");
      return;
    }

    setPhotos((previous) => [...previous, source].slice(0, slots));
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
        addPhoto({ src: reader.result, original: reader.result });
      }
    };

    reader.onerror = () => {
      setCameraError("Unable to load this image.");
    };

    reader.readAsDataURL(file);
  }

  function retakePhoto() {
    setPhotos((previous) => previous.slice(0, -1));
    setDoneMessage("");
    setCameraError("");

    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  }

  function retryCamera() {
    setCameraError("");
    setRetryToken((previous) => previous + 1);
  }

  async function handleDone() {
    if (photos.length < slots) {
      const missing = slots - photos.length;
      setDoneMessage(
        `Take or upload ${missing} more photo${missing > 1 ? "s" : ""} to fill the frame.`
      );
      return;
    }

    try {
      await saveSoloSession(frame.id, photos);
      onDone?.();
    } catch (error) {
      setDoneMessage(error.message || "Unable to save the photos.");
    }
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

              <div
                className="self-photo-camera-viewport"
                style={{ "--slot-ratio": slotRatio }}
              >
                <video
                  ref={videoRef}
                  className="self-photo-video"
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera preview"
                />

                {cameraStatus === "loading" && (
                  <div className="self-photo-camera-message">
                    <span className="self-photo-spinner" />
                    <p>Starting camera...</p>
                  </div>
                )}

                {cameraStatus === "error" && (
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

              <p className="self-photo-hint">Keep your face in the middle</p>

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
                onClick={() => uploadRef.current?.click()}
              >
                Upload Photo
              </button>

              <button
                type="button"
                className="self-photo-action"
                aria-pressed={poseOpen}
                disabled={poses.length === 0}
                title={poses.length === 0 ? "No pose ideas yet" : undefined}
                onClick={() => setPoseOpen((open) => !open)}
              >
                Pose Ideas
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
            className={`self-photo-results self-photo-results--${frame.id}`}
            aria-label="Photo results"
          >
            <div className="self-photo-results-list">
              <div
                className={`self-photo-frame self-photo-frame--${frame.id}`}
                style={{
                  "--columns": frame.columns,
                  "--rows": slots / frame.columns,
                }}
              >
                {Array.from({ length: slots }, (_, index) => (
                  <BlurredPlaceholder
                    key={index}
                    photo={photos[index]?.src}
                    index={index}
                    hint={selectedPoses[index]}
                    onHintClick={() => setPoseOpen(true)}
                  />
                ))}
              </div>
            </div>

            {poseOpen && (
              <PoseIdeas
                selected={selectedPoses}
                max={slots}
                onToggle={togglePose}
                onClear={() => setSelectedPoses([])}
                onClose={() => setPoseOpen(false)}
              />
            )}

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

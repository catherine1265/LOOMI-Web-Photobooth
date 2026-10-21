import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "../SelfPhoto/style/SelfPhoto.css";
import "./style/ColabRoom.css";
import Navbar from "../../../Navbar/tampilan/Navbar";
import { photoTypes } from "../FrameType/FrameType";
import { saveSoloSession } from "../../../../photoStore.js";
import { getSlotRatio } from "../../../../printSpec.js";
import { captureFrom } from "../../../../stripAssets.js";
import { createCompositor } from "../../../../compositor.js";
import { navigate } from "../../../../ui.jsx";
import { BlurredPlaceholder, CameraIcon, RetakeIcon, Sparkle } from "../SelfPhoto/SelfPhoto.jsx";
import LayerPanel from "./LayerPanel.jsx";
import RoomMessage from "./RoomMessage.jsx";

const FRAME_INTERVAL_MS = 1000 / 30;

const CONNECTION_STATUS = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
};

function PreviewCanvas({ client, stack, canvasRef }) {
  const stackRef = useRef(stack);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const compositor = createCompositor();
    let raf = 0;
    let last = 0;
    const loop = (time) => {
      raf = requestAnimationFrame(loop);
      if (time - last < FRAME_INTERVAL_MS) return;
      last = time;
      const layers = stackRef.current.map((entry) => ({
        identity: entry.identity,
        name: entry.name,
        video: entry.absentSince === undefined ? client.getVideoElement(entry.identity) : null,
      }));
      compositor.render(layers, canvas);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      compositor.dispose();
    };
  }, [client, canvasRef]);

  const description =
    stack.length === 0
      ? "Combined preview, waiting for participants."
      : `Combined preview. Background: ${stack[stack.length - 1].name}. Top layer: ${stack[0].name}.`;

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      role="img"
      aria-label={description}
      className="colab-room-canvas"
    />
  );
}

function CodeCopy({ code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button type="button" className="colab-room-chip colab-room-chip--button" onClick={copy}>
      <span aria-live="polite">{copied ? "Copied!" : "Copy code"}</span>
    </button>
  );
}

export default function ColabRoom({ client, frameType, onDone }) {
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const { session } = client;
  const state = snap.state;
  const stack = state?.stack ?? [];
  const isHost = state?.hostIdentity === session.identity;

  const frame =
    photoTypes.find((type) => type.id === frameType) ??
    photoTypes.find((type) => type.id === "1x3");
  const slots = frame.slots;
  const slotRatio = getSlotRatio(frame.id);

  const canvasRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function leave() {
    setLeaving(true);
    await client.leave();
    navigate("/");
  }

  function addPhoto(source) {
    if (photos.length >= slots) {
      setMessage("The frame is full. Use retake to replace the last photo.");
      return;
    }

    setPhotos((previous) => [...previous, source].slice(0, slots));
    setMessage("");
  }

  function capturePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || stack.length === 0) {
      setMessage("Waiting for participants to turn on their cameras.");
      return;
    }

    addPhoto(captureFrom(canvas, canvas.width, canvas.height, slotRatio).src);
  }

  function retakePhoto() {
    setPhotos((previous) => previous.slice(0, -1));
    setMessage("");
  }

  async function handleDone() {
    if (photos.length < slots) {
      const missing = slots - photos.length;
      setMessage(`Take ${missing} more photo${missing > 1 ? "s" : ""} to fill the frame.`);
      return;
    }

    try {
      await saveSoloSession(frame.id, photos);
      onDone?.();
    } catch (error) {
      setMessage(error.message || "Unable to save the photos.");
    }
  }

  if (snap.ended) {
    return (
      <RoomMessage>
        <p className="colab-room-message__title">This meeting has ended.</p>
        <button type="button" className="colab-room-message__button" onClick={() => navigate("/")}>
          Back to home
        </button>
      </RoomMessage>
    );
  }

  return (
    <main className="self-photo-page colab-room-page">
      <Navbar />

      <section className="self-photo-layout">
        <div className="colab-room-bar">
          <span className="colab-room-chip">
            Meeting code <strong className="colab-room-code">{session.code}</strong>
          </span>
          <CodeCopy code={session.code} />
          <span role="status" className="colab-room-chip">
            <span className={`colab-room-dot colab-room-dot--${snap.connection}`} aria-hidden="true" />
            {CONNECTION_STATUS[snap.connection]}
          </span>
          {isHost && <span className="colab-room-chip colab-room-chip--host">You are the host</span>}
          {snap.notice && (
            <span role="status" className="colab-room-notice">
              {snap.notice}
            </span>
          )}
          <button
            type="button"
            className="colab-room-chip colab-room-chip--button colab-room-chip--danger colab-room-bar__push"
            onClick={leave}
            disabled={leaving}
          >
            {leaving ? "Leaving…" : "Leave"}
          </button>
        </div>

        <div className="self-photo-stage colab-room-stage">
          {state ? (
            <LayerPanel
              stack={stack}
              hostIdentity={state.hostIdentity}
              localIdentity={session.identity}
              onReorder={(order) => client.reorder(order)}
              onTransferHost={(identity) => client.transferHost(identity)}
              onError={setToast}
            />
          ) : (
            <aside className="colab-layers">
              <p className="colab-layers__hint">Loading layers…</p>
            </aside>
          )}

          <div className="self-photo-left">
            <section className="self-photo-camera-card">
              <Sparkle className="self-photo__sparkle--camera" />

              <div className="self-photo-camera-viewport" style={{ "--slot-ratio": slotRatio }}>
                <PreviewCanvas client={client} stack={stack} canvasRef={canvasRef} />

                {stack.length === 0 && (
                  <div className="self-photo-camera-message">
                    <span className="self-photo-spinner" />
                    <p>Waiting for participants…</p>
                  </div>
                )}
              </div>

              <p className="self-photo-hint">Keep your face in the middle</p>

              <button
                className="self-photo-shutter"
                type="button"
                onClick={capturePhoto}
                disabled={stack.length === 0}
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
                disabled={stack.length === 0}
              >
                Take a Photo
              </button>

              <button
                type="button"
                className="self-photo-action"
                aria-pressed={!snap.cameraOn}
                onClick={() => client.setCameraEnabled(!snap.cameraOn)}
              >
                {snap.cameraOn ? "Camera off" : "Camera on"}
              </button>
            </div>
          </div>

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
                    photo={photos[index]}
                    index={index}
                  />
                ))}
              </div>
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

            <button type="button" className="self-photo-done" onClick={handleDone}>
              DONE
            </button>
          </section>
        </div>

        {message && (
          <p className="self-photo-done-message" role="status">
            {message}
          </p>
        )}
      </section>

      <div aria-live="assertive" className="colab-room-toast-area">
        {toast && (
          <p role="alert" className="colab-room-toast">
            {toast}
          </p>
        )}
      </div>
    </main>
  );
}

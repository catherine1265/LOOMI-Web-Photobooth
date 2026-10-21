import { useEffect, useRef, useState } from "react";
import { CAPTURE_LAYOUTS, CAPTURE_LATE_MS } from "../lib/capture.js";
import { getPhotoSession, setPhotoSession } from "./photoStore.js";
import { getSlotRects, printSpec } from "./printSpec.js";
import { buildPhotoCanvas, loadImage } from "./stripAssets.js";
import "./captureBooth.css";

function readDraft(code) {
  const draft = getPhotoSession();
  return draft?.source === "collab" && draft.roomCode === code && Object.hasOwn(CAPTURE_LAYOUTS, draft.frameType) ? draft : null;
}

export default function CaptureBooth({ client, snap, initialFrameType, canvasRef, captureFrameRef, onEdit, children }) {
  const [draft] = useState(() => readDraft(client.session.code));
  const [frameType, setFrameType] = useState(draft?.frameType || (Object.hasOwn(CAPTURE_LAYOUTS, initialFrameType) ? initialFrameType : "1x3"));
  const [photos, setPhotos] = useState(draft?.photos || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [flash, setFlash] = useState(false);
  const photosRef = useRef(photos);
  const layoutRef = useRef(frameType);
  const sequence = useRef([]);
  const handled = useRef(new Set());
  const cancelled = useRef(new Set());
  const pending = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const actions = useRef(null);
  const capture = snap.state?.capture;
  const isHost = snap.state?.hostIdentity === client.session.identity;
  const remaining = capture?.status === "countdown" ? capture.captureAt - clock - (client.clockOffset || 0) : 0;
  const counting = capture?.status === "countdown" && remaining > -CAPTURE_LATE_MS && !cancelled.current.has(capture.id);
  const locked = busy || counting;
  const slots = CAPTURE_LAYOUTS[frameType];
  const full = photos.length === slots && Array.from({ length: slots }, (_, i) => photos.some((p) => p.slotIndex === i)).every(Boolean);
  const ready = isHost && snap.connection === "connected" && snap.cameraOn && snap.state?.stack.length > 0;

  function persist(nextPhotos, layout = layoutRef.current) {
    photosRef.current = nextPhotos;
    setPhotos(nextPhotos);
    const saved = setPhotoSession({ source: "collab", roomCode: client.session.code, frameType: layout, photos: nextPhotos });
    setStorageWarning(saved ? "" : "Storage is full. Keep this tab open and download your photos before refreshing.");
  }

  function sessionReady() {
    const snapshot = client.getSnapshot();
    return snapshot.connection === "connected" && snapshot.cameraOn &&
      snapshot.state?.hostIdentity === client.session.identity;
  }

  function cameraReady() {
    return sessionReady() && client.getVideoElement(client.session.identity)?.readyState >= 2;
  }

  async function start(slotIndex) {
    if (pending.current) return;
    if (!cameraReady()) {
      sequence.current = [];
      setError("Wait for your camera and connection to be ready before taking photos.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await client.capture({ action: "start", frameType: layoutRef.current, slotIndex });
      if (!result.ok) { sequence.current = []; if (mounted.current) setError(result.message); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function cancel() {
    generation.current++;
    sequence.current = [];
    const current = client.getSnapshot().state?.capture;
    if (!current || current.status !== "countdown") return;
    cancelled.current.add(current.id);
    setBusy(true);
    const result = await client.capture({ action: "cancel", captureId: current.id });
    if (mounted.current) {
      setBusy(false);
      if (!result.ok) setError(result.message);
    }
  }

  async function take(current) {
    if (pending.current || handled.current.has(current.id) || cancelled.current.has(current.id)) return;
    handled.current.add(current.id);
    const attempt = generation.current;
    const lateBy = Date.now() + (client.clockOffset || 0) - current.captureAt;
    if (!cameraReady() || lateBy > CAPTURE_LATE_MS || !canvasRef.current) {
      sequence.current = [];
      setError(!sessionReady() ? "The host camera or connection changed. Reconnect and retake this photo."
        : !canvasRef.current ? "The photo preview is not ready yet. Wait for it to appear, then retry."
          : !cameraReady() ? "The host camera has no readable video frame. Turn the camera off and on, then retry."
            : "The browser missed the countdown deadline. Return to the host window and retake this photo.");
      await cancel();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      // A hidden browser can pause requestAnimationFrame. Render explicitly so
      // switching between the host and guest windows cannot save an old preview.
      captureFrameRef?.current?.();
      // The countdown is a DOM overlay, so it is never included in this snapshot.
      const src = canvasRef.current.toDataURL("image/jpeg", 0.92);
      const capturedAt = Date.now() + (client.clockOffset || 0);
      if (capturedAt - current.captureAt > CAPTURE_LATE_MS) {
        throw new Error("Rendering the combined photo took too long. Return to the host window and retake this photo.");
      }
      const result = await client.capture({ action: "complete", captureId: current.id, capturedAt });
      if (!mounted.current || generation.current !== attempt) return;
      if (!result.ok || client.getSnapshot().state?.capture?.id !== current.id || client.getSnapshot().state?.capture?.status !== "done") {
        throw new Error(result.message || "Capture was cancelled. Please retake the photo.");
      }
      layoutRef.current = current.frameType;
      setFrameType(current.frameType);
      persist([...photosRef.current.filter((photo) => photo.slotIndex !== current.slotIndex),
        { slotIndex: current.slotIndex, src }].sort((a, b) => a.slotIndex - b.slotIndex));
      setFlash(true);
    } catch (captureError) {
      sequence.current = [];
      if (mounted.current) setError(captureError.message || "Unable to capture this photo. Please try again.");
      await client.capture({ action: "cancel", captureId: current.id });
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
    if (mounted.current && generation.current === attempt && sequence.current.length) {
      await start(sequence.current.shift());
    }
  }
  actions.current = { take, cancel };

  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => {
      const current = client.getSnapshot().state?.capture;
      if (current?.status !== "countdown") return;
      setClock(Date.now());
      if (current.owner !== client.session.identity || cancelled.current.has(current.id)) return;
      if (!sessionReady()) {
        if (!handled.current.has(current.id)) {
          handled.current.add(current.id);
          const snapshot = client.getSnapshot();
          setError(snapshot.connection !== "connected" ? "Capture cancelled because the host lost the meeting connection. Reconnect and retake the photo."
            : !snapshot.cameraOn ? "Capture cancelled because the host camera was turned off. Turn it on and retake the photo."
              : "Capture cancelled because the host changed. The new host can start another capture.");
          void actions.current.cancel();
        }
      } else if (Date.now() + (client.clockOffset || 0) >= current.captureAt) {
        void actions.current.take(current);
      }
    }, 50);
    return () => {
      mounted.current = false;
      generation.current++;
      sequence.current = [];
      clearInterval(timer);
    };
  }, [client]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 180);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!isHost || capture?.status === "cancelled") sequence.current = [];
  }, [isHost, capture?.status]);

  function beginSequence() {
    if (pending.current || locked) return;
    sequence.current = Array.from({ length: slots }, (_, i) => i).filter((i) => !photosRef.current.some((photo) => photo.slotIndex === i));
    const first = sequence.current.shift();
    if (first !== undefined) void start(first);
  }

  function changeLayout(value) {
    layoutRef.current = value;
    setFrameType(value);
    persist([], value);
  }

  async function downloadStrip() {
    if (!full || locked) return;
    setBusy(true);
    setError("");
    try {
      const spec = printSpec[frameType];
      const rects = getSlotRects(spec);
      const canvas = document.createElement("canvas");
      canvas.width = spec.width;
      canvas.height = spec.height;
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff5cb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const images = await Promise.all(photos.map((photo) => loadImage(photo.src)));
      photos.forEach((photo, index) => {
        const rect = rects[photo.slotIndex];
        const image = buildPhotoCanvas(images[index], rect.width, rect.height, "none", "contain");
        context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Unable to generate the photo strip.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `loomi-${client.session.code}-${frameType}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) { setError(downloadError.message); }
    finally { if (mounted.current) setBusy(false); }
  }

  const spec = printSpec[frameType];
  return (
    <div className="capture-booth">
      <div className="capture-booth__preview">
        {children}
        {counting && <div className="capture-booth__countdown" role="status" aria-live="polite">
          <span>Photo {capture.slotIndex + 1} of {CAPTURE_LAYOUTS[capture.frameType]}</span>
          <strong>{remaining > 0 ? Math.ceil(remaining / 1000) : "Smile!"}</strong>
        </div>}
        {flash && <div className="capture-booth__flash" aria-hidden="true" />}
      </div>
      {isHost ? <>
        <div className="capture-booth__controls">
          <label>Photo layout <select value={frameType} disabled={locked || photos.length > 0} onChange={(e) => changeLayout(e.target.value)}>
            {Object.keys(CAPTURE_LAYOUTS).map((layout) => <option key={layout} value={layout}>{layout}</option>)}
          </select></label>
          <button type="button" className="capture-booth__primary" disabled={!ready || locked || full} onClick={beginSequence}>
            {busy ? "Please wait…" : counting ? "Taking photos…" : photos.length ? "Continue capture" : "Take photos"}
          </button>
          {counting && <button type="button" onClick={() => void cancel()} disabled={busy}>Cancel countdown</button>}
          {photos.length > 0 && <button type="button" disabled={locked} onClick={() => persist([])}>Start over</button>}
        </div>
        <p className="capture-booth__hint">{photos.length} of {slots} photos ready. Each photo has a 3-second countdown. The host saves the combined result.</p>
        {!snap.cameraOn && <p role="status">Turn on your camera to take photos.</p>}
      </> : <p className="capture-booth__hint">The host controls capture. Get ready when the countdown appears! Photos are saved on the host’s device.</p>}
      {error && <p className="capture-booth__error" role="alert">{error}</p>}
      {storageWarning && <p className="capture-booth__error" role="status">{storageWarning}</p>}
      {photos.length > 0 && <section className="capture-booth__review" aria-label="Captured photo strip">
        <div className="capture-booth__strip" style={{ aspectRatio: `${spec.width} / ${spec.height}` }}>
          {getSlotRects(spec).map((rect, index) => {
            const photo = photos.find((p) => p.slotIndex === index);
            return <button key={index} type="button" disabled={!isHost || locked || !ready}
              onClick={() => { sequence.current = []; void start(index); }}
              aria-label={photo ? `Retake photo ${index + 1}` : `Take photo ${index + 1}`}
              className="capture-booth__slot" style={{ left: `${rect.x / spec.width * 100}%`, top: `${rect.y / spec.height * 100}%`, width: `${rect.width / spec.width * 100}%`, height: `${rect.height / spec.height * 100}%` }}>
              {photo ? <img src={photo.src} alt={`Combined photo ${index + 1}`} /> : <span>Photo {index + 1}</span>}
            </button>;
          })}
        </div>
        <div className="capture-booth__review-actions">
          <p>Select a photo to retake that slot.</p>
          <button type="button" disabled={!full || locked} onClick={() => void downloadStrip()}>Download strip</button>
          <button type="button" className="capture-booth__primary" disabled={!full || locked} onClick={() => { persist(photos); onEdit(); }}>Continue to edit</button>
        </div>
      </section>}
    </div>
  );
}

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "loomi.photoSession";
const JPEG_QUALITY = 0.92;
const MAX_SIDE = 1600;

function load() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let session = load();
const listeners = new Set();

function persist() {
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function emit() {
  persist();
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPhotoSession() {
  return session;
}

export function setPhotoSession(next) {
  session = next;
  emit();
}

export function clearPhotoSession() {
  session = null;
  emit();
}

export function usePhotoSession() {
  return useSyncExternalStore(subscribe, getPhotoSession);
}

function toJpeg(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * ratio);
      canvas.height = Math.round(image.naturalHeight * ratio);
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    image.onerror = () => reject(new Error("Unable to read a photo."));
    image.src = src;
  });
}

export async function saveSoloSession(frameType, sources) {
  const photos = await Promise.all(
    sources.map(async (source, slotIndex) => ({
      slotIndex,
      src: await toJpeg(source),
    }))
  );

  setPhotoSession({ source: "solo", frameType, photos });
}

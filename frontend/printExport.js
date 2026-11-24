import { PRINT_DPI, SHEET_SIZE, STRIP_FRAME_IDS, STRIP_SIZE } from "./printSpec.js";
import { setPngDpi } from "./pngDpi.js";
import { loadImage } from "./stripAssets.js";

const CUT_LINE_COLOR = "#9b9b9b";
const CUT_LINE_DASH = [14, 10];

export function isStripFrame(frameId) {
  return STRIP_FRAME_IDS.includes(frameId);
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Unable to create the PNG."));
        return;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      resolve(new Blob([setPngDpi(bytes, PRINT_DPI)], { type: "image/png" }));
    }, "image/png");
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the PNG."));
    reader.readAsDataURL(blob);
  });
}

// Dev only: log the size and, when `expected` is given, fail loudly on a mismatch.
function checkSize(label, width, height, expected) {
  if (!import.meta.env.DEV) return;
  console.log(`[print] ${label}: ${width} x ${height}px`);
  if (expected && (width !== expected.width || height !== expected.height)) {
    throw new Error(`[print] ${label} is ${width} x ${height}px, expected ${expected.width} x ${expected.height}px`);
  }
}

export async function logExportSize(label, src) {
  if (!import.meta.env.DEV) return;
  const image = await loadImage(src);
  checkSize(label, image.naturalWidth, image.naturalHeight);
}

/** Konva stage canvas -> PNG data URL of exactly STRIP_SIZE with 300 DPI. */
export async function exportStripPng(stageCanvas, frameId) {
  const canvas = document.createElement("canvas");
  canvas.width = STRIP_SIZE.width;
  canvas.height = STRIP_SIZE.height;
  canvas.getContext("2d").drawImage(stageCanvas, 0, 0, canvas.width, canvas.height);

  const blob = await canvasToPng(canvas);
  const image = await loadImage(await blobToDataUrl(blob));
  checkSize(frameId, image.naturalWidth, image.naturalHeight, STRIP_SIZE);
  return blobToDataUrl(blob);
}

/** Two copies of the strip on one 4R sheet (PNG Blob, 300 DPI) with a dashed cut line between them. */
export async function buildPrintSheet(stripSrc) {
  const strip = await loadImage(stripSrc);
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_SIZE.width;
  canvas.height = SHEET_SIZE.height;
  const context = canvas.getContext("2d");

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(strip, 0, 0, STRIP_SIZE.width, STRIP_SIZE.height);
  context.drawImage(strip, SHEET_SIZE.width - STRIP_SIZE.width, 0, STRIP_SIZE.width, STRIP_SIZE.height);

  context.strokeStyle = CUT_LINE_COLOR;
  context.lineWidth = 1;
  context.setLineDash(CUT_LINE_DASH);
  context.beginPath();
  context.moveTo(STRIP_SIZE.width + 0.5, 0);
  context.lineTo(STRIP_SIZE.width + 0.5, canvas.height);
  context.stroke();

  const blob = await canvasToPng(canvas);
  const image = await loadImage(await blobToDataUrl(blob));
  checkSize("print sheet", image.naturalWidth, image.naturalHeight, SHEET_SIZE);
  return blob;
}

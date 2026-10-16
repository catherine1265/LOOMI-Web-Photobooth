import { getSlotRects, printSpec } from "./printSpec.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load a photo."));
    image.src = src;
  });
}

function drawCover(context, image, rect) {
  const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
  const sourceWidth = rect.width / scale;
  const sourceHeight = rect.height / scale;

  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    rect.x,
    rect.y,
    rect.width,
    rect.height
  );
}

export async function renderStrip(canvas, frameType, photos, background) {
  const spec = printSpec[frameType];
  if (!spec) throw new Error(`Unknown frame type: ${frameType}`);

  canvas.width = spec.width;
  canvas.height = spec.height;

  const context = canvas.getContext("2d");
  context.fillStyle = background;
  context.fillRect(0, 0, spec.width, spec.height);

  const rects = getSlotRects(spec);
  const images = await Promise.all(photos.map((photo) => loadImage(photo.src)));

  photos.forEach((photo, index) => {
    const rect = rects[photo.slotIndex];
    if (rect) drawCover(context, images[index], rect);
  });
}

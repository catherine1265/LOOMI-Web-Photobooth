const imageCache = new Map();

export function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          imageCache.delete(src);
          reject(new Error("Unable to load an image."));
        };
        image.src = src;
      })
    );
  }
  return imageCache.get(src);
}

export function readTheme(element) {
  const style = getComputedStyle(element);
  return {
    background: style.getPropertyValue("--pt-cream").trim(),
    ink: style.getPropertyValue("--pt-burgundy").trim(),
  };
}

export function toRgba(value, alpha = 1) {
  if (alpha >= 1) return value;
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function coverCrop(image, width, height, alignY = 0.5) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;

  return {
    x: (image.naturalWidth - cropWidth) / 2,
    y: (image.naturalHeight - cropHeight) * alignY,
    width: cropWidth,
    height: cropHeight,
  };
}

export function buildPhotoCanvas(image, width, height, filter, fit = "cover") {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);

  const context = canvas.getContext("2d");
  const crop = coverCrop(image, canvas.width, canvas.height);
  const radius = Math.min(canvas.width, canvas.height) * 0.08;

  context.beginPath();
  if (context.roundRect) context.roundRect(0, 0, canvas.width, canvas.height, radius);
  else context.rect(0, 0, canvas.width, canvas.height);
  context.clip();

  context.save();
  context.filter = filter;
  if (fit === "contain") {
    const ratio = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const drawnWidth = image.naturalWidth * ratio;
    const drawnHeight = image.naturalHeight * ratio;
    context.drawImage(image, (canvas.width - drawnWidth) / 2, (canvas.height - drawnHeight) / 2, drawnWidth, drawnHeight);
    context.restore();
    return canvas;
  }
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  context.restore();

  return canvas;
}

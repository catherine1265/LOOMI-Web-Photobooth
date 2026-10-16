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

export function buildPhotoCanvas(image, width, height, filter) {
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

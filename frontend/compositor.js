// Runs entirely in the browser: background removal (MediaPipe) and drawing the
// combined photobooth picture onto a <canvas>.

// ---- Background removal (MediaPipe) ---------------------------------------------------

// Keep in sync with the @mediapipe/tasks-vision version in package.json.
const MEDIAPIPE_VERSION = "1.0.1";
const MEDIAPIPE_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

// Loads the selfie segmenter and returns person masks (confidence 0..1 per pixel).
function createMaskProvider() {
  let status = "loading";
  let segmenter = null;
  let disposed = false;

  (async () => {
    try {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      const create = (delegate) =>
        ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: SEGMENTER_MODEL, delegate },
          runningMode: "IMAGE",
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
      let created;
      try {
        created = await create("GPU");
      } catch {
        created = await create("CPU");
      }
      if (disposed) {
        created.close();
        return;
      }
      segmenter = created;
      status = "ready";
    } catch (err) {
      console.warn("[segmentation] background removal unavailable", err);
      status = "failed";
    }
  })();

  return {
    get status() {
      return status;
    },
    segment(frame) {
      if (!segmenter) return null;
      let mask = null;
      segmenter.segment(frame, (result) => {
        const masks = result.confidenceMasks;
        if (!masks || masks.length === 0) return;
        // selfie_segmenter returns one mask (person); other models return [background, person].
        const person = masks.length > 1 ? masks[1] : masks[0];
        // The mask memory is only valid inside this callback, so copy it.
        mask = { data: person.getAsFloat32Array().slice(), width: person.width, height: person.height };
      });
      return mask;
    },
    dispose() {
      disposed = true;
      segmenter?.close();
      segmenter = null;
    },
  };
}

// ---- Canvas drawing ------------------------------------------------------------------

// FNV-1a hash, so the same participant gets the same color in every browser.
function hueFor(identity) {
  let h = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    h ^= identity.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function colorFor(identity, lightness = 55) {
  return `hsl(${hueFor(identity)} 65% ${lightness}%)`;
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function hasFrame(video) {
  return !!video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

function drawCover(ctx, source, srcW, srcH, x, y, w, h) {
  const scale = Math.max(w / srcW, h / srcH);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(source, (srcW - sw) / 2, (srcH - sh) / 2, sw, sh, x, y, w, h);
}

function drawVideoCover(ctx, video, x, y, w, h) {
  drawCover(ctx, video, video.videoWidth, video.videoHeight, x, y, w, h);
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPlaceholder(ctx, layer, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, colorFor(layer.identity, 45));
  g.addColorStop(1, colorFor(layer.identity, 30));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(h * 0.28)}px system-ui, sans-serif`;
  ctx.fillText(initials(layer.name), x + w / 2, y + h / 2);
}

function drawLabel(ctx, text, anchorX, y, size, align = "left") {
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const padX = size * 0.5;
  const w = ctx.measureText(text).width + padX * 2;
  const h = size * 1.6;
  const x = align === "right" ? anchorX - w : anchorX;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + padX, y + h / 2);
}

function drawWaiting(ctx, W, H) {
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.round(H * 0.045)}px system-ui, sans-serif`;
  ctx.fillText("Waiting for participants…", W / 2, H / 2);
}

// ---- Compositor --------------------------------------------------------------------

const SEGMENT_SIZE = 256;
const SEGMENT_FPS = 15;
const MAX_SEGMENTS_PER_FRAME = 2;
const MAX_CUTOUT_SIDE = 1280;
const MASK_SMOOTHING = 0.6;
const EDGE_LOW = 0.3;
const EDGE_HIGH = 0.7;

function smoothstep(v) {
  const t = Math.min(Math.max((v - EDGE_LOW) / (EDGE_HIGH - EDGE_LOW), 0), 1);
  return t * t * (3 - 2 * t);
}

const newCanvas = () => document.createElement("canvas");

// Bottom layer: the full camera frame (background kept).
// Every other layer: full screen, person only (background removed), drawn bottom to top.
export function createCompositor() {
  const masks = createMaskProvider();
  const fallback = createTileCompositor();
  const cuts = new Map();

  function cutFor(identity) {
    let cut = cuts.get(identity);
    if (!cut) {
      cut = { small: newCanvas(), mask: newCanvas(), maskPixels: null, blended: null, cutout: newCanvas(), lastSegmentAt: -Infinity, hasMask: false };
      cuts.set(identity, cut);
    }
    return cut;
  }

  function updateMask(cut, mask) {
    const n = mask.width * mask.height;
    if (!cut.blended || cut.blended.length !== n) {
      cut.blended = mask.data.slice();
      cut.mask.width = mask.width;
      cut.mask.height = mask.height;
      cut.maskPixels = new ImageData(mask.width, mask.height);
    } else {
      for (let i = 0; i < n; i++) cut.blended[i] = cut.blended[i] * (1 - MASK_SMOOTHING) + mask.data[i] * MASK_SMOOTHING;
    }
    const px = cut.maskPixels.data;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      px[o] = px[o + 1] = px[o + 2] = 255;
      px[o + 3] = Math.round(smoothstep(cut.blended[i]) * 255);
    }
    cut.mask.getContext("2d").putImageData(cut.maskPixels, 0, 0);
    cut.hasMask = true;
  }

  // Segments a small copy of the frame, then applies the scaled-up mask to the full-res video.
  function cutout(identity, video, now, mayRefresh) {
    const cut = cutFor(identity);
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let refreshed = false;
    if (mayRefresh && now - cut.lastSegmentAt >= 1000 / SEGMENT_FPS) {
      cut.lastSegmentAt = now;
      refreshed = true;
      const scale = SEGMENT_SIZE / Math.max(vw, vh);
      const sw = Math.max(1, Math.round(vw * scale));
      const sh = Math.max(1, Math.round(vh * scale));
      if (cut.small.width !== sw || cut.small.height !== sh) {
        cut.small.width = sw;
        cut.small.height = sh;
        cut.blended = null;
      }
      cut.small.getContext("2d").drawImage(video, 0, 0, sw, sh);
      try {
        const mask = masks.segment(cut.small);
        if (mask) updateMask(cut, mask);
      } catch (err) {
        console.warn("[segmentation] frame skipped", err);
      }
    }
    if (!cut.hasMask) return { canvas: null, refreshed };

    const scale = Math.min(1, MAX_CUTOUT_SIDE / Math.max(vw, vh));
    const cw = Math.round(vw * scale);
    const ch = Math.round(vh * scale);
    if (cut.cutout.width !== cw || cut.cutout.height !== ch) {
      cut.cutout.width = cw;
      cut.cutout.height = ch;
    }
    const ctx = cut.cutout.getContext("2d");
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(video, 0, 0, cw, ch);
    ctx.globalCompositeOperation = "destination-in";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cut.mask, 0, 0, cw, ch);
    ctx.globalCompositeOperation = "source-over";
    return { canvas: cut.cutout, refreshed };
  }

  return {
    render(layers, target) {
      if (masks.status !== "ready") {
        fallback.render(layers, target);
        if (layers.length > 1) {
          const ctx = target.getContext("2d");
          const size = Math.max(12, Math.round(target.height * 0.03));
          const text = masks.status === "loading" ? "Loading background removal…" : "Background removal unavailable";
          drawLabel(ctx, text, target.width - size, size, size, "right");
        }
        return;
      }

      const ctx = target.getContext("2d");
      const W = target.width;
      const H = target.height;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);
      if (layers.length === 0) {
        drawWaiting(ctx, W, H);
        return;
      }

      const background = layers[layers.length - 1];
      if (hasFrame(background.video)) drawVideoCover(ctx, background.video, 0, 0, W, H);
      else drawPlaceholder(ctx, background, 0, 0, W, H);

      const now = performance.now();
      const noCamera = [];
      let segmented = 0;
      for (let i = layers.length - 2; i >= 0; i--) {
        const layer = layers[i];
        if (!hasFrame(layer.video)) {
          noCamera.push(layer.name);
          continue;
        }
        const { canvas, refreshed } = cutout(layer.identity, layer.video, now, segmented < MAX_SEGMENTS_PER_FRAME);
        if (refreshed) segmented++;
        if (canvas) drawCover(ctx, canvas, canvas.width, canvas.height, 0, 0, W, H);
      }

      const ids = new Set(layers.map((l) => l.identity));
      for (const id of cuts.keys()) if (!ids.has(id)) cuts.delete(id);

      const size = Math.max(12, Math.round(H * 0.03));
      drawLabel(ctx, `Background: ${background.name}`, size, size, size);
      if (noCamera.length) drawLabel(ctx, `Camera off: ${noCamera.reverse().join(", ")}`, size, H - size * 2.6, size);
    },
    dispose() {
      masks.dispose();
      cuts.clear();
    },
  };
}

// Shown while the segmentation model loads (or if it cannot run): background full frame, others as tiles.
function createTileCompositor() {
  return {
    render(layers, canvas) {
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);
      if (layers.length === 0) {
        drawWaiting(ctx, W, H);
        return;
      }

      const background = layers[layers.length - 1];
      if (hasFrame(background.video)) drawVideoCover(ctx, background.video, 0, 0, W, H);
      else drawPlaceholder(ctx, background, 0, 0, W, H);
      const labelSize = Math.max(12, Math.round(H * 0.03));
      drawLabel(ctx, `Background: ${background.name}`, labelSize, labelSize, labelSize);

      const tiles = layers.slice(0, -1);
      if (tiles.length === 0) return;
      const margin = W * 0.03;
      const overlap = 0.18;
      const fitW = (W - margin * 2) / (1 + (tiles.length - 1) * (1 - overlap));
      const tileW = Math.min(W * 0.24, fitW);
      const tileH = tileW * 0.75;
      const step = tileW * (1 - overlap);
      const x0 = (W - (tileW + step * (tiles.length - 1))) / 2;
      const y = H - tileH - margin;
      const radius = tileW * 0.08;

      for (let i = tiles.length - 1; i >= 0; i--) {
        const layer = tiles[i];
        const x = x0 + i * step;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = tileW * 0.06;
        roundedRect(ctx, x, y, tileW, tileH, radius);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.restore();

        ctx.save();
        roundedRect(ctx, x, y, tileW, tileH, radius);
        ctx.clip();
        if (hasFrame(layer.video)) drawVideoCover(ctx, layer.video, x, y, tileW, tileH);
        else drawPlaceholder(ctx, layer, x, y, tileW, tileH);
        ctx.restore();

        ctx.lineWidth = Math.max(2, tileW * 0.012);
        ctx.strokeStyle = i === 0 ? "#fbbf24" : "rgba(255,255,255,0.85)";
        roundedRect(ctx, x, y, tileW, tileH, radius);
        ctx.stroke();

        const size = Math.max(11, Math.round(tileH * 0.1));
        drawLabel(ctx, layer.name, x + tileW - size * 0.6, y + tileH - size * 2.2, size, "right");
      }
    },
  };
}

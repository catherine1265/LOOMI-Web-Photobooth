import { WATERMARK_MIN_BOTTOM_HEIGHT_RATIO, getWatermarkBottomNeed } from "./config/watermark.js";

export const PRINT_DPI = 300;
const mmToPx = (mm) => Math.round((mm / 25.4) * PRINT_DPI);

// 4R = 102 x 152 mm; a strip is half of it (51 x 152 mm).
export const STRIP_SIZE = { width: mmToPx(51), height: mmToPx(152) };
export const SHEET_SIZE = { width: mmToPx(102), height: mmToPx(152) };
export const STRIP_FRAME_IDS = ["1x2", "1x3", "1x4"];

const STRIP_PAD_X = 48;
const STRIP_PAD_Y = 90;
const STRIP_GAP = 48;

// 2x2 = full 4R: NOT exact (currently 1200 x 1800, 4R is 1205 x 1795), prints OK with Scale to Fit
const GRID = { width: 1200, card: { width: 200, height: 300 } };
const POLAROID = { width: 1039, card: { width: 138, height: 190 } };

function build(base, columns, rows, cardGap, cardPad) {
  const k = base.width / base.card.width;
  const height = Math.round(base.card.height * k);
  const watermarkBottom = Math.ceil(
    Math.max(height * WATERMARK_MIN_BOTTOM_HEIGHT_RATIO, getWatermarkBottomNeed(base.width))
  );

  return {
    width: base.width,
    height,
    columns,
    rows,
    gap: Math.round(cardGap * k),
    pad: {
      left: Math.round(cardPad.left * k),
      right: Math.round(cardPad.right * k),
      top: Math.round(cardPad.top * k),
      bottom: Math.max(Math.round(cardPad.bottom * k), watermarkBottom),
    },
  };
}

// All strips share the outer size, padding and bottom (watermark) area; only the slot count differs.
function buildStrip(rows) {
  const { width, height } = STRIP_SIZE;
  const watermarkBottom = Math.ceil(
    Math.max(height * WATERMARK_MIN_BOTTOM_HEIGHT_RATIO, getWatermarkBottomNeed(width))
  );

  return {
    width,
    height,
    columns: 1,
    rows,
    gap: STRIP_GAP,
    pad: { left: STRIP_PAD_X, right: STRIP_PAD_X, top: STRIP_PAD_Y, bottom: Math.max(STRIP_PAD_Y, watermarkBottom) },
  };
}

export const printSpec = {
  "1x1": build(POLAROID, 1, 1, 0, { left: 16, right: 16, top: 16, bottom: 32 }),
  "1x2": buildStrip(2),
  "1x3": buildStrip(3),
  "1x4": buildStrip(4),
  "2x2": build(GRID, 2, 2, 8, { left: 16, right: 16, top: 16, bottom: 16 }),
};

export function getSlotRatio(frameId) {
  const [slot] = getSlotRects(printSpec[frameId]);
  return slot.width / slot.height;
}

export function getSlotRects(spec) {
  const { width, height, columns, rows, gap, pad } = spec;
  const slotWidth = (width - pad.left - pad.right - gap * (columns - 1)) / columns;
  const slotHeight = (height - pad.top - pad.bottom - gap * (rows - 1)) / rows;

  return Array.from({ length: columns * rows }, (_, index) => ({
    x: pad.left + (index % columns) * (slotWidth + gap),
    y: pad.top + Math.floor(index / columns) * (slotHeight + gap),
    width: slotWidth,
    height: slotHeight,
  }));
}

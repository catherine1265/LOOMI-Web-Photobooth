const STRIP = { width: 591, height: 1772 };
const GRID = { width: 1181, height: 1772 };
const POLAROID = { width: 1039, height: 1264 };

const PAD_X = 0.08;
const PAD_Y = 0.05;
const GAP = 63;

function strip(rows) {
  const padX = Math.round(STRIP.width * PAD_X);
  const padY = Math.round(STRIP.height * PAD_Y);
  return {
    ...STRIP,
    columns: 1,
    rows,
    gap: GAP,
    pad: { left: padX, right: padX, top: padY, bottom: padY },
  };
}

export const printSpec = {
  "1x1": {
    ...POLAROID,
    columns: 1,
    rows: 1,
    gap: 0,
    pad: {
      left: Math.round(POLAROID.width * 0.05),
      right: Math.round(POLAROID.width * 0.05),
      top: Math.round(POLAROID.width * 0.05),
      bottom: Math.round(POLAROID.height * 0.22),
    },
  },
  "1x2": strip(2),
  "1x3": strip(3),
  "1x4": strip(4),
  "2x2": {
    ...GRID,
    columns: 2,
    rows: 2,
    gap: GAP,
    pad: {
      left: Math.round(GRID.width * PAD_X),
      right: Math.round(GRID.width * PAD_X),
      top: Math.round(GRID.height * PAD_Y),
      bottom: Math.round(GRID.height * PAD_Y),
    },
  },
};

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

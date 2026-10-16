const STRIP = { width: 591, card: { width: 103, height: 270 } };
const GRID = { width: 1181, card: { width: 192, height: 270 } };
const POLAROID = { width: 1039, card: { width: 138, height: 190 } };

function build(base, columns, rows, cardGap, cardPad) {
  const k = base.width / base.card.width;
  return {
    width: base.width,
    height: Math.round(base.card.height * k),
    columns,
    rows,
    gap: Math.round(cardGap * k),
    pad: {
      left: Math.round(cardPad.left * k),
      right: Math.round(cardPad.right * k),
      top: Math.round(cardPad.top * k),
      bottom: Math.round(cardPad.bottom * k),
    },
  };
}

const STRIP_PAD_X = STRIP.card.width * 0.08;
const STRIP_PAD_Y = STRIP.card.height * 0.05;

export const printSpec = {
  "1x1": build(POLAROID, 1, 1, 0, { left: 16, right: 16, top: 16, bottom: 32 }),
  "1x2": build(STRIP, 1, 2, 8, { left: STRIP_PAD_X, right: STRIP_PAD_X, top: 16, bottom: 16 }),
  "1x3": build(STRIP, 1, 3, 11, { left: STRIP_PAD_X, right: STRIP_PAD_X, top: STRIP_PAD_Y, bottom: STRIP_PAD_Y }),
  "1x4": build(STRIP, 1, 4, 11, { left: STRIP_PAD_X, right: STRIP_PAD_X, top: STRIP_PAD_Y, bottom: STRIP_PAD_Y }),
  "2x2": build(GRID, 2, 2, 8, { left: 16, right: 16, top: 16, bottom: 16 }),
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

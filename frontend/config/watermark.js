export const WATERMARK_TEXT = "LOOMI";
export const WATERMARK_SUBTITLE = "Online Photobooth";
export const WATERMARK_FONT_FAMILY = 'Georgia, "Times New Roman", serif';
export const WATERMARK_FONT_STYLE = "bold";
export const WATERMARK_SIZE_RATIO = 0.11;
export const WATERMARK_SUBTITLE_RATIO = 0.5;
export const WATERMARK_LINE_GAP_EM = 0.25;
export const WATERMARK_LETTER_SPACING_EM = 0.25;
export const WATERMARK_OPACITY = 1;
export const WATERMARK_OUTLINE_COLOR = "#ffffff";
export const WATERMARK_OUTLINE_EM = 0.14;
export const WATERMARK_OVERLAP_RATIO = 0.5;
export const WATERMARK_CAP_HEIGHT_EM = 0.75;
export const WATERMARK_GLYPH_TOP_EM = 0.17;
export const WATERMARK_BOTTOM_MARGIN_EM = 0.3;
export const WATERMARK_MIN_BOTTOM_HEIGHT_RATIO = 0.07;

export function getWatermarkBottomNeed(width) {
  const title = width * WATERMARK_SIZE_RATIO;
  const belowEdge =
    title * WATERMARK_CAP_HEIGHT_EM * (1 - WATERMARK_OVERLAP_RATIO) +
    title * WATERMARK_LINE_GAP_EM +
    title * WATERMARK_SUBTITLE_RATIO * WATERMARK_CAP_HEIGHT_EM +
    title * WATERMARK_BOTTOM_MARGIN_EM;
  return Math.ceil(belowEdge);
}

export function getWatermarkLayout(spec) {
  const titleSize = spec.width * WATERMARK_SIZE_RATIO;
  const subtitleSize = titleSize * WATERMARK_SUBTITLE_RATIO;
  const photoBottom = spec.height - spec.pad.bottom;

  const titleGlyphTop = photoBottom - titleSize * WATERMARK_CAP_HEIGHT_EM * WATERMARK_OVERLAP_RATIO;
  const subtitleGlyphTop =
    titleGlyphTop + titleSize * WATERMARK_CAP_HEIGHT_EM + titleSize * WATERMARK_LINE_GAP_EM;

  const line = (text, fontSize, glyphTop) => {
    const letterSpacing = fontSize * WATERMARK_LETTER_SPACING_EM;
    return {
      text,
      fontSize,
      letterSpacing,
      x: letterSpacing / 2,
      y: glyphTop - fontSize * WATERMARK_GLYPH_TOP_EM,
      width: spec.width,
    };
  };

  return [
    line(WATERMARK_TEXT.toUpperCase(), titleSize, titleGlyphTop),
    line(WATERMARK_SUBTITLE, subtitleSize, subtitleGlyphTop),
  ];
}

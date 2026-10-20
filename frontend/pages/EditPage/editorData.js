export const UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export function validateImage(file) {
  if (!UPLOAD_TYPES.includes(file.type)) return "Use a PNG, JPG or WebP image.";
  if (file.size > UPLOAD_MAX_BYTES) return "The image must be 5 MB or smaller.";
  return "";
}

export const TABS = [
  { id: "effect", label: "EFFECT" },
  { id: "sticker", label: "STICKER" },
  { id: "frame", label: "FRAME" },
  { id: "text", label: "TEXT" },
];

const themeFrameFiles = import.meta.glob("../../assets/frames/*/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

const folderCoverFiles = import.meta.glob("../../assets/folders/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

function folderCover(name) {
  const match = Object.entries(folderCoverFiles).find(
    ([path]) => path.split("/").pop().replace(/\.[^.]+$/, "") === name
  );
  return match ? match[1] : null;
}

function numberedCover(position) {
  return folderCover(`folder${position}`);
}

const looseFrameFiles = import.meta.glob("../../assets/frames/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

const LOOSE_THEME_ID = "basic";

function fileId(path) {
  return path.split("/").pop().replace(/\.[^.]+$/, "");
}

function sortedFrames(entries, themeId) {
  return entries
    .sort(([first], [second]) => first.localeCompare(second, undefined, { numeric: true }))
    .map(([path, src]) => ({ id: `${themeId}-${fileId(path)}`, src }));
}

function themeFrames(themeId) {
  if (themeId === LOOSE_THEME_ID) return sortedFrames(Object.entries(looseFrameFiles), themeId);

  return sortedFrames(
    Object.entries(themeFrameFiles).filter(([path]) => path.split("/").slice(-2, -1)[0] === themeId),
    themeId
  );
}

const KNOWN_THEMES = [
  { id: "y2k", label: "Y2K", accent: "#d9d0dc" },
  { id: "vintage", label: "Vintage", accent: "#f6efdf" },
  { id: "kidcore", label: "Kidcore", accent: "#f7e3a3" },
  { id: "soft", label: "Soft", accent: "#f5c9c2" },
];

const THEME_STYLES = {
  abstract: { label: "Abstract", accent: "#e6dcf2" },
  dark: { label: "Dark", accent: "#4a4458" },
  [LOOSE_THEME_ID]: { label: "Basic", accent: "#dfe8ef" },
};

const folderIds = [
  ...new Set(Object.keys(themeFrameFiles).map((path) => path.split("/").slice(-2, -1)[0])),
];
const extraIds = folderIds
  .filter((id) => !KNOWN_THEMES.some((theme) => theme.id === id))
  .sort();
if (Object.keys(looseFrameFiles).length > 0) extraIds.push(LOOSE_THEME_ID);

function capitalize(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const frameThemes = [
  ...KNOWN_THEMES,
  ...extraIds.map((id) => ({
    id,
    label: THEME_STYLES[id]?.label ?? capitalize(id),
    accent: THEME_STYLES[id]?.accent ?? "#dfe8ef",
  })),
].map((theme, index) => ({
  ...theme,
  cover: numberedCover(index + 1) ?? folderCover(theme.id),
  frames: themeFrames(theme.id),
}));

export const colorFolderCover = numberedCover(frameThemes.length + 1);

const stickerFiles = import.meta.glob("../../assets/stickers/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

export const stickers = Object.entries(stickerFiles)
  .sort(([first], [second]) => first.localeCompare(second, undefined, { numeric: true }))
  .map(([path, src]) => ({
    id: path.split("/").pop().replace(/\.[^.]+$/, ""),
    src,
  }));

export const fonts = [
  { id: "lilita", family: "Lilita One" },
  { id: "pacifico", family: "Pacifico" },
  { id: "titan", family: "Titan One" },
  { id: "vibes", family: "Great Vibes" },
  { id: "bangers", family: "Bangers" },
  { id: "typewriter", family: "Special Elite" },
  { id: "indie", family: "Indie Flower" },
  { id: "caveat", family: "Caveat Brush" },
  { id: "righteous", family: "Righteous" },
  { id: "shadows", family: "Shadows Into Light" },
  { id: "cherrybomb", family: "Cherry Bomb One" },
  { id: "gaegu", family: "Gaegu" },
  { id: "imperial", family: "Imperial Script" },
  { id: "fellcanon", family: "IM Fell French Canon SC" },
  { id: "festive", family: "Festive" },
];

export const DEFAULT_TEXT_COLOR = "#652b2b";

export const PRESET_COLORS = [
  "#652b2b",
  "#1d1a24",
  "#ffffff",
  "#fff5cb",
  "#fadde4",
  "#cbdce5",
  "#f0e9b5",
  "#f2a8b9",
];

export const DEFAULT_FONT_ID = fonts[0].id;

export const STICKER_DEFAULT_WIDTH = 0.35;
export const TEXT_DEFAULT_SIZE = 140;
export const DEFAULT_TEXT = "Hello!";
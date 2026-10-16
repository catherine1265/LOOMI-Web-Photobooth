import floral from "../../assets/frames/floral.svg";
import dots from "../../assets/frames/dots.svg";
import stars from "../../assets/frames/stars.svg";
import lace from "../../assets/frames/lace.svg";
import flowers from "../../assets/frames/flowers.svg";
import plaid from "../../assets/frames/plaid.svg";

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

export const frames = [
  { id: "floral", src: floral, accent: "#f5c9c2" },
  { id: "dots", src: dots, accent: "#f6efdf" },
  { id: "stars", src: stars, accent: "#ffffff" },
  { id: "lace", src: lace, accent: "#f4dfe4" },
  { id: "flowers", src: flowers, accent: "#f7e3a3" },
  { id: "plaid", src: plaid, accent: "#d9d0dc" },
];

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

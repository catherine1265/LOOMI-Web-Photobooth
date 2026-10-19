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

// Frame dikelompokkan per tema (folder). Frame baru: taruh gambar di
// frontend/assets/frames/<id-tema>/ (mis. frames/y2k/frame1.png), otomatis muncul.
// Enam frame lama di bawah dipakai sementara sebagai isi awal tema.
const themeFrameFiles = import.meta.glob("../../assets/frames/*/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Gambar cover folder: taruh di frontend/assets/folders/<id-tema>.png
// (mis. folders/y2k.png). Kalau belum ada, cover memakai frame pertama tema itu.
const folderCoverFiles = import.meta.glob("../../assets/folders/*.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
});

function folderCover(themeId) {
  const match = Object.entries(folderCoverFiles).find(
    ([path]) => path.split("/").pop().replace(/\.[^.]+$/, "") === themeId
  );
  return match ? match[1] : null;
}

function themeFrames(themeId, starter = []) {
  const added = Object.entries(themeFrameFiles)
    .filter(([path]) => path.split("/").slice(-2, -1)[0] === themeId)
    .sort(([first], [second]) => first.localeCompare(second, undefined, { numeric: true }))
    .map(([path, src]) => ({ id: `${themeId}-${path.split("/").pop().replace(/\.[^.]+$/, "")}`, src }));

  return [...added, ...starter];
}

export const frameThemes = [
  {
    id: "y2k",
    cover: folderCover("y2k"),
    label: "Y2K",
    accent: "#d9d0dc",
    frames: themeFrames("y2k", [{ id: "stars", src: stars }]),
  },
  {
    id: "vintage",
    cover: folderCover("vintage"),
    label: "Vintage",
    accent: "#f6efdf",
    frames: themeFrames("vintage", [
      { id: "dots", src: dots },
      { id: "plaid", src: plaid },
    ]),
  },
  {
    id: "kidcore",
    cover: folderCover("kidcore"),
    label: "Kidcore",
    accent: "#f7e3a3",
    frames: themeFrames("kidcore", [{ id: "flowers", src: flowers }]),
  },
  {
    id: "soft",
    cover: folderCover("soft"),
    label: "Soft",
    accent: "#f5c9c2",
    frames: themeFrames("soft", [
      { id: "floral", src: floral },
      { id: "lace", src: lace },
    ]),
  },
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

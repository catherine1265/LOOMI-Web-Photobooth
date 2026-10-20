import { useEffect, useRef, useState } from "react";
import "./style/EditPage.css";
import Navbar from "../Navbar/tampilan/Navbar";
import { clearPhotoSession, usePhotoSession } from "../../photoStore.js";
import { printSpec } from "../../printSpec.js";
import { loadImage } from "../../stripAssets.js";
import {
  DEFAULT_FONT_ID,
  DEFAULT_TEXT,
  DEFAULT_TEXT_COLOR,
  STICKER_DEFAULT_WIDTH,
  TEXT_DEFAULT_SIZE,
} from "./editorData.js";
import StripCanvas from "./components/StripCanvas.jsx";
import EditorPanel from "./components/EditorPanel.jsx";
import { setResultPhoto } from "../ResultPhoto/ResultPhoto.js";

const INITIAL_EDITS = { effectId: "original", background: null, stickers: [], texts: [] };

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function EditPage({ onEmpty, onRetake , onDone}) {
  const session = usePhotoSession();
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [edits, setEdits] = useState(INITIAL_EDITS);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("effect");
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState(DEFAULT_TEXT_COLOR);
  const [savedColors, setSavedColors] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) onEmpty();
  }, [session, onEmpty]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (!selectedId) return;

      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (typing) return;

      event.preventDefault();
      removeItem(selectedId);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  if (!session) return null;

  const spec = printSpec[session.frameType];
  const selectedSticker = edits.stickers.find((item) => item.id === selectedId);
  const selectedText = edits.texts.find((item) => item.id === selectedId);
  const selected = selectedSticker ?? selectedText;

  function patch(partial) {
    setEdits((previous) => ({ ...previous, ...partial }));
  }

  function updateItem(id, changes) {
    setEdits((previous) => ({
      ...previous,
      stickers: previous.stickers.map((item) => (item.id === id ? { ...item, ...changes } : item)),
      texts: previous.texts.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    }));
  }

  function removeItem(id) {
    setEdits((previous) => ({
      ...previous,
      stickers: previous.stickers.filter((item) => item.id !== id),
      texts: previous.texts.filter((item) => item.id !== id),
    }));
    setSelectedId(null);
  }

  function nextZ() {
    return Math.max(0, ...edits.stickers.map((item) => item.z), ...edits.texts.map((item) => item.z)) + 1;
  }

  function handleSelect(id) {
    setSelectedId(id);
    if (!id) return;

    const item = [...edits.stickers, ...edits.texts].find((candidate) => candidate.id === id);
    if (item && item.z < nextZ() - 1) updateItem(id, { z: nextZ() });
  }

  async function handleAddSticker(src) {
    try {
      const image = await loadImage(src);
      const offset = (edits.stickers.length % 5) * 50;
      const sticker = {
        id: newId(),
        src,
        x: spec.width / 2,
        y: spec.height / 2 + offset,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        z: nextZ(),
        width: Math.round(spec.width * STICKER_DEFAULT_WIDTH),
        aspect: image.naturalWidth / image.naturalHeight,
      };
      setEdits((previous) => ({ ...previous, stickers: [...previous.stickers, sticker] }));
      setSelectedId(sticker.id);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  function addText(value, fontId) {
    const offset = (edits.texts.length % 5) * 60;
    const text = {
      id: newId(),
      text: value,
      fontId,
      color: draftColor,
      x: spec.width / 2,
      y: spec.height / 2 + offset,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      z: nextZ(),
      fontSize: TEXT_DEFAULT_SIZE,
    };
    setEdits((previous) => ({ ...previous, texts: [...previous.texts, text] }));
    setSelectedId(text.id);
    setDraft("");
  }

  function handleTextChange(value) {
    if (selectedText) {
      if (value === "") removeItem(selectedText.id);
      else updateItem(selectedText.id, { text: value });
      return;
    }

    if (value.trim() === "") setDraft(value);
    else addText(value, DEFAULT_FONT_ID);
  }

  function handlePickFont(fontId) {
    if (selectedText) updateItem(selectedText.id, { fontId });
    else addText(draft.trim() || DEFAULT_TEXT, fontId);
  }

  function handlePickColor(color) {
    if (selectedText) updateItem(selectedText.id, { color });
    else setDraftColor(color);
  }

  function handleTrash() {
    if (selected) {
      removeItem(selected.id);
      return;
    }

    const frameType = session.frameType;
    clearPhotoSession();
    onRetake(frameType);
  }

  function handleDone() {
    const stage = stageRef.current;
    const transformer = transformerRef.current;

    if (!stage) {
      setError("Unable to generate your photo. Please try again.");
      return;
    }

    const previousNodes = transformer?.nodes() ?? [];

    try {
      transformer?.nodes([]);

      const url = stage.toDataURL({
        pixelRatio: spec.width / stage.width(),
        mimeType: "image/png",
      });

      setResultPhoto(url);
      onDone?.();
    } catch (exportError) {
      setError(exportError.message || "Unable to save your photo.");
    } finally {
      if (transformer) {
        transformer.nodes(previousNodes);
        transformer.getLayer()?.batchDraw();
      }
    }
  }

  return (
    <main className="edit-page">
      <Navbar />

      <section className="edit-page__stage">
        <StripCanvas
          session={session}
          edits={edits}
          selectedId={selectedId}
          onSelect={handleSelect}
          onChange={updateItem}
          stageRef={stageRef}
          transformerRef={transformerRef}
        />

        <EditorPanel
          tab={tab}
          onTab={setTab}
          photo={session.photos[0]}
          edits={edits}
          text={{
            value: selectedText ? selectedText.text : draft,
            fontId: selectedText?.fontId,
            color: selectedText ? selectedText.color : draftColor,
          }}
          onEffect={(effectId) => patch({ effectId })}
          onBackground={(background) => patch({ background })}
          savedColors={savedColors}
          onSaveColor={(hex) => setSavedColors((previous) => (previous.includes(hex) ? previous : [...previous, hex]))}
          onAddSticker={handleAddSticker}
          onTextChange={handleTextChange}
          onPickFont={handlePickFont}
          onPickColor={handlePickColor}
        />
      </section>

      <footer className="edit-page__footer">
        <button
          type="button"
          className="edit-page__trash"
          onClick={handleTrash}
          aria-label={selected ? "Delete selected item" : "Discard photos and retake"}
          title={selected ? "Delete selected item" : "Discard photos and retake"}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="edit-page__center">
          {error && (
            <p className="edit-page__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <button type="button" className="edit-page__done" onClick={handleDone}>
          DONE
        </button>
      </footer>
    </main>
  );
}

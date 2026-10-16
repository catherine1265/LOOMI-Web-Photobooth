import { TABS } from "../editorData.js";
import EffectTab from "./EffectTab.jsx";
import FrameTab from "./FrameTab.jsx";
import StickerTab from "./StickerTab.jsx";
import TextTab from "./TextTab.jsx";

export default function EditorPanel({
  tab,
  onTab,
  photo,
  edits,
  text,
  onEffect,
  onBackground,
  onAddSticker,
  onTextChange,
  onPickFont,
  onPickColor,
}) {
  return (
    <section className="edit-panel" aria-label="Editor">
      <div className="edit-panel__tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="edit-panel__tab"
            aria-selected={tab === item.id}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="edit-panel__body">
        {tab === "effect" && (
          <EffectTab photo={photo} effectId={edits.effectId} onSelect={onEffect} />
        )}
        {tab === "frame" && (
          <FrameTab background={edits.background} onSelect={onBackground} />
        )}
        {tab === "sticker" && <StickerTab onAdd={onAddSticker} />}
        {tab === "text" && (
          <TextTab
            value={text.value}
            fontId={text.fontId}
            color={text.color}
            onChange={onTextChange}
            onPickFont={onPickFont}
            onPickColor={onPickColor}
          />
        )}
      </div>
    </section>
  );
}

import { DEFAULT_TEXT, fonts } from "../editorData.js";
import ColorPicker from "./ColorPicker.jsx";

export default function TextTab({ value, fontId, color, onChange, onPickFont, onPickColor }) {
  return (
    <div className="edit-text">
      <ColorPicker value={color} onChange={onPickColor} />

      <input
        className="edit-text__input"
        type="text"
        value={value}
        placeholder="Enter text here"
        maxLength={40}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Text"
      />

      <p className="edit-text__heading">STYLE</p>

      <div className="edit-text__grid">
        {fonts.map((font) => (
          <button
            key={font.id}
            type="button"
            className="edit-text__item"
            aria-pressed={fontId === font.id}
            aria-label={`${font.family} font`}
            style={{ fontFamily: `"${font.family}", serif` }}
            onClick={() => onPickFont(font.id)}
          >
            {DEFAULT_TEXT}
          </button>
        ))}
      </div>
    </div>
  );
}

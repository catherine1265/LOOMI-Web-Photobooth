import { useEffect, useRef, useState } from "react";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";

const PRESET_VARS = ["--pt-cream", "--pt-pink", "--pt-blue", "--pt-yellow", "--pt-burgundy", "--pt-paper"];
const DEFAULT_COLOR = { value: "#f2a8b9", alpha: 1 };

export function toHex8(value, alpha) {
  return `${value}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`.toLowerCase();
}

function fromHex8(hex) {
  return {
    value: hex.slice(0, 7).toLowerCase(),
    alpha: hex.length >= 9 ? Math.round((parseInt(hex.slice(7, 9), 16) / 255) * 100) / 100 : 1,
  };
}

export default function ColorPanel({ background, onChange, savedColors, onSaveColor }) {
  const rootRef = useRef(null);
  const [presets, setPresets] = useState([]);
  const [draft, setDraft] = useState(DEFAULT_COLOR);

  const active = background?.type === "color" ? background : null;
  const { value, alpha } = active ?? draft;
  const current = toHex8(value, alpha);

  useEffect(() => {
    const style = getComputedStyle(rootRef.current.closest(".edit-page"));
    setPresets(
      [...PRESET_VARS.map((name) => style.getPropertyValue(name).trim()), "#ffffff"]
        .filter(Boolean)
        .map((hex) => `${hex.toLowerCase()}ff`.slice(0, 9))
    );
  }, []);

  const colors = [...presets, ...savedColors.filter((saved) => !presets.includes(saved))];

  function apply(nextValue, nextAlpha) {
    setDraft({ value: nextValue, alpha: nextAlpha });
    onChange({ type: "color", value: nextValue, alpha: nextAlpha });
  }

  return (
    <div className="edit-colorpanel" ref={rootRef}>
      <HexAlphaColorPicker
        color={current}
        onChange={(hex) => {
          const next = fromHex8(hex);
          apply(next.value, next.alpha);
        }}
      />

      <div className="edit-colorpanel__side">
        <div className="edit-colorpanel__row">
          <HexColorInput
            className="edit-colorpanel__hex"
            prefixed
            color={value}
            onChange={(hex) => apply(hex.toLowerCase(), alpha)}
            aria-label="Hex color"
          />
          <label className="edit-colorpanel__opacity">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(alpha * 100)}
              onChange={(event) =>
                apply(value, Math.min(Math.max(Number(event.target.value) || 0, 0), 100) / 100)
              }
              aria-label="Opacity percent"
            />
            %
          </label>
        </div>

        <div className="edit-colorpanel__saved-header">
          <span className="edit-colorpanel__saved-title">Saved colors</span>
          <button type="button" className="edit-colorpanel__add" onClick={() => onSaveColor(current)}>
            + Add
          </button>
        </div>

        <div className="edit-colorpanel__swatches">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className="edit-colorpanel__swatch"
              style={{ "--swatch": color }}
              aria-pressed={color === current}
              aria-label={`Use color ${color}`}
              onClick={() => {
                const next = fromHex8(color);
                apply(next.value, next.alpha);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

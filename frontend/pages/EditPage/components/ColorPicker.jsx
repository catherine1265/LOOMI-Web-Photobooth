import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { PRESET_COLORS } from "../editorData.js";

const POPOVER_WIDTH = 232;
const POPOVER_HEIGHT = 340;
const POPOVER_GAP = 12;

export default function ColorPicker({ value, onChange }) {
  const swatchRef = useRef(null);
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);
  const supportsEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  function open() {
    const rect = swatchRef.current.getBoundingClientRect();
    const fitsRight = rect.right + POPOVER_GAP + POPOVER_WIDTH <= window.innerWidth;

    setPosition({
      left: fitsRight ? rect.right + POPOVER_GAP : Math.max(rect.left - POPOVER_GAP - POPOVER_WIDTH, 8),
      top: Math.max(Math.min(rect.top, window.innerHeight - POPOVER_HEIGHT - 8), 8),
    });
  }

  useEffect(() => {
    if (!position) return;

    function handlePointerDown(event) {
      if (
        !popoverRef.current?.contains(event.target) &&
        !swatchRef.current?.contains(event.target)
      ) {
        setPosition(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setPosition(null);
        swatchRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [position]);

  async function pickFromScreen() {
    try {
      const result = await new window.EyeDropper().open();
      onChange(result.sRGBHex);
    } catch {}
  }

  const container = swatchRef.current?.closest(".edit-page");

  return (
    <div className="edit-color">
      <span className="edit-color__label">Text Color:</span>

      <button
        ref={swatchRef}
        type="button"
        className="edit-color__swatch"
        style={{ background: value }}
        aria-label="Choose text color"
        aria-expanded={Boolean(position)}
        onClick={() => (position ? setPosition(null) : open())}
      />

      {position &&
        container &&
        createPortal(
          <div
            ref={popoverRef}
            className="edit-color__popover"
            style={{ left: position.left, top: position.top, width: POPOVER_WIDTH }}
            role="dialog"
            aria-label="Text color picker"
          >
            <HexColorPicker color={value} onChange={onChange} />

            <div className="edit-color__row">
              <span className="edit-color__hash">#</span>
              <HexColorInput
                className="edit-color__hex"
                color={value}
                onChange={onChange}
                aria-label="Hex color"
              />
              {supportsEyeDropper && (
                <button
                  type="button"
                  className="edit-color__eyedropper"
                  onClick={pickFromScreen}
                  aria-label="Pick a color from the screen"
                  title="Pick a color from the screen"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="m14 6 4 4M4 20l1-4 9.5-9.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 20l-5 0Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="edit-color__presets">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="edit-color__preset"
                  style={{ background: preset }}
                  aria-label={`Use color ${preset}`}
                  onClick={() => onChange(preset)}
                />
              ))}
            </div>
          </div>,
          container
        )}
    </div>
  );
}

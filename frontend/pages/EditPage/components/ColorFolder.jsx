import { toRgba } from "../../../stripAssets.js";
import { colorFolderCover } from "../editorData.js";

export default function ColorFolder({ background, onOpen }) {
  const active = background?.type === "color" ? background : null;

  return (
    <button type="button" className="edit-frames__item" aria-label="Frame color" onClick={onOpen}>
      <span className="edit-frames__folder">
        <span className="edit-frames__tab" />
        <span
          className={`edit-frames__body${active || colorFolderCover ? "" : " edit-frames__body--rainbow"}`}
          style={
            active
              ? { backgroundColor: toRgba(active.value, active.alpha) }
              : colorFolderCover
                ? { backgroundImage: `url("${colorFolderCover}")` }
                : undefined
          }
        >
          <span className="edit-frames__label">Color</span>
        </span>
      </span>
    </button>
  );
}

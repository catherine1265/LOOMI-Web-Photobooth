import { effects } from "../../../config/effects.js";

export default function EffectTab({ photo, effectId, onSelect }) {
  return (
    <div className="edit-effects">
      {effects.map((effect) => (
        <button
          key={effect.id}
          type="button"
          className="edit-effects__item"
          aria-pressed={effectId === effect.id}
          aria-label={`${effect.name} effect`}
          title={effect.name}
          onClick={() => onSelect(effect.id)}
        >
          <img src={photo.src} alt="" style={{ filter: effect.filter }} />
        </button>
      ))}
    </div>
  );
}

import { poses } from "./poses.js";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function PoseIdeas({ selected, max, onToggle, onClear, onClose }) {
  return (
    <section className="self-photo-pose" aria-label="Pose Ideas">
      <header className="self-photo-pose__header">
        <h2 className="self-photo-pose__title">Pose Ideas</h2>
        <button
          type="button"
          className="self-photo-pose__icon-button"
          onClick={onClose}
          aria-label="Close pose ideas"
        >
          <CloseIcon />
        </button>
      </header>

      {poses.length === 0 ? (
        <p className="self-photo-pose__empty">No pose ideas yet</p>
      ) : (
        <div className="self-photo-pose__grid">
          {poses.map((pose) => {
            const order = selected.indexOf(pose.src) + 1;
            return (
              <button
                key={pose.id}
                type="button"
                className="self-photo-pose__item"
                aria-pressed={order > 0}
                aria-label={`Pose idea ${pose.id}`}
                onClick={() => onToggle(pose.src)}
              >
                <img src={pose.src} alt="" loading="lazy" />
                {order > 0 && <span className="self-photo-pose__order">{order}</span>}
              </button>
            );
          })}
        </div>
      )}

      <footer className="self-photo-pose__footer">
        <span className="self-photo-pose__count">
          {selected.length}/{max} chosen
        </span>
        <button
          type="button"
          className="self-photo-pose__action"
          onClick={onClear}
          disabled={selected.length === 0}
        >
          Clear
        </button>
        <button type="button" className="self-photo-pose__action self-photo-pose__action--primary" onClick={onClose}>
          Use
        </button>
      </footer>
    </section>
  );
}

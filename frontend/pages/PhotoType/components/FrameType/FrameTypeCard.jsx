export default function FrameTypeCard({ layout, selected, onSelect }) {
  const { id, label, image, slots, columns } = layout;

  return (
    <button
      className={`frame-type__card frame-type__card--${id}`}
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`${label} photo layout`}
    >
      <span className="frame-type__paper">
        {image ? (
          <img className="frame-type__image" src={image} alt={`${label} layout preview`} />
        ) : (
          <span
            className="frame-type__slots"
            style={{ "--columns": columns, "--rows": slots / columns }}
            aria-hidden="true"
          >
            {Array.from({ length: slots }, (_, index) => (
              <span className="frame-type__slot" key={index} />
            ))}
          </span>
        )}
      </span>

      <span className="frame-type__label">{label}</span>
    </button>
  );
}

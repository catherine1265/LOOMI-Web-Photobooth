export function SlotContent({ photo, index, hint, onHintClick }) {
  const HintTag = onHintClick ? "button" : "span";

  return (
    <>
      {!photo && hint ? (
        <HintTag
          {...(onHintClick
            ? {
                type: "button",
                onClick: onHintClick,
                "aria-label": `Pose idea for photo ${index + 1}. Click to change the pose ideas`,
                title: "Click to change the pose ideas",
              }
            : {})}
          className="self-photo__pose-hint"
        >
          <img src={hint} alt="" loading="lazy" />
          <span className="self-photo__pose-tag">Pose</span>
        </HintTag>
      ) : photo ? (
        <img
          src={photo}
          alt={`Photo result ${index + 1}`}
        />
      ) : (
        <div
          className={`self-photo__mosaic self-photo__mosaic--${index + 1}`}
          aria-label="Photo result placeholder"
          role="img"
        />
      )}

      <span className="self-photo__result-overlay" />
    </>
  );
}

export function BlurredPlaceholder(props) {
  return (
    <div className="self-photo__result-image">
      <SlotContent {...props} />
    </div>
  );
}

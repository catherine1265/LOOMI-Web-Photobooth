export default function PhotoStripPanel({ frame, renderSlot, children }) {
  const slots = frame.slots;

  return (
    <section
      className={`self-photo-results self-photo-results--${frame.id}`}
      aria-label="Photo results"
    >
      <div className="self-photo-results-list">
        <div
          className={`self-photo-frame self-photo-frame--${frame.id}`}
          style={{
            "--columns": frame.columns,
            "--rows": slots / frame.columns,
          }}
        >
          {Array.from({ length: slots }, (_, index) => renderSlot(index))}
        </div>
      </div>

      {children}
    </section>
  );
}


export default function PhotoLayoutSelection({ onSelectLayout }) {
  const layouts = [
    { id: 1, title: "Single Photo", count: 1 },
    { id: 2, title: "Double Photo", count: 2 },
    { id: 3, title: "Triple Photo", count: 3 },
    { id: 4, title: "Four Photos", count: 4 },
  ];

  return (
    <section className="layout-section" id="layouts">
      <div className="section-heading">
        <span className="hero-label">YOUR PHOTO, YOUR STYLE</span>
        <h2>Choose your layout</h2>
        <p>Pick a layout for your next photobooth session.</p>
      </div>

      <div className="layout-grid">
        {layouts.map((layout) => (
          <button
            type="button"
            className="layout-card"
            key={layout.id}
            onClick={() => onSelectLayout?.(layout.id)}
          >
            <div className={`layout-preview layout-count-${layout.count}`}>
              {Array.from({ length: layout.count }, (_, index) => (
                <span className="layout-photo" key={index}>
                  {index + 1}
                </span>
              ))}
            </div>

            <span className="layout-title">{layout.title}</span>
            <span className="layout-count-label">
              {layout.count} {layout.count === 1 ? "photo" : "photos"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Sparkle({ className = "" }) {
  return (
    <svg
      className={`self-photo__sparkle ${className}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M50 2 L53.8 40.8 L71.2 28.8 L59.2 46.2 L98 50 L59.2 53.8 L71.2 71.2 L53.8 59.2 L50 98 L46.2 59.2 L28.8 71.2 L40.8 53.8 L2 50 L40.8 46.2 L28.8 28.8 L46.2 40.8Z"
        fill="#f7e9b0"
        stroke="#652b2b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

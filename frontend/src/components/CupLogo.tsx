/** Brand mark. Steam only moves when `animated` (an always-on loop in the header is a distraction). */
export default function CupLogo({ className = "h-9 w-9", animated = false }: { className?: string; animated?: boolean }) {
  const steam = animated ? "animate-steam" : undefined;
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cupGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6b1a" />
          <stop offset="60%" stopColor="#ffb020" />
          <stop offset="100%" stopColor="#ff3d71" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="url(#cupGrad)" opacity="0.14" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" stroke="url(#cupGrad)" strokeWidth="1.6" />
      <path
        d="M13 20h18v8a9 9 0 0 1-9 9h0a9 9 0 0 1-9-9v-8Z"
        stroke="url(#cupGrad)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M31 22h2.6a3.4 3.4 0 0 1 0 6.8H31"
        stroke="url(#cupGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M18 14c0-2 2-2 2-4" stroke="url(#cupGrad)" strokeWidth="2" strokeLinecap="round" className={steam} />
      <path d="M24 14c0-2 2-2 2-4" stroke="url(#cupGrad)" strokeWidth="2" strokeLinecap="round" className={steam} style={animated ? { animationDelay: "0.9s" } : undefined} />
    </svg>
  );
}

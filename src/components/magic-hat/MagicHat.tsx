export function MagicHat() {
  return (
    <svg width="160" height="200" viewBox="0 0 160 200" className="overflow-visible">
      <defs>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <path
        d="M 20,178 C 45,165 62,100 63,52 C 64,32 58,18 46,18 C 38,48 78,110 118,178 C 125,180 140,180 148,176 C 100,186 55,186 20,178 Z"
        fill="url(#hg)"
        stroke="#991111"
        strokeWidth="1"
      />
    </svg>
  );
}
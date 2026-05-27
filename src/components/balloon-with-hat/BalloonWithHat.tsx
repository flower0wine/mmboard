export function BalloonWithHat() {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" className="overflow-visible">
      <defs>
        <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a8e6ff" />
          <stop offset="100%" stopColor="#4aa8e0" />
        </linearGradient>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          dur="5s"
          repeatCount="indefinite"
          values="0,-70; 0,-23; 0,0; 0,0"
          keyTimes="0; 0.25; 0.33; 1"
        />

        <path
          fill="url(#wg)"
          stroke="#7fc9ed"
          strokeWidth="1"
        >
          <animate
            attributeName="d"
            dur="5s"
            repeatCount="indefinite"
            values="
              M 45,135 C 65,20 135,20 155,135 C 158.6,155.7 158.45,185 100,185 L 100,185 C 41.55,185 41.4,155.7 45,135 Z;
              M 45,135 C 65,20 135,20 155,135 C 158.6,155.7 158.45,185 100,185 L 100,185 C 41.55,185 41.4,155.7 45,135 Z;
              M 30,140 C 30,55 170,55 170,140 C 170,155 155,162 145,162 L 55,162 C 45,162 30,155 30,140 Z;
              M 12,148 C 12,78 188,78 188,148 C 188,155 173,162 163,162 L 37,162 C 27,162 12,155 12,148 Z;
              M 40,130 C 40,37 160,37 160,130 C 160,150 148,162 142,162 L 58,162 C 52,162 40,150 40,130 Z;
              M 30,140 C 30,55 170,55 170,140 C 170,155 155,162 145,162 L 55,162 C 45,162 30,155 30,140 Z
            "
            keyTimes="0; 0.25; 0.33; 0.42; 0.52; 1"
          />
        </path>

        <path
          d="M 50,78 C 72,55 84,33 84,12 C 85,4 80,-5 72,-5 C 92,25 112,52 150,78 C 155,79 163,79 168,77 C 135,84 85,84 50,78 Z"
          fill="url(#hg)"
          stroke="#991111"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
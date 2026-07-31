"use client";

/** Abstract SVG illustration for Manual mode — control/focus */
export function ManualIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 h-24"
      aria-hidden
    >
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1" opacity="0.1" />

      {/* Abstract control interface — crosshair + lines */}
      <line x1="32" y1="60" x2="88" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="60" y1="32" x2="60" y2="88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

      {/* Center control dot */}
      <circle cx="60" cy="60" r="6" fill="currentColor" opacity="0.8" />
      <circle cx="60" cy="60" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

      {/* Small directional dots */}
      <circle cx="60" cy="38" r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="60" cy="82" r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="38" cy="60" r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="82" cy="60" r="2.5" fill="currentColor" opacity="0.5" />

      {/* Corner decorative dots */}
      <circle cx="42" cy="42" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="78" cy="42" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="42" cy="78" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="78" cy="78" r="2" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

/** Abstract SVG illustration for Auto mode — automation/flow */
export function AutoIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 h-24"
      aria-hidden
    >
      {/* Background circles */}
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1" opacity="0.1" />

      {/* Circular flow — automation cycle */}
      <path
        d="M60 32 A28 28 0 1 1 59.5 32"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
        fill="none"
      />

      {/* Arrowhead on the cycle */}
      <path
        d="M60 32 L55 42 L65 42 Z"
        fill="currentColor"
        opacity="0.5"
      />

      {/* Central gear/cog representation — 3 dots forming a triangle */}
      <circle cx="60" cy="52" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="52" cy="66" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="68" cy="66" r="3" fill="currentColor" opacity="0.7" />

      {/* Connecting lines — neural/automation network */}
      <line x1="60" y1="52" x2="52" y2="66" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="60" y1="52" x2="68" y2="66" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="52" y1="66" x2="68" y2="66" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

      {/* Inner center dot */}
      <circle cx="60" cy="60" r="2" fill="currentColor" opacity="0.4" />

      {/* Small outer flow dots */}
      <circle cx="60" cy="36" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="84" cy="60" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="60" cy="84" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="36" cy="60" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/** Abstract SVG illustration for Pilot mode — navigation/guidance */
export function PilotIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 h-24"
      aria-hidden
    >
      {/* Background circles */}
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1" opacity="0.1" />

      {/* Outer compass ring */}
      <circle cx="60" cy="60" r="24" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />

      {/* Compass cross — N/S/E/W lines */}
      <line x1="60" y1="32" x2="60" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="60" y1="76" x2="60" y2="88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="32" y1="60" x2="44" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="76" y1="60" x2="88" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

      {/* Diagonal lines */}
      <line x1="40" y1="40" x2="48" y2="48" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="80" y1="40" x2="72" y2="48" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="40" y1="80" x2="48" y2="72" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="80" y1="80" x2="72" y2="72" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />

      {/* Center diamond — the destination/target */}
      <path
        d="M60 52 L66 60 L60 68 L54 60 Z"
        fill="currentColor"
        opacity="0.6"
      />

      {/* Center dot */}
      <circle cx="60" cy="60" r="2.5" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

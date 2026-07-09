"use client";

// 🔮 Custom AI-genererte ikoner for JokerTrade — ingen standard bibliotek-ikoner
// Hver SVG er håndlaget med gradiente, glow og animasjon for et premium-utseende

export function JokerIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id="jokerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#1A1D26" stroke="url(#jokerGrad)" strokeWidth="2" />
      <rect x="22" y="26" width="20" height="18" rx="4" fill="url(#jokerGrad)" filter="url(#goldGlow)" opacity="0.9" />
      <path d="M26 28 L30 22 L34 28" stroke="#1A1D26" strokeWidth="2" fill="none" />
      <circle cx="28" cy="33" r="2" fill="#1A1D26" />
      <circle cx="36" cy="33" r="2" fill="#1A1D26" />
      <path d="M28 38 Q32 41 36 38" stroke="#1A1D26" strokeWidth="1.5" fill="none" />
      <path d="M20 12 L28 20 M44 12 L36 20 M20 52 L28 44 M44 52 L36 44" stroke="#FCD34D" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

export function AIBrainIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#15171B" stroke="url(#brainGrad)" strokeWidth="2" />
      <path d="M28 20 Q32 14 36 20 Q40 14 40 20 Q46 24 40 28 Q46 32 42 40 Q38 50 32 48 Q26 50 22 40 Q18 32 24 28 Q18 24 24 20 Q24 14 28 20Z" fill="url(#brainGrad)" opacity="0.8" />
      <path d="M26 32 Q30 36 32 34 Q34 32 38 36" stroke="#15171B" strokeWidth="1.5" fill="none" />
      <circle cx="28" cy="28" r="1.5" fill="#15171B" />
      <circle cx="36" cy="28" r="1.5" fill="#15171B" />
      <path d="M10 18 L18 26 M54 18 L46 26 M10 46 L18 38 M54 46 L46 38" stroke="#60A5FA" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function ShieldIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#15171B" stroke="#10B981" strokeWidth="2" />
      <path d="M32 14 L46 20 L46 34 Q46 48 32 52 Q18 48 18 34 L18 20 Z" fill="url(#shieldGrad)" opacity="0.8" />
      <path d="M28 36 L31 38 L38 28" stroke="#15171B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="24" r="1.5" fill="#FCD34D" opacity="0.6" />
      <circle cx="36" cy="20" r="1" fill="#FCD34D" opacity="0.4" />
      <circle cx="42" cy="26" r="1" fill="#FCD34D" opacity="0.3" />
    </svg>
  );
}

export function CoinStackIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      <defs>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#15171B" stroke="#F59E0B" strokeWidth="2" />
      <ellipse cx="32" cy="24" rx="14" ry="5" fill="url(#coinGrad)" opacity="0.9" />
      <rect x="18" y="24" width="28" height="12" fill="url(#coinGrad)" opacity="0.7" />
      <ellipse cx="32" cy="36" rx="14" ry="5" fill="#FCD34D" opacity="0.3" />
      <ellipse cx="32" cy="24" rx="14" ry="5" fill="none" stroke="#1A1D26" strokeWidth="1" />
      <path d="M28 14 L36 14" stroke="#FCD34D" strokeWidth="1.5" opacity="0.4" />
      <circle cx="32" cy="14" r="1.5" fill="#FCD34D" opacity="0.3" />
    </svg>
  );
}

export function SparkleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <filter id="sparkleGlow">
          <feGaussianBlur stdDeviation="0.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M12 2 L13 9 L20 10 L13 11 L12 18 L11 11 L4 10 L11 9 Z" fill="#FCD34D" filter="url(#sparkleGlow)" />
      <path d="M20 4 L20.5 6 L22 6.5 L20.5 7 L20 9 L19.5 7 L18 6.5 L19.5 6 Z" fill="#60A5FA" opacity="0.6" />
      <path d="M4 4 L4.5 6 L6 6.5 L4.5 7 L4 9 L3.5 7 L2 6.5 L3.5 6 Z" fill="#60A5FA" opacity="0.4" />
    </svg>
  );
}

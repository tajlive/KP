# Komponent: JokerButton

> **Fil:** `src/features/jokertrade/JokerButton.tsx` (ny)

---

**Hensikt:** Den primære CTA-en for JokerTrade. Stor, animert, umulig å overse. Pulserende gull-glød som signaliserer "trykk meg — AI-en er klar".

**Visuelt design:**
- Knapp: `rounded-2xl bg-kp-brand text-kp-bg-primary font-extrabold`
- Ikon: 🃏 foran teksten
- Størrelse: `px-10 py-5 text-lg` (stor, touch-vennlig)
- Glød: `shadow-[0_0_40px_rgba(245,158,11,0.3)]` med pulse-animasjon
- Border: `border-2 border-kp-brand-light/30` for ekstra definisjon

**Tilstander:**
- Default: Full opacity, pulserende glød
- Hover: scale(1.05), glød intensiveres, cursor pointer
- Active: scale(0.95), glød dimmes
- Loading: Spinner erstatter 🃏, tekst "Analyserer...", disabled
- Disabled: opacity-50, cursor not-allowed, ingen animasjon

**Responsiv:**
- Mobil (<768px): Full bredde
- Desktop (≥768px): max-w-sm, sentrert

**Props:**
```tsx
interface JokerButtonProps {
  onClick: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}
```

**Tailwind-klasser:**

```html
<button
  onClick={onClick}
  disabled={loading || disabled}
  className={`
    relative inline-flex items-center justify-center gap-3
    rounded-2xl border-2 border-kp-brand-light/30
    bg-kp-brand px-10 py-5
    text-kp-bg-primary font-extrabold text-lg
    shadow-[0_0_40px_rgba(245,158,11,0.3)]
    transition-all duration-300
    hover:scale-105 hover:shadow-[0_0_60px_rgba(245,158,11,0.4)]
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:scale-100 disabled:hover:shadow-[0_0_40px_rgba(245,158,11,0.3)]
    animate-glow-pulse
    w-full sm:max-w-sm
    ${className}
  `}
>
  {loading ? (
    <>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-kp-bg-primary border-t-transparent" />
      Analyserer...
    </>
  ) : (
    <>
      <span className="text-2xl">🃏</span>
      JOKER
    </>
  )}
</button>
```

**Keyframes (legg til i tailwind.config.mjs extend):**

```js
glowPulse: {
  '0%, 100%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.3)' },
  '50%': { boxShadow: '0 0 70px rgba(245, 158, 11, 0.5)' },
},
```

**Noter:**
- `animate-glow-pulse` = `glowPulse 2s ease-in-out infinite` (definert i design-tokens)
- Knappen skal være det mest iøynefallende elementet på siden
- Ikke bruk `animate-pulse` (for aggressivt) — custom glowPulse er mykere

# Assets.md — Font-lasting, bilder og illustrasjoner

> Generert av K3 MAX, 2026-07-27

---

## 1. Font-lasting — next/font/google

### Problem
Inter og Instrument Serif er definert som CSS-variabler men LASTES ALDRI. Nettleseren faller tilbake til systemfonter. Dette må fikses FØR noe annet design-arbeid.

### Løsning
Legg til i `src/app/layout.tsx`:

```tsx
import { Inter, Instrument_Serif } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${instrumentSerif.variable}`}>
      ...
    </html>
  );
}
```

### CSS-variabler (oppdater i kp-tokens-sanity.css:73-77)

```css
--kp-font-sans: var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--kp-font-serif: var(--font-instrument-serif), 'Instrument Serif', Georgia, serif;
```

### Verifisering
Etter deploy: Inspiser "Computed" font i DevTools. Skal vise "Inter" og "Instrument Serif", ikke systemfonter.

---

## 2. Hero-bakgrunn — Gradient mesh

**Behov:** En subtil, mørk gradient for hero-seksjonen som gir dybde uten å distrahere.

**Spesifikasjon:**
- Type: CSS radial gradient (ingen bildefil)
- Plassering: Øverste høyre hjørne, 60% dekning
- Farge: `rgba(0, 82, 255, 0.08)` → transparent
- CSS: `radial-gradient(ellipse at top right, rgba(0, 82, 255, 0.08), transparent 60%)`

**Ingen bildefil nødvendig** — bruk Tailwind arbitrary value.

---

## 3. Mode-illustrasjoner — SVG-ikoner

**Behov:** Tre distinkte illustrasjoner for Manuell, Auto, JokerTrade. Større enn emoji, mer profesjonelle.

**Spesifikasjon:**
- Format: Inline SVG (ingen eksterne filer)
- Størrelse: 48×48px viewBox, skalerer til 3rem (48px)
- Farger: Mode-spesifikk primærfarge (emerald/amber/violet)
- Stil: Enkel, linjebasert, 2px stroke, rounded caps

### Manuell (emerald #10B981)
- Ikon: En hånd som peker/trykker på et diagram
- Konsept: "Du styrer"

### Auto (amber #F59E0B)
- Ikon: En hånd + et tannhjul
- Konsept: "Du + AI"

### JokerTrade (violet #8B5CF6)
- Ikon: Et Joker-kort (🃏) i stilisert form
- Konsept: "AI gjør alt"

**Komponent:** `ModeIllustration.tsx`

```tsx
export function ModeIllustration({ mode, size = 48 }: { mode: "manual" | "auto" | "joker"; size?: number }) {
  const colors = {
    manual: "#10B981",
    auto: "#F59E0B",
    joker: "#8B5CF6",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={colors[mode]} strokeWidth="2" strokeLinecap="round">
      {/* SVG paths her — implementeres av utvikler */}
    </svg>
  );
}
```

---

## 4. Leaderboard-avatarer — Gravatar-style fallbacks

**Behov:** Små sirkulære avatarer for topp tradere (36×36px).

**Spesifikasjon:**
- Format: Generert på klientsiden (initial-basert, som Gravatar)
- Størrelse: 36×36px, border-radius: 50%
- Bakgrunn: `bg-brand-500/10` med forbokstav i `text-brand-500`
- Ingen eksterne bildefiler

```tsx
function TraderAvatar({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-kp-brand/10 flex items-center justify-center text-kp-brand font-bold text-sm">
      {initial}
    </div>
  );
}
```

---

## 5. Verifisert-badge — SVG-ikon

**Behov:** En liten "Verifisert trader"-badge ved siden av leaderboard-navn.

**Spesifikasjon:**
- Format: Inline SVG
- Størrelse: 16×16px
- Farge: `#0052FF` (brand blue)
- Visuelt: En sjekkmerke i en sirkel (✓)

```html
<svg width="16" height="16" viewBox="0 0 16 16" fill="#0052FF">
  <circle cx="8" cy="8" r="7" fill="rgba(0,82,255,0.1)" />
  <path d="M5 8l2 2 4-4" stroke="#0052FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</svg>
```

---

## 6. JokerTrade tom tilstand — Illustrasjon

**Behov:** Når brukeren er innlogget men ikke har noen handler — en vennlig illustrasjon.

**Spesifikasjon:**
- Type: CSS-only (emoji + tekst, ingen bildefil)
- Sentrert Joker-emoji: `text-6xl` 🃏
- Myk animasjon: `animate-float` (flyter opp/ned)
- Bakgrunn: `bg-gradient-to-b from-kp-brand/5 to-transparent rounded-2xl p-8`

---

## 7. Favicon og PWA-ikoner

Disse finnes allerede. Ikke endre. Bekreft at de fortsatt fungerer etter redesign.

---

## Oppsummering: Hva må til?

| # | Hva | Type | Pri |
|---|---|---|---|
| 1 | next/font/google i layout.tsx | Kodeendring | 🔴 Kritisk |
| 2 | Oppdater CSS-variabler for fonter | Kodeendring | 🔴 Kritisk |
| 3 | Hero gradient (CSS-only) | Ingen nye filer | 🟢 Lav |
| 4 | ModeIllustration SVG-komponent | Ny fil | 🟡 Medium |
| 5 | TraderAvatar (initial-basert) | Ny fil/utility | 🟡 Medium |
| 6 | Verifisert-badge SVG | Inline i SocialProof | 🟢 Lav |
| 7 | Tom tilstand JokerTrade (CSS-only) | Ingen nye filer | 🟢 Lav |

# Klarpakke Landing Page — Integrasjonsguide

## Forutsetninger
- Next.js App Router prosjekt (som du allerede har)
- Node.js + npm installert

---

## Steg 1: Installer fonter

Legg til Google Fonts i `src/app/layout.tsx`. Du kan enten bruke `next/font` (anbefalt) eller en `<link>`-tag.

### Alternativ A: next/font (best for performance)

```tsx
// src/app/layout.tsx
import { Outfit, JetBrains_Mono } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Deretter oppdater fontene i komponenten — bytt ut:
- `'Outfit', sans-serif` → `var(--font-outfit), sans-serif`
- `'JetBrains Mono', monospace` → `var(--font-mono), monospace`

### Alternativ B: CSS import (enklere, funker med en gang)

Fonter lastes allerede via `@import` i komponenten. Ingen endring nødvendig.
Men flytt `@import`-linjen til `src/app/globals.css` for bedre praksis:

```css
/* src/app/globals.css — legg til øverst */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
```

---

## Steg 2: Kopier komponenten

```bash
# Fra prosjektets rot:
cp klarpakke-landing.jsx src/components/landing/KlarpakkeLanding.tsx
```

> Rename fra `.jsx` til `.tsx` for TypeScript-støtte.
> Komponenten bruker kun standard React (useState, useEffect, useRef, useMemo) — ingen eksterne dependencies.

---

## Steg 3: Oppdater hovedsiden

```tsx
// src/app/page.tsx
import KlarpakkeLanding from '@/components/landing/KlarpakkeLanding'

export default function Home() {
  return <KlarpakkeLanding />
}
```

Fjern eller kommenter ut den gamle `LandingPage`-importen.

---

## Steg 4: Rydd opp i globals.css

Den nye landingen har dark background (`#080b14`), så fjern eventuell
hvit bakgrunn eller motstridende stiler fra `globals.css`:

```css
/* src/app/globals.css */

/* FJERN eller kommenter ut ting som: */
/* body { background: white; color: black; } */

/* BEHOLD disse fra eksisterende oppsett: */
html {
  overflow-x: hidden;
}

*, *::before, *::after {
  box-sizing: border-box;
}
```

---

## Steg 5: Verifiser lokalt

```bash
npm run dev
```

Åpne `http://localhost:3000` og sjekk:
- [ ] Dark bakgrunn vises
- [ ] Candlestick-chart animerer i hero
- [ ] Ticker-bar scroller
- [ ] Terminal-demo bytter mellom risikonivåer
- [ ] Responsivt: test med DevTools i mobilvisning (375px bredde)
- [ ] Alle lenker peker riktig (`/registrering`, `/innlogging`, etc.)

---

## Steg 6: TypeScript-fix (om nødvendig)

Hvis du får TS-feil, legg til typedefinisjoner øverst i filen:

```tsx
// Legg til øverst i KlarpakkeLanding.tsx hvis TS klager:

interface MiniChartProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

interface StrategyCardProps {
  name: string
  description: string
  winRate: number
  chartData: number[]
  color: string
}
```

Og oppdater funksjonssignaturene:
```tsx
function MiniChart({ data, color, width = 200, height = 60 }: MiniChartProps) {
function StrategyCard({ name, description, winRate, chartData, color }: StrategyCardProps) {
```

---

## Steg 7: Deploy

```bash
npm run build    # Verifiser at build passerer
npm run deploy   # Ditt eksisterende deploy-script
```

---

## Filstruktur etter integrering

```
src/
├── app/
│   ├── layout.tsx          ← fonts (Steg 1)
│   ├── globals.css         ← ryddet opp (Steg 4)
│   └── page.tsx            ← importerer KlarpakkeLanding (Steg 3)
├── components/
│   └── landing/
│       ├── KlarpakkeLanding.tsx   ← NY FIL (Steg 2)
│       ├── Hero.tsx               ← kan slettes etterpå
│       ├── Navigation.tsx         ← kan slettes etterpå
│       └── ...                    ← gamle komponenter
```

---

## Neste steg / forbedringer

Ting du kan vurdere etter at landingen er live:

1. **Bytt ticker-data til live CoinGecko** — du har allerede API-integrasjonen
2. **A/B-test headline** — "Tren på kryptotrading uten risiko" vs noe annet
3. **Legg til video-demo** — en 30-sek screen recording av paper trading
4. **Scroll-animasjoner** — bruk `framer-motion` for fade-in på seksjoner
5. **Analytics** — koble opp GA4 event tracking på CTA-knappene

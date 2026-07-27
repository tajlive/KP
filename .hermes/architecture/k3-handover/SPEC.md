# Klarpakke 2026 — Arkitekturspesifikasjon for Redesign

> **Rolle:** Hovedarkitekt (K3 MAX, reasoning_effort=max, temperature=1)
> **Input:** `.hermes/architecture/k3-handover/BRIEF.md`
> **Dato:** 2026-07-27

---

## Arkitektoniske valg

### 1. Aspirerende, ikke advarende

Problemet: "Jeg tapte 64 000 kr" skremmer. Løsning: **Vis hva som er mulig.** Tallet harmoniseres til 65 000 kr i alle tekster (messages/no.json:20 vinner over :2187 — story-seksjonen er mer synlig og brukes oftere).

Ny hero: "Din personlige AI-trader. Våre beste brukere er opp 343%." Tallbasert, positivt, beviselig.

### 2. Tre moduser — ett visuelt språk

Hver modus får et distinkt farge-tema som følger dem overalt:

| Modus | Primærfarge | Gradient | Ikon |
|---|---|---|---|
| Manuell | Emerald `#10B981` | `from-emerald-950/40 to-emerald-900/20` | 🖐️ |
| Auto | Amber `#F59E0B` | `from-amber-950/40 to-amber-900/20` | 🤖 |
| JokerTrade | Violet `#8B5CF6` | `from-violet-950/40 to-violet-900/20` | 🎭 |

### 3. Token-hierarki: CSS-first

Tailwind v4 `@theme` er kilden. Alle nye tokens defineres i `kp-tokens-sanity.css`. `design-tokens.json` er en maskinlesbar kopi.

### 4. Dark-first, premium-feel

Bakgrunn: `#0A0B0D` (dyp natt). Overflater: `#111318` (kort), `#16181D` (elevated). Border: `#2A2D35`. All tekst: `#F9FAFB` (primær), `#9CA3AF` (sekundær), `#6B7280` (muted).

Gold (`#F59E0B`) reserveres til: CTA-knapper, P&L-positive tall, premium-merker, "aktiv" tilstand.
Blue (`#0052FF`) reserveres til: Linker, info-merker, AI/bot-indikatorer.

**⚠️ Gold/Amber-konflikt:** Auto-modusens identitetsfarge er amber `#F59E0B` — samme hex som gold. For å unngå semantisk utvanning: Auto-kortet bruker `#F59E0B` som border/accent (deler farge med CTA), men CTA-knapper legger til `shadow-lg shadow-kp-brand/20` som gir en glow Auto-kortet IKKE har. Forskjellen er at CTA-er har glow + fast bakgrunn, mens Auto-kortet har transparent bakgrunn med amber-border. To elementer kan dele hex uten å forvirre hvis de har ulik visuell vekt.

---

## Komponent-arkitektur

```
src/components/landing/
├── HeroSection.tsx          ← Ny: aspirerende hero med ekte data
├── TradingModesExplainer.tsx ← Ny: tre visuelle kort med farge-tema
├── LivePriceTicker.tsx      ← Ny: ekte live priser med fallback
├── SocialProof.tsx           ← Ny: ekte leaderboard-data
└── ModeIllustration.tsx      ← Ny: SVG-illustrasjoner per modus

src/features/jokertrade/
├── JokerTradeLanding.tsx     ← Redesign: landing + dashboard i ett
├── JokerTradeClient.tsx      ← Redesign: tre tilstander
├── PositionCard.tsx          ← Ny: posisjonskort med agent-stemmer
├── AgentVotes.tsx            ← Ny: 12 agenters stemme-visualisering
├── JokerButton.tsx           ← Ny: animert CTA-knapp
└── TradeHistory.tsx          ← Behold: fungerer, kun visuelle tweaks
```

---

## Side-arkitektur

### Hjemmeside (`/`) — scroll-rekkefølge

1. **Hero** (viewport-høyde) — verdiforslag, to CTA-er, pris-ticker
2. **Hvordan fungerer det** — 3 steg: Koble til → AI analyserer → Tjen penger
3. **TradingModesExplainer** — tre mode-kort med distinkte farger
4. **SocialProof** — leaderboard topp 3 med ekte data
5. **CTA Footer** — "Start gratis" + "Se JokerTrade"

### JokerTrade (`/jokertrade`) — én side, tre tilstander

Tilstand A (ikke innlogget):
```
┌────────────────────────────────────────┐
│  🎭 JokerTrade                         │
│  Din personlige AI-trader              │
│                                         │
│  📊 100 000 kr i lekepenger            │
│  🤖 12 AI-agenter handler for deg      │
│  ⏱️ 30 sekunder å sette opp            │
│                                         │
│  [🚀 Start gratis — 30 sekunder]        │
│                                         │
│  Live priser: BTC $XX,XXX | ETH $X,XXX │
└────────────────────────────────────────┘
```

Tilstand B (innlogget, ingen handler):
```
┌────────────────────────────────────────┐
│  🎭 Velkommen til JokerTrade!          │
│                                         │
│  Din AI-trader er klar. Trykk på        │
│  JOKER-knappen så finner AI-en den      │
│  beste trade-opportuniteten.            │
│                                         │
│         ┌─────────────┐                 │
│         │   🃏 JOKER   │  ← pulserende  │
│         │  Start AI    │    gull-glød   │
│         └─────────────┘                 │
│                                         │
│  ✅ 12 agenter analyserer markedet      │
│  ✅ AI velger beste trade               │
│  ✅ Handler med lekepenger — null risiko│
└────────────────────────────────────────┘
```

Tilstand C (innlogget, har handler):
```
┌────────────────────────────────────────┐
│  🎭 JokerTrade  ● Aktiv    Sist: 2 min │
│  ─────────────────────────────────────  │
│                                         │
│  📊 P&L: +1 247 kr (+14.3%)  ▲         │
│                                         │
│  Åpne posisjoner:                       │
│  ┌─────────────────────────────────┐    │
│  │ SOLUSDT  3.5 SOL @ $142.75      │    │
│  │ P&L: +$12.40 (+2.4%)  ▲         │    │
│  │ 8/12 agenter BUY → Hvorfor?  ▼  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ETHUSDT  0.25 ETH @ $2,018.30   │    │
│  │ P&L: -$3.20 (-0.6%)  ▼          │    │
│  │ 7/12 agenter BUY → Hvorfor?  ▼  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  🧠 AI-innsikt:                         │
│  "8 av 12 agenter stemte BUY på SOL     │
│   — Solana Firedancer upgrade +         │
│   2 whale-akkumuleringer"               │
│                                         │
│  [🃏 Kjør ny analyse]                   │
└────────────────────────────────────────┘
```

---

## Auth-flyt for JokerTrade-tilstander

Bruk `useAuth()` hook fra `@/hooks/useAuth` (re-eksporterer `@/lib/auth/new/AuthContext`). Den returnerer `{ user, loading }`.

```
useAuth() → { user, loading }
  │
  ├─ loading === true → Spinner
  ├─ user === null   → Tilstand A (ikke innlogget)
  ├─ user && !hasTrades → Tilstand B (velkommen)
  └─ user && hasTrades  → Tilstand C (dashboard)
```

`hasTrades` = `data.history.length > 0 || data.positions.length > 0` (fra GET `/api/jokertrade`)

---

## i18n — Fire locales

Alle nye tekstnøkler legges i `messages/no.json` under `"jokertrade"` og `"landing"` namespaces. De tre andre locale-filene (`en.json`, `th.json`, `zh.json`) får engelsk fallback inntil oversettelse er klar.

Nøkkel-navnekonvensjon: `namespace.component.element` — f.eks. `jokertrade.hero.title`.

---

## Font-lasting — next/font

Inter og Instrument Serif lastes via `next/font/google` i `src/app/layout.tsx`:

```tsx
import { Inter, Instrument_Serif } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400", "400"],
  variable: "--font-instrument-serif",
  display: "swap",
});
```

CSS-variablene `--kp-font-sans` og `--kp-font-serif` i `kp-tokens-sanity.css` oppdateres til å peke på next/font-variablene.

---

## Datakilder for SocialProof

Leaderboard-data hentes fra `/api/leaderboard` (eksisterende) som returnerer topp 10 tradere med:
- `email` (anonymisert: `t***@gmail.com`)
- `pct_return` (avkastning i %)
- `win_rate` (win-rate i %)
- `total_trades` (antall handler)
- `verified` (boolean — "Verifisert trader"-badge)

Vis kun topp 3 på hjemmesiden, topp 10 på `/leaderboard`.

---

## Pris-ticker — cache-strategi

CoinGecko rate-limit: 30 calls/min (gratis tier). Cache i 30 sekunder server-side via `unstable_cache` eller `cache()` i Next.js. Fallback: vis siste kjente pris med "●" (stale indicator) i stedet for "●" (live).

```tsx
// PriceTicker.tsx — cache-strategi
const CACHE_DURATION = 30_000; // 30 sekunder
const FALLBACK_PRICES = {
  BTC: null, // null = vis "last known" i stedet for fast verdi
  ETH: null,
  SOL: null,
};
```

---

## Hardkodede hex-verdier → tokens

Følgende i globals.css skal migreres:

| Linje | Nåværende | Nytt token |
|---|---|---|
| ~800 | `border-[#2A2D35]` | `border-kp-border` |
| ~810 | `bg-[#F59E0B]` | `bg-kp-brand` eller `bg-kp-warning` |
| ~821 | `text-[#F59E0B]` | `text-kp-brand` |
| ~815 | `bg-[#111318]` | `bg-kp-bg-card` |
| Alle | `text-[#F9FAFB]` | `text-kp-text-primary` |
| Alle | `text-[#9CA3AF]` | `text-kp-text-secondary` |
| Alle | `text-[#6B7280]` | `text-kp-text-muted` |

---

## Responsiv strategi

| Breakpoint | Bredde | Atferd |
|---|---|---|
| Mobil | 375-767px | Stablet, full bredde, store touch-mål (min 44px) |
| Nettbrett | 768-1023px | 2-kolonne der naturlig, fortsatt touch-vennlig |
| Desktop | 1024-1439px | Side-om-side layouts, mer data per visning |
| Bred | 1440px+ | Maksbredde 1280px sentrert, luftig spacing |

Alle komponenter er mobil-først. Desktop er en progression, ikke en egen layout.

---

## Token-tildeling: Gold vs Blue

| Kontekst | Farge | Eksempel |
|---|---|---|
| Primær CTA | `#F59E0B` (gold) | "Start gratis", JOKER-knapp |
| Sekundær CTA | `#2A2D35` border + hvit tekst | "Se hvordan det fungerer" |
| AI/Bot-indikator | `#0052FF` (blue) | Agent-status, AI-analyse |
| Positiv P&L | `#22C55E` (green) | Gevinst, opp-pil |
| Negativ P&L | `#EF4444` (red) | Tap, ned-pil |
| Premium-merke | `#F59E0B` (gold) | "Professor", "Verifisert" |
| Info/Link | `#0052FF` (blue) | "Hvorfor?", "Les mer" |

# K3 Arkitekt-Overlevering — Klarpakke Design 2026

> **Til K3:** Du er hovedarkitekt for Klarpakke (klarpakke.no). Dette dokumentet inneholder alt du trenger for å overta designansvaret. Les alt, tenk grundig (reasoning_effort=max), og produser en fullstendig arkitekturspesifikasjon.

---

## 1. HVA ER KLARPAKKE?

Klarpakke er en norsk krypto-trading plattform. Tre hovedting:

1. **Paper trading** — 100 000 kr i lekepenger, null risiko
2. **AI-trading** — CryptoPilot: 12 AI-agenter som stemmer over handler
3. **Tre moduser** — Manuell (du styrer), Auto (du+AI), JokerTrade (AI styrer alt)

**Målgruppe:** Nordmenn som aldri har tradet før. De er redde for å tape penger. De vil at noen andre skal gjøre jobben.

**URL:** https://www.klarpakke.no (norsk) og https://www.klarpakke.no/en (engelsk)

---

## 2. DESIGN SYSTEM

### 2.0 VIKTIG — Tailwind v4 CSS-first arkitektur

Prosjektet bruker tailwindcss ^4.2.4 (CSS-first, IKKE v3). Token-systemet har 4 lag:

1. `src/styles/kp-tokens-sanity.css` — kanoniske design tokens (importeres i globals.css)
2. `@theme`-blokk i `src/app/globals.css` — overstyrer farger/spacing
3. `tailwind.config.mjs` — legacy JS-config, lastes via `@config "../../tailwind.config.mjs"` (globals.css linje 1). Innholdet er vist i 2.1
4. `src/styles/kp-components.css` — ferdige komponent-klasser som SKAL gjenbrukes, ikke redefineres

Krav til design-tokens.json: Lever tokens CSS-first (@theme + CSS-variabler i kp-tokens-sanity.css-stil). Ikke foreslå JS-config-endringer som bryter med @theme.

### 2.1 Tailwind Config (full)

```js
// tailwind.config.mjs
colors: {
  kp: {
    'bg-primary': 'var(--kp-bg-primary)',
    'bg-secondary': 'var(--kp-bg-secondary)',
    'bg-tertiary': 'var(--kp-bg-tertiary)',
    'bg-elevated': 'var(--kp-bg-elevated)',
    'bg-card': 'var(--kp-bg-card)',
    'bg-hover': 'var(--kp-bg-hover)',
    'bg-active': 'var(--kp-bg-active)',
    'text-primary': 'var(--kp-text-primary)',
    'text-secondary': 'var(--kp-text-secondary)',
    'text-tertiary': 'var(--kp-text-tertiary)',
    'text-muted': 'var(--kp-text-muted)',
    'border': 'var(--kp-border)',
    'border-light': 'var(--kp-border-light)',
    'border-dark': 'var(--kp-border-dark)',
    'border-brand': 'var(--kp-border-brand)',
    'brand': 'var(--kp-brand)',         // Primary CTA farge
    'brand-light': 'var(--kp-brand-light)',
    'brand-dark': 'var(--kp-brand-dark)',
    'brand-hover': 'var(--kp-brand-hover)',
    'brand-glow': 'var(--kp-brand-glow)',
    'brand-subtle': 'var(--kp-brand-subtle)',
    'surface': 'var(--kp-surface)',
    'surface-elevated': 'var(--kp-surface-elevated)',
    'surface-highlight': 'var(--kp-surface-highlight)',
    'input-bg': 'var(--kp-input-bg)',
    'input-border': 'var(--kp-input-border)',
    'input-border-focus': 'var(--kp-input-border-focus)',
    'input-text': 'var(--kp-input-text)',
    'input-placeholder': 'var(--kp-input-placeholder)',
    'success': 'var(--kp-success)',
    'success-bg': 'var(--kp-success-bg)',
    'warning': 'var(--kp-warning)',
    'warning-bg': 'var(--kp-warning-bg)',
    'danger': 'var(--kp-danger)',
    'danger-bg': 'var(--kp-danger-bg)',
    'nav-bg': 'var(--kp-nav-bg)',
    'nav-text': 'var(--kp-nav-text)',
    'nav-text-muted': 'var(--kp-nav-text-muted)',
  },
  brand: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#0052FF', 600: '#0047E0', 700: '#0039c7',
    800: '#002fa3', 900: '#002680',
  },
}
```

### 2.2 Design Tokens (CSS-variabler)

Primærfarge: `#0052FF` (blå)
Sekundær/accent: `#F59E0B` (gull/amber — brukes for premium/CTA)
Suksess: `#22c55e`
Advarsel: `#f59e0b`
Feil: `#ef4444`

**Tema:** Mørkt (dark mode default). Bakgrunn ≈ `#0B0F19` → `#0A0B0D`. Kort ≈ `#111318`. Border ≈ `#2A2D35`.

### 2.3 Typografi

```js
fontFamily: {
  sans: 'Inter, -apple-system, sans-serif',
  serif: 'Instrument Serif, Georgia, serif',
  display: 'Instrument Serif, Georgia, serif',
}
fontSize: {
  'display': '4rem',        // Hero headings
  'display-sm': '3rem',
  'heading': '2.5rem',
  'heading-sm': '2rem',
  'title': '1.5rem',
  'title-sm': '1.25rem',
  'body': '1.125rem',
  'body-sm': '1rem',
}
```

### 2.4 Border Radius

```js
'button': '12px', 'card': '16px', 'card-lg': '20px',
'card-xl': '24px', 'badge': '9999px', 'input': '10px',
```

### 2.5 Shadows

```js
'glass': '0 4px 30px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
'glow-brand': '0 0 40px rgba(0,82,255,0.3)'
'glow-success': '0 0 30px rgba(16,185,129,0.25)'
'floating': '0 20px 50px rgba(0,0,0,0.3)'
```

### 2.6 Animasjoner (definert i Tailwind)

- `animate-fade-up`: opacity 0→1 + translateY 20px→0 (0.5s)
- `animate-fade-in`: opacity 0→1 (0.3s)
- `animate-slide-up`: opacity 0→1 + translateY 10px→0 (0.4s)
- `animate-pulse-soft`: opacity pulse (2s)
- `animate-shimmer`: background-position sweep (2s)
- `animate-float`: translateY -10px bounce (6s)

### 2.7 Status-farger (trading)

- Bullish/opp: `#22c55e` (grønn)
- Bearish/ned: `#ef4444` (rød)
- Nøytral: `#f59e0b` (gul/amber)
- Signal pending: `#fef3c7` bg, `#92400e` text
- Signal approved: `#dcfce7` bg, `#166534` text
- Signal rejected: `#fee2e2` bg, `#991b1b` text

---

## 3. NÅVÆRENDE DESIGN — PROBLEMER SOM MÅ FIKSE

### 3.1 Hero/Hjemmeside (`src/app/[locale]/page.tsx`)

**Fil:** `src/components/landing/HeroSection.tsx` + `HeroSection.module.css`

**Nåværende tilstand:**
```
┌──────────────────────────────────────┐
│  "Jeg tapte 64 000 kr på krypto.    │
│   Du trenger ikke gjøre det samme."  │
│                                      │
│  100 000 kr | Live kurser | 0 kr    │
│  [Start gratis] [Les min historie]  │
│                                      │
│        (telefon-mockup)              │
└──────────────────────────────────────┘
```

**Problemer:**
1. "Jeg tapte 64 000 kr" er negativt — skremmer bort nye brukere
2. Hero er tekst-tung, lite visuelt
3. Mangler tydelig verdiforslag på 3 sekunder
4. Telefon-mockup er statisk, viser ikke live data
5. Ingen umiddelbar CTA som konverterer

### 3.2 TradingModesExplainer (`src/components/landing/TradingModesExplainer.tsx`)

Nettopp lagt til under Hero. Viser tre kort: Manuell, Auto, JokerTrade.

**Problemer:**
1. For mye tekst — brukere scroller forbi
2. Kortene mangler visuell distinksjon
3. "En konto" konseptet er ikke visuelt tydelig nok
4. Mangler illustrasjoner/ikoner som umiddelbart kommuniserer forskjellen

### 3.3 JokerTrade-siden (`src/app/[locale]/(social)/jokertrade/page.tsx`)

**Fil:** `src/features/jokertrade/JokerTradeLanding.tsx` + `JokerTradeClient.tsx`

**Problemer:**
1. Landing-delen er separat fra trading-dashboard — brukere må scrolle langt
2. Hero-seksjonen har for mye "marketing" og for lite "her er hva du får"
3. Leaderboard-DATA inneholder AI-genererte navn. Dette ligger i seed-data/databasen — IKKE i koden (LeaderboardWidget.tsx og LeaderboardPreview.tsx henter dynamisk fra /api/leaderboard). Dette er et backend/data-problem som fikses utenfor K3s oppdrag. K3 skal kun designe visningen (layout, anonymisering, "verifisert bruker"-badge e.l.)
4. Testimonials er markert som "AI-generert for demonstrasjonsformål"
5. PriceTicker.tsx henter allerede LIVE priser fra CoinGecko hvert 30. sekund (linje 57–70) — ikke et designproblem. Merk i stedet: CoinGecko har rate limits; spec-en bør inkludere cache/fallback-strategi for ticker-data

### 3.4 Dashboard (`src/app/[locale]/(user)/dashboard/page.tsx`)

Flere adaptive views (AdaptiveDashboard, DashboardPro). 

**Problemer:**
1. For mange visninger — forvirrende for nye brukere
2. P&L visning er ikke umiddelbart forståelig
3. Fargebruk for gevinst/tap er inkonsistent

---

## 4. KONKURRENT-REFERANSER

Design-referanser brukeren liker (Revolut/OKX-inspirert, mørkt, premium):

| Plattform | Styrke | Hva vi kan ta |
|---|---|---|
| **Revolut** | Enkelhet, hvit tekst på mørk, store tall | P&L-visning, kontobalanse |
| **OKX** | Mørkt pro-tema, data-tett men luftig | Trading dashboard layout |
| **Binance** | Fargekoding, mobil-first | Mobil trading-visning |
| **Kraken** | Ryddig, lite visuell støy | Nybegynnervennlig navigasjon |
| **Phantom** | Lekent, fargerikt, enkelt | Onboarding-flyt |

---

## 5. K3 SITT OPPDRAG

### Primæroppdrag: Redesign hjemmeside + JokerTrade

**Mål:** Gjør Klarpakke til den mest innbydende krypto-plattformen for nybegynnere i Norge. Designet skal si "dette er trygt, enkelt, og du kommer til å tjene penger" på 3 sekunder.

**Side 1: Hjemmeside (`/`)**

Krav:
1. **Hero**: Erstatin nåværende "Jeg tapte 64 000 kr" med noe positivt og aspirerende. Vis ekte verdi på 3 sek. Eksempel: "Din personlige AI-trader. Skaffet +343% for våre beste brukere." ⚠️ **PRE-LAUNCH VERIFICATION GATE:** Før dette tallet publiseres MÅ implementatør kjøre `SELECT pct_return FROM leaderboard ORDER BY pct_return DESC LIMIT 1` mot produksjonsdatabasen og bruke DET faktiske tallet. IKKE hardkod "+343%" uten verifisering — dette er nøyaktig den "fake data"-synden briefen kritiserte.
2. **TradingModesExplainer**: Visuell forklaring av 3 moduser. Store ikoner, lite tekst. Én setning per modus. "En konto — tre måter å trade på" som konsept.
3. **Social proof**: Ekte resultater fra leaderboard (ikke AI-genererte navn). Vis faktiske avkastningstall.
4. **CTA**: Én tydelig hoved-CTA: "Start gratis →" (går til registrering) og én sekundær: "Se hvordan det fungerer →" (går til JokerTrade)
5. **Mobil**: Alt må være like tydelig på 375px bredde
6. **Harmonisering av brand-tall:** Hero sier "64 000 kr" (messages/no.json:2187), story-seksjonen sier "65 000 kr" (messages/no.json:20). Velg ETT tall og bruk det konsistent i alle nye tekster

**Side 2: JokerTrade (`/jokertrade`)**

Krav:
1. **Én sammenhengende side**: Landing + dashboard i én visning. Ingen scrolling mellom "forklaring" og "handling".
2. **Tre tilstander**: 
   - IKKE INNLOGGET: "Start med 100 000 kr i lekepenger — 30 sekunder" + registreringsknapp
   - INNLOGGET, INGEN HANDLER: JOKER-knapp (stor, animert, umulig å gå glipp av) + "Trykk for å la AI-en handle"
   - INNLOGGET, HAR HANDLER: Dashboard med posisjoner, P&L, AI-innsikt
3. **Posisjonskort**: Vis åpne posisjoner med tydelig P&L (grønn/rød), hvilke agenter som stemte, og en "Hvorfor?" utvidbar seksjon
4. **AI-innsikt**: Siste analyse — "8 av 12 agenter stemte BUY på SOL" med agent-stemmer visualisert

### Sekundæroppdrag: Design-tokens og komponentbibliotek

1. **Fargepalett-refinering**: Bestem nøyaktig når `#F59E0B` (gull) brukes vs `#0052FF` (blå)
2. **Komponent-spesifikasjoner**: Definer standard padding, border-radius, og shadow for: Card, Button (primary, secondary, ghost), Badge, Input, Modal
3. **Responsive breakpoints**: Definer standard oppførsel for 375px, 768px, 1024px, 1440px

---

## 6. K3 OUTPUT-KRAV

Produser følgende filer i én kjøring:

```
.hermes/architecture/k3-handover/
├── SPEC.md                    ← Hovedspesifikasjon
├── design-tokens.json         ← Endelige tokens i JSON
├── pages/
│   ├── homepage.md            ← Full side-spesifikasjon
│   └── jokertrade.md          ← Full side-spesifikasjon
├── components/
│   ├── hero-section.md        ← Ny hero-komponent
│   ├── mode-selector.md       ← TradingModesExplainer v2
│   ├── position-card.md       ← Posisjonskort for dashboard
│   ├── agent-votes.md         ← AI-agent stemme-visualisering
│   └── joker-button.md        ← JOKER CTA-knapp
└── assets.md                  ← Bilde/illustrasjonsbehov
```

### Hver komponent-spesifikasjon må inneholde:

```markdown
# Komponentnavn

**Hensikt:** Én setning

**Visuelt design:**
- Bakgrunn: ...
- Border: ...
- Padding: ...
- Typografi: ...

**Tilstander:**
- Default: ...
- Hover: ...
- Active: ...
- Loading: ... (hvis relevant)
- Empty: ... (hvis relevant)
- Error: ... (hvis relevant)

**Responsiv:**
- Mobil (<768px): ...
- Desktop (≥768px): ...

**Props:**
- `propName`: type — beskrivelse

**Tailwind-klasser:**
```html
<div className="...">...</div>
```

**Animering:**
- Hvilken animasjon, varighet, easing
```

---

## 7. TEKNISKE BEGRENSNINGER

1. **Kun Tailwind CSS** — ingen CSS modules (unntatt spesielle tilfeller)
2. **Next.js 16 App Router** — `"use client"` for interaktive komponenter
3. **next-intl** for i18n — alle tekster via `useTranslations()`. Ikke hardkod norsk tekst.
4. **Framer Motion** tilgjengelig for avanserte animasjoner
5. **next/image** for bilder — alltid med eksplisitt width/height
6. **Inter** og **Instrument Serif** er definert som CSS-variabler (`--kp-font-sans`/`--kp-font-serif` i kp-tokens-sanity.css:73–77), men LASTES ALDRI — det finnes ingen @font-face, next/font eller Google Fonts-lenke i koden. Nettleseren faller i dag stille tilbake til systemfonter. K3 må spesifisere font-lasting (foreslå next/font/local med woff2-filer i public/fonts/) som en del av assets.md
7. **Ingen bilder fra eksterne CDN-er** — alt må være lokalt eller via `public/`
8. **Supabase-auth** — JokerTrade-tilstandene (ikke innlogget / innlogget uten handler / innlogget med handler) detekteres via Supabase-session. Spesifiser hvilken auth-hook som brukes
9. **Fire locales** — messages/ inneholder no, en, th og zh. Alle nye tekstnøkler må legges i alle fire filer (eller definer eksplisitt fallback-policy)

---

## 8. SUKSESSKRITERIER

Etter implementasjon skal:
- [ ] Hjemmesiden kommunisere verdiforslaget på <3 sekunder
- [ ] Brukere forstår forskjellen på Manuell/Auto/JokerTrade uten å lese tekst
- [ ] JokerTrade-siden konverterer "se på" → "trykk JOKER" → "se handler"
- [ ] Alle farger er konsistente — ingen hardkodede hex-verdier utenom tokens
- [ ] Mobilvisning er like tydelig som desktop
- [ ] P&L-visning er umiddelbart forståelig (grønn opp, rød ned)
- [ ] Eksisterende hardkodede hex-verdier i globals.css (f.eks. linje 800–821: border-[#2A2D35], bg-[#F59E0B] i @apply) er migrert til tokens

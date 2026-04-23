# ADR: UI Arkitekturvurdering — Er vi verdensledende?

**Dato:** 2026-04-23  
**Arkitekt:** KIMI (hovedarkitekt)  
**Research:** Perplexity Pro + MemPalace v3.1  
**Scope:** Hele frontend-kodebase (src/components, src/shared/ui, src/features, src/app)

---

## Konklusjon først (TL;DR)

**Nei. Vi er ikke verdensledende. Vi er et solidt norsk fintech-produkt med en god mobil modernisering v1, men vi har ~25 "gjetagende komponenter" som undergraver tillit, tilgjengelighet og vedlikeholdbarhet.**

Skala:
- 🟢 **Mobil modernisering v1** — 2026-kompatibel, deterministisk, bra
- 🟡 **Design tokens** — eksisterer men håndheves ikke
- 🔴 **Landing page** — dupliserte meta-tags, hardkodet norsk, manglende a11y
- 🔴 **Kjerne-dashboards** — 1000+ linjes komponenter som blander business logic med JSX
- 🔴 **Error handling** — 3 dupliserte ErrorBoundary, ukjent light-mode fallback i dark app

---

## Hva er "verdensledende" i 2026?

Basert på Perplexity Pro-research av 50+ kilder (fintech UX 2026, crypto trading platforms, WCAG 2.1 AA, PWA 2.0, edge runtime, design tokens):

| Dimensjon | 2026-standard | Vi har? |
|---|---|---|
| **Tillit gjennom klarhet** | Hver pixel er ansvarlig. Ingen visuell støy. | 🟡 Delvis |
| **Data-tetthet** | Professional trading terminal-density, ikke sosialapp | 🔴 Nei |
| **Mobil-first** | 60%+ av crypto-volum er mobile. Touch-first, ikke responsive-shrink. | 🟢 Ja (v1) |
| **Design tokens** | 3-tier (primitive → semantic → component). Automatisk deploy. Kontrast validert. | 🟡 Delvis |
| **WCAG 2.1 AA** | Lovpålagt fra april 2026 (USA). EU følger. | 🔴 Nei |
| **PWA 2.0 + Edge** | Sub-10ms data via edge-native, WebStreams API, offline-sync | 🔴 Nei |
| **Deterministisk rendering** | Samme state = samme UI. Memoized selectors. Eksplisitt state. | 🟡 Delvis |
| **Biometrisk auth** | Passiv liveness detection, native Face ID/fingerprint | 🔴 Nei |
| **Progressive disclosure** | Skjul avansert for nybegynnere. Risiko-basert onboarding. | 🟡 Delvis |
| **WebGL visualisering** | GPU-renderede charts for real-time data uten jank | 🔴 Nei |
| **Haptisk feedback** | iOS webkit + Android vibrate, patterns for success/warning/error | 🟢 Ja |

---

## De 5 verste "gjetagende komponentene"

### 1. 🔴 `PortfolioDashboard.tsx` — 1000+ linjer med gjetting

**Fil:** `src/features/dashboard/PortfolioDashboard.tsx`

```tsx
// Problemer:
const priceForSymbol = /* gjetter symbol-mapping med heuristikk */
  sym.length <= 4 && !sym.includes("USDT") ? `USDT` : ...;

// Hardkodet hex i stedet for tokens:
// #E2E5EC, #F8FAFF, #1A1D26, #5E6478, #0052FF, #16A34A, #DC2626...

// Trade interface med eksplisitt escape hatch:
interface Trade { [key: string]: unknown }
```

**Hvorfor dette er gjetting:**
- Komponenten *antar* at alle symboler følger et mønster (≤4 chars = ikke-USDT). Dette knekker på `BTCUSDT`, `ETHUSDT`, `SOLUSDT`.
- P&L-kalkulasjoner gjøres inline i JSX i stedet for i en selector/hook.
- 1000+ linjer betyr at ingen fullt ut forstår hva den gjør. Endringer er høyrisiko.

**Fix:** Splitt til `usePortfolioSelectors()` + `PortfolioPresentation`. Flytt farger til tokens. Fjern `unknown`-escape.

---

### 2. 🔴 `UnifiedTradingDashboard.tsx` — `unknown` props = blind gjetting

**Fil:** `src/features/trading/UnifiedTradingDashboard.tsx`

```tsx
// Props er bevisst utypet:
initialPortfolio?: unknown
initialTrades?: unknown[]
initialStrategies?: unknown[]

// Tvinger unsafe casts gjennom hele filen:
const portfolio = initialPortfolio as Portfolio
```

**Hvorfor dette er gjetting:**
- Komponenten *gjetter* hva dataene inneholder. TypeScript kan ikke hjelpe. Runtime-feil er garantert.
- `localStorage` aksesseres uten `try/catch` — krasjer i Safari private mode.
- `import dynamic` ligger på linje 603, **etter** komponentkoden. Dette er ikke gyldig JS-modul-semantikk.

**Fix:** Definer eksplisitte interfaces. Flytt data-normalisering til API-lag. Fiks `dynamic import`.

---

### 3. 🔴 `ErrorBoundary` × 3 — 3 måter å feile på

**Filer:**
- `src/shared/error/ErrorBoundary.tsx`
- `src/shared/error/ErrorBoundaryNested.tsx`
- `src/shared/error/error-boundary.tsx`

**Hvorfor dette er gjetting:**
- 3 forskjellige implementasjoner betyr at feil oppfører seg ulikt avhengig av hvor de skjer.
- `window.location.reload()` uten `typeof window !== "undefined"` — krasjer i SSR/Edge.
- `error-boundary.tsx` bruker **light-mode farger** (`bg-slate-50`, `bg-white`, `text-slate-900`) i en app som er 100% dark mode. Brukeren ser en blindende hvit feilskjerm midt i natten.

**Fix:** Én ErrorBoundary. Én fargeprofil. Guard på `typeof window`. Bruk design tokens.

---

### 4. 🔴 `ConnectBinanceModal` — i18n-svindel

**Fil:** `src/shared/ui/modals/ConnectBinanceModal.tsx`

```tsx
// Importerer useTranslations men bruker den nesten ikke:
const t = useTranslations("trading");

// 90% av teksten er hardkodet engelsk:
<h2>Connect Binance Account</h2>
<p>Your security is our priority</p>
<p>Important</p>
<p>How to create your API key</p>
```

**Hvorfor dette er gjetting:**
- Komponenten *gjetter* at brukeren forstår engelsk. Primær-locale er norsk.
- Dette er en **tillitsbrudd** for en norsk fintech-app. Brukeren ser norsk overalt, plutselig engelsk i en modal om API-nøkler.

**Fix:** Alle strenger gjennom `useTranslations`. Ingen hardkodet tekst i UI-komponenter.

---

### 5. 🔴 Landing page — dupliserte meta-tags + hardkodet alt

**Filer:** `src/app/[locale]/layout.tsx` + `src/app/[locale]/page.tsx`

**Problemer:**
- To `<meta name="description">` i DOM (E2E smoke test feilet).
- `data-testid="backtest-calculator"` mangler (E2E smoke test feilet).
- 10+ filer med 100% hardkodet norsk: `ROISimulator.tsx`, `FeaturesBentoGrid.tsx`, `FAQSection.tsx`, `LandingBacktestTeaser.tsx`, `SocialProofSection.tsx`, `TrustStrip.tsx`, `DemoWidget.tsx`, `Footer.tsx`...
- Dekorative SVGer uten `aria-hidden="true"`.
- `<label>` uten `htmlFor`, `<select>` uten `id`.
- `framer-motion` uten `useReducedMotion` sjekk.

**Hvorfor dette er gjetting:**
- Vi *gjetter* at alle brukere er norske. Men `next-intl` støtter `en`.
- Vi *gjetter* at søkemotorer takler dupliserte meta-tags.
- Vi *gjetter* at skjermleserbrukere ikke bryr seg om uassosierte labels.

**Fix:** 100% i18n-dekning. Fiks meta-tag-duplikat. Legg til `aria-hidden` og `htmlFor`.

---

## Hva mobil modernisering v1 gjorde riktig

| Komponent | Vurdering |
|---|---|
| `useHaptic.ts` | 🟢 Eksplisitt pattern-mapping. iOS webkit + Android fallback. Deterministisk. |
| `SwipeAction.tsx` | 🟢 Eksplisitt state (`x`, `isOpen`). Spring physics. Touch-pan-y. |
| `usePullToRefresh.ts` | 🟢 80px threshold, resistance-formel, haptic på ready. |
| `MobileTradingCard` | 🟡 Bra info-tetthet. Svakhet: `symbol.slice(0,2)` knekker på SOL, `formatCurrency` hardkoder `en-US`. |
| `BottomTabs v2` | 🟢 Spring physics, layoutId, haptic, safe-area, 48px touch targets. |
| `PullToRefreshContainer` | 🟢 Overscroll-behavior contain. CSS media queries for hydration-safety. |

**Kritisk valg som reddet oss fra hydration mismatch:**
```tsx
// ✅ RIKTIG: CSS media queries, ikke useIsMobile()
<div className="md:hidden"><MobilePositionList /></div>
<div className="hidden md:block"><DesktopPositionList /></div>
```

---

## Design tokens: Eksisterer, men håndheves ikke

**Fil:** `src/lib/design/tokens.ts`

```ts
// Tier 1 (primitives) — OK
export const BRAND_COLOR = { DEFAULT: "#0052FF", ... }

// Tier 2 (semantic) — OK
export const SURFACE = {
  BG: "bg-[#0a0b0d]",  // ❌ Bruker arbitrary values, ikke CSS vars
  BORDER: "border-white/[0.08]",
}

// Tier 3 (component) — OK
export const CARD = {
  default: `${SURFACE.BG_CARD} ${RADIUS.card} ...`,
}
```

**Problemer:**
1. `SURFACE.BG` bruker `bg-[#0a0b0d]` (arbitrary Tailwind) i stedet for `var(--kp-bg)` eller `bg-kp-bg`. Dette blokkerer runtime theme-switching.
2. Ingen kontrast-ratio-validering. Ingen touch-target-minimum (44×44px) i tokens.
3. `BRAND.bachelor`, `BRAND.master`, `BRAND.phd`, `BRAND.professor` — akademiske grader som UI-tokens? Dette er business logic, ikke design.

**2026-standard:** Tokens skal være data, ikke hardkodet CSS-klasser. Automatisk deploy til CSS vars, Android XML, iOS Swift. Kontrast og touch-target innebygd.

---

## Dupliserte mønstre — utviklere gjetter hvilken de skal bruke

| Konsept | Fil 1 | Fil 2 | Problem |
|---|---|---|---|
| Button | `src/shared/ui/button.tsx` | `src/shared/ui/ButtonPremium.tsx` | Ulik API: `loading` vs `isLoading`, `asChild` kun i én |
| Card | `src/shared/ui/card.tsx` | `src/shared/ui/GlassCard.tsx` | shadcn-style vs custom. Ulik padding-API. |
| Empty state | `src/shared/ui/EmptyState.tsx` | `src/shared/ui/empty.tsx` | High-level vs composable. Ingen veiledning. |

---

## Veien til verdensledende: Prioritert veikart

### Fase 1: Stopp blødningen (1 uke)
1. Fiks dupliserte `<meta name="description">` (SEO)
2. Fiks `data-testid="backtest-calculator"` (E2E)
3. Slå sammen 3 ErrorBoundary til én, med dark-mode farger
4. Guard alle `window`/`document` med `typeof`

### Fase 2: Fjern gjettingen (2 uker)
1. `PortfolioDashboard.tsx` → splitt til selectors + presentasjon
2. `UnifiedTradingDashboard.tsx` → eksplisitte interfaces, fjern `unknown`
3. `ConnectBinanceModal` → 100% i18n
4. Landing page → i18n på alle 10+ filer

### Fase 3: Håndhev tokens (1 uke)
1. Konverter `bg-[#...]` til CSS custom properties (`var(--kp-bg)`)
2. Legg til kontrast-validering i tokens (min 4.5:1)
3. Legg til touch-target-minimum (44×44px)
4. Fjern akademiske grader fra `BRAND` — bruk `tier`-mapping i business logic

### Fase 4: Tilgjengelighet (2 uker)
1. `aria-hidden="true"` på alle dekorative SVGer
2. `htmlFor` + `id` på alle labels
3. `useReducedMotion` på alle framer-motion animasjoner
4. Skjermleser-test på kritisk flyt (innlogging → dashboard → trade)

### Fase 5: 2026-innovasjon (4+ uker)
1. WebGL charts (LightningChart eller TradingView Lightweight)
2. Edge-native data-streaming (Vercel Edge + WebStreams API)
3. Offline-sync for posisjoner (Service Worker + Background Sync)
4. Passiv biometric auth (WebAuthn / Face ID)
5. Risiko-basert progressiv avsløring (skjul avansert for nybegynnere)

---

## Anbefaling til produkteier

> **"Vi vil ikke ha gjetagende komponenter."**

Enig. Gjetting dreper tillit. En fintech-app som *gjetter* på symbol-mapping, *gjetter* på brukerens språk, eller *gjetter* på om data er gyldig — det er ikke verdensledende. Det er farlig.

**Min anbefaling:**
1. **Fase 1+2+3 er non-negotiable.** Dette er teknisk gjeld som blokkerer videre innovasjon.
2. **Fase 4 er regulatorisk nødvendig.** WCAG 2.1 AA er lov i USA fra april 2026. EU følger.
3. **Fase 5 er differensiering.** WebGL charts og edge-streaming er det som skiller oss fra Coinbase og Robinhood.

**Ikke start Fase 5 før Fase 1-3 er ferdig.** Å bygge WebGL charts oppå en 1000-linjes gjettingskomponent er som å polere en rusten bil.

---

## Referanser

- Perplexity Pro deep research: "Best UI/UX Design Patterns for Cryptocurrency Trading Platforms and Fintech Applications in 2026" (50 kilder)
- MemPalace KG: `ui-audit-2026-04-23` entity (10 facts)
- E2E-testresultater: 48 passed, 6 failed (88.9%), 23.04.2026
- Mobile modernisering v1: Commit `b23142c7d`

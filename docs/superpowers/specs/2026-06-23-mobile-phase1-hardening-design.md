# Mobiloptimalisering — Fase 1 Hardning

**Dato:** 2026-06-23  
**Status:** Utkast / klar for implementering  
**Branch:** `feat/mobil-optimalisering-trading-paritet`  
**Mål:** Fullføre og herde Fase 1-komponentene fra ADR-2026-04-23 slik at de er testbare, dokumentert og integrert.

---

## Bakgrunn

Fase 1-byggeklossene (`useHaptic`, `MobileBottomSheet`, `BottomTabs`) er allerede implementert i `src/hooks/` og `src/shared/ui/`. De mangler imidlertid:

- Enhetstester for hooks og UI-komponenter
- Storybook-stories for visuell dokumentasjon og manuell QA
- Integrasjon av `usePullToRefresh` i en faktisk side

Denne oppgaven herder komponentene, legger til manglende tester/stories og tar pull-to-refresh i bruk på mobil portefølje.

---

## Scope

### 1. Enhetstester

| Komponent / hook | Testdekning |
|---|---|
| `useHaptic` | Vibration API kalles med riktig varighet; iOS webkit-haptic postMessage; graceful fallback når ingen API finnes. |
| `usePullToRefresh` | Kun trigger ved scrollTop === 0; distance clampes med resistance; haptic ved threshold; onRefresh kalles ved release; reset etter refresh. |
| `MobileBottomSheet` | Rendrer tittel/beskrivelse/children/footer; åpne/lukke via controlled props; `preventClose` blokkerer lukking; snapPoints håndteres. |
| `BottomTabs` | Aktiv tab utledes fra pathname; trykk navigerer og trigger haptic; skjules når tastatur er åpent. |

### 2. Storybook-stories

- `MobileBottomSheet` — varianter: small/medium/large, med/uten footer, preventClose.
- `BottomTabs` — default og med aktiv tab forhåndsvalgt.
- `MobileTradingCard` — profit/loss/varianter, med/uten sparkline og day-range.

### 3. Pull-to-refresh integrasjon

- Pakk mobilvisningen av `/[locale]/(user)/dashboard/portfolio/page.tsx` i en container som bruker `usePullToRefresh`.
- Vis en visuell indikator (`PullToRefreshIndicator`) mens brukeren drar ned.
- Trigger refetch av porteføljedata (samme mekanisme som eksisterende refresh-knapp/loader).
- Kun aktiv på mobil breakpoint (`md:hidden`).

### 4. Mindre forbedringer i BottomTabs

- Bevare eksisterende animasjon og haptic.
- Sikre at `aria-current` settes korrekt for aktiv fane.
- Ingen endring av tabs/ikonkonfigurasjon i denne runden.

---

## Arkitektur

```text
src/
├── hooks/
│   ├── use-haptic.ts               (eksisterende)
│   ├── use-pull-to-refresh.ts      (eksisterende)
│   └── __tests__/
│       ├── use-haptic.test.ts
│       └── use-pull-to-refresh.test.ts
├── shared/ui/
│   ├── mobile-bottom-sheet.tsx     (eksisterende)
│   ├── mobile-trading-card.tsx     (eksisterende)
│   └── __tests__/
│       ├── mobile-bottom-sheet.test.tsx
│       └── mobile-trading-card.test.tsx
│   └── __stories__/
│       ├── mobile-bottom-sheet.stories.tsx
│       └── mobile-trading-card.stories.tsx
├── shared/navigation/
│   ├── BottomTabs.tsx              (eksisterende)
│   ├── __tests__/BottomTabs.test.tsx
│   └── __stories__/BottomTabs.stories.tsx
└── features/portfolio/
    └── PullToRefreshIndicator.tsx  (ny)
```

---

## Dataflyt

1. Bruker drar ned porteføljelisten på mobil.
2. `usePullToRefresh` oppdager `scrollTop === 0`, beregner avstand og trigger haptic ved threshold.
3. Ved release kalles eksisterende refetch-funksjon for porteføljen.
4. `PullToRefreshIndicator` viser spinner/tekst basert på `state.isRefreshing` / `state.isReadyToRelease`.

---

## Suksesskriterier

- [ ] `npm run test:unit` passerer med nye tester.
- [ ] `npm run type-check` og `npm run lint` er grønne.
- [ ] `npm run storybook` bygger uten feil og viser nye stories.
- [ ] Pull-to-refresh fungerer på mobil uten layout shift (ingen CLS).
- [ ] Lighthouse mobile score forblir ≥ 90 (ikke regressert av indikatoren).

---

## Grenser / hva vi IKKE gjør

- Ikke redesigne ikoner eller tab-rekkefølge.
- Ikke implementere `SwipeAction` (Fase 2).
- Ikke implementere `MobileOrderFlow` (Fase 4).
- Ikke endre backend/API-kontrakter.

---

## Risiko

- Pull-to-refresh kan konflikte med eksisterende scroll-behavior. Løsning: teste på faktisk iOS/Android og gjøre indikatoren non-blocking.
- Storybook-config kan kreve mock av `next-intl` / `next/navigation`. Løsning: bruk decorators i stories.

---

## Neste steg etter denne oppgaven

Fase 2: `SwipeAction`, `MobileTradingCard`-forbedringer og ytterligere mobilporteføljekort.

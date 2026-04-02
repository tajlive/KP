# KLA-PROFIT1: Lint-feil Analyse

**Dato:** 2026-04-02
**PR:** #61

---

## Oppsummering

| Kategori | Antall filer | Endret i KLA-PROFIT1 |
|----------|-------------|---------------------|
| Totalt feilende | 13 | 1 |
| Legacy (ikke endret) | 12 | 0 |
| KLA-PROFIT1 | 1 | 1 |

---

## A) KLA-PROFIT1 Filer (endret i denne PR)

### src/app/api/cron/ai-engine/route.ts
**Feil:** 90:12 @typescript-eslint/no-explicit-any  
**Tiltak:** Fikses - endre `any` til `unknown` eller riktig type

---

## B) Legacy Filer (IKKE endret i KLA-PROFIT1)

| Fil | Regel | Antall |
|-----|-------|--------|
| playwright/global-setup.ts | @typescript-eslint/no-unused-vars | 1 |
| src/features/backtest/BacktestPanel.tsx | jsx-a11y/label-has-associated-control | 3 |
| src/features/backtest/BacktestPanel.tsx | jsx-a11y/label-has-for | 3 |
| src/features/funding/FundingArbitrageDashboard.tsx | @typescript-eslint/no-explicit-any | 2 |
| src/features/funding/FundingArbitrageDashboard.tsx | jsx-a11y/label-has-associated-control | 1 |
| src/features/funding/FundingArbitrageDashboard.tsx | jsx-a11y/label-has-for | 1 |
| src/features/landing/LandingBacktestTeaser.tsx | jsx-a11y/label-has-associated-control | 3 |
| src/features/landing/LandingBacktestTeaser.tsx | jsx-a11y/label-has-for | 3 |
| src/features/landing/ROISimulator.tsx | jsx-a11y/label-has-associated-control | 1 |
| src/features/landing/ROISimulator.tsx | jsx-a11y/label-has-for | 3 |
| src/features/trading/AggressivitySlider.tsx | jsx-a11y/label-has-for | 1 |
| src/features/trading/OptimalTrader.tsx | jsx-a11y/label-has-associated-control | 2 |
| src/features/trading/OptimalTrader.tsx | jsx-a11y/label-has-for | 2 |
| src/features/trading/TradeAmountSlider.tsx | jsx-a11y/label-has-for | 1 |
| src/lib/monitoring/index.ts | eslint-disable directive | 1 |
| src/lib/paper-trading/supabase.ts | @typescript-eslint/no-explicit-any | 3 |
| src/lib/trading/confluent-signal-engine.ts | @typescript-eslint/no-explicit-any | 1 |

**Totalt:** 12 filer, 31 feil

**Tiltak:** ESLint overrides i hver fil med TODO for permanent fix

---

## Anbefalt Løsning

### 1. Fiks KLA-PROFIT1 fil
```typescript
// src/app/api/cron/ai-engine/route.ts linje 90
// Endre fra: const data: any
// Endre til: const data: unknown
// Eller: const data: EnsembleSignalResult (hvis type finnes)
```

### 2. Legg til ESLint overrides i legacy filer
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: KLA-XXX Fjern any og bruk riktige typer

/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/label-has-for */
// TODO: KLA-XXX Fiks label accessibility
```

### 3. Dokumenter i KLA-backlog
- Opprett KLA-issue for å fikse legacy lint-gjeld
- Estimer: 2-3 dager arbeid
- Prioritet: Medium (ikke blocker for launch)

---

## Risiko

| Tiltak | Risiko | Mitigasjon |
|--------|--------|------------|
| ESLint overrides | Lav | Kun i legacy filer, ikke globalt |
| any -> unknown | Lav | Bedre enn any, type-sikker |
| TODO kommentarer | Ingen | Klar tracking i Linear |

**Total risiko:** LAV

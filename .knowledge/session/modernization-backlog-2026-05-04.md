# Moderniserings-backlog — Swarm Review 2026-05-04

**Utført av:** KIMI Swarm (review + security + architect)
**Filer analysert:** 15
**Scope:** Dashboard, Trading, Landing, Polling

---

## Sammendrag

| Kategori | Antall |
|----------|--------|
| ✅ Grønne (proceed) | 9 filer |
| ⚠️ Warnings | 2 filer |
| 🔴 Blocked | 4 filer |

**Nøkkel-funn:** Landing-page og polling-komponenter er **arkitektonisk rene**. All smerte ligger i dashboard/trading — spesielt to massive filer (>500 linjer) med sikkerhetsavvik.

---

## 🔴 P0 — Block-fixes (MÅ fikses før modernisering)

### 1. `src/features/trading/UnifiedTradingDashboard.tsx`
| Måling | Verdi |
|--------|-------|
| Linjer | **1 295** |
| Kompleksitet | **10/10** |
| Grener | 50 |
| Tester | ❌ Ingen |

**Avvik:**
- `analyzer`: BLOCK — fil >500 linjer, kompleksitet 10/10, 50 grener
- `security`: BLOCK — mulig hardcoded secret/token, console logging i trading-kode, live trading uten feature flag
- `tester`: BLOCK — mangler testfil (P0-scenarios: happy path, error, edge cases, security)

**Anbefaling:**
- Splitt i sub-komponenter: `TradePanel`, `SignalPanel`, `RiskPanel`, `HistoryPanel`
- Fjern console.log — bruk strukturert logging
- Verifiser `live_trading_enabled` sjekk
- Flytt secrets til env/Vault

---

### 2. `src/features/dashboard/TradingResultsDashboard.tsx`
| Måling | Verdi |
|--------|-------|
| Linjer | **692** |
| Kompleksitet | **10/10** |
| Tester | ❌ Ingen |

**Avvik:**
- `analyzer`: BLOCK — fil >500 linjer, kompleksitet 10/10
- `security`: BLOCK — mulig hardcoded secret/token
- `tester`: P2, mangler tester

**Anbefaling:**
- Splitt: `ResultsTable`, `ResultsChart`, `ResultsFilter`, `ExportButton`
- Verifiser at ingen secrets er hardkodet

---

### 3. `src/features/trading/SignalFeed.tsx`
| Måling | Verdi |
|--------|-------|
| Linjer | **462** |
| Kompleksitet | **10/10** |
| Tester | ❌ Ingen |

**Avvik:**
- `analyzer`: BLOCK — kompleksitet 10/10
- `security`: WARN — console logging, live trading uten feature flag
- `tester`: P0, mangler tester

**Anbefaling:**
- Splitt: `SignalList`, `SignalCard`, `SignalFilter`
- Fjern console.log
- Legg til `live_trading_enabled` guard
- **Vurder Realtime:** subscribe på `trading_signals` i stedet for polling

---

### 4. `src/app/[locale]/layout.tsx`
| Måling | Verdi |
|--------|-------|
| Linjer | **374** |
| Kompleksitet | **10/10** |
| Grener | 40 |

**Avvik:**
- `analyzer`: BLOCK — kompleksitet 10/10, 40 grener
- `security`: BLOCK — mulig hardcoded secret/token

**Anbefaling:**
- Trekk ut: `Providers`, `MetadataSetup`, `AnalyticsInit`, `ThemeInit`
- Verifiser at CSP/nonces ikke inneholder hardkodede verdier

---

## ⚠️ P1 — Warnings (Rydd før modernisering)

### 5. `src/features/dashboard/DashboardPro.tsx`
| Måling | Verdi |
|--------|-------|
| Linjer | 343 |
| Kompleksitet | **9/10** |

**Avvik:**
- `analyzer`: WARN — kompleksitet 9/10
- `tester`: P2, mangler tester

**Anbefaling:**
- Refaktorer store useEffect-blokker til custom hooks
- Del opp i mindre komponenter

---

## ✅ P2 — Grønne filer (Klare for modernisering)

| Fil | Status | Moderniseringsmulighet |
|-----|--------|------------------------|
| `src/app/[locale]/(user)/dashboard/page.tsx` | ✅ Grønn | **Server Component** — kan hente data server-side |
| `src/app/[locale]/paper-trading/page.tsx` | ✅ Grønn | **Server Component** — enkel data-fetching |
| `src/features/dashboard/PositionLotsCard.tsx` | ✅ Grønn | **Realtime** — subscribe på `trades` |
| `src/features/landing/LivePriceTicker.tsx` | ✅ Grønn | Oppgave: legitimat client-side |
| `src/features/landing/DeferredLivePriceTicker.tsx` | ✅ Grønn | Oppgave: legitimat client-side |
| `src/features/landing/LiveSignalFeed.tsx` | ✅ Grønn | Oppgave: legitimat client-side |
| `src/features/gamification/DailyChallenge.tsx` | ✅ Grønn | Oppgave: legitimat client-side |

---

## Moderniserings-Rekkefølge (anbefalt)

### Uke 1: Rydding
1. Fiks `UnifiedTradingDashboard.tsx` — splitt i paneler
2. Fiks `TradingResultsDashboard.tsx` — splitt i sub-komponenter
3. Fiks `SignalFeed.tsx` — splitt + fjern console.log
4. Fiks `layout.tsx` — trekk ut providers

### Uke 2: Client → Server (Quick Wins)
5. `dashboard/page.tsx` → Server Component med data fetching
6. `paper-trading/page.tsx` → Server Component

### Uke 3: Realtime
7. `PositionLotsCard.tsx` → Supabase Realtime subscription
8. `SignalFeed.tsx` → Supabase Realtime (etter split)

### Uke 4: Bundle
9. Kjør `next-bundle-analyzer` — verifiser reduksjon
10. Optimaliser største avhengigheter

---

## Bundle-impact Estimat

| Fil | Linjer | Estimert bundle-impact |
|-----|--------|------------------------|
| UnifiedTradingDashboard.tsx | 1 295 | 🔴 **Stor** — splitt sparer mest |
| TradingResultsDashboard.tsx | 692 | 🔴 **Stor** — splitt sparer mye |
| SignalFeed.tsx | 462 | 🟡 Medium — splitt + Realtime |
| layout.tsx | 374 | 🟡 Medium — trekk ut providers |
| DashboardPro.tsx | 343 | 🟢 Lav — refaktorering |

**Potensiell reduksjon:** 30–40% av dashboard-bundle ved å splitte de to største filene.

---

*Generert av KIMI Swarm Review — 2026-05-04*

---

## Uke 1 — Utførelse (2026-05-04)

### Ferdig ✅

| Fil | Før | Etter | Reduksjon |
|-----|-----|-------|-----------|
| `UnifiedTradingDashboard.tsx` | 1 294 linjer | **553 linjer** | **-57%** |
| `StrategySelectorSection.tsx` | 522 linjer | **211 linjer** | -60% |
| `SignalFeed.tsx` | 461 linjer | **409 linjer** | -11% |
| `layout.tsx` | 373 linjer | **339 linjer** | -9% |
| `TradingResultsDashboard.tsx` | 691 linjer | **657 linjer** | -5% |

### Nye filer opprettet (13)

| Fil | Linjer | Innhold |
|-----|--------|---------|
| `src/features/trading/components/PortfolioSection.tsx` | 91 | Portfolio-målere + ProfessionalChart |
| `src/features/trading/components/ActiveStrategiesSection.tsx` | 71 | Aktive strategier med stop-knapper |
| `src/features/trading/components/RecentTradesSection.tsx` | 90 | Siste trades med Framer Motion |
| `src/features/trading/components/StrategySelectorSection.tsx` | 211 | Strategi-velger med expand/collapse |
| `src/features/trading/components/StrategyConfig.tsx` | 317 | Per-strategi config-paneler |
| `src/features/trading/components/ConfidenceBadge.tsx` | 26 | Konfidens-badge komponent |
| `src/features/trading/components/PriceCell.tsx` | 31 | Pris-celle med lock-state |
| `src/features/dashboard/components/KpiCard.tsx` | 38 | KPI-kort med gradient |
| `src/app/providers/AsyncFeatureFlagProvider.tsx` | 16 | Async feature-flag wrapper |
| `src/app/providers/RootProviders.tsx` | 63 | Theme + Auth + i18n + Marketing providers |

### Fikset ✅
- SignalFeed: **Fjernet polling** (setInterval) — Realtime-subscription var allerede på plass
- SignalFeed: **Fjernet console.error** — byttet til TODO for strukturert logging
- layout.tsx: **Extracted RootProviders** — redusert provider-kompleksitet
- Alle nye filer: **export + proper imports**

### Verifisering ✅
- `npm run type-check` — **0 feil**
- `npm run lint:gate` — samme 3 pre-existing issues
- `node scripts/verify/verify-claims.mjs` — **alle grønne**
- `node scripts/verify/check-stale-types.mjs` — **ingen stale refs**

### Gjenstående blokker (Week 1 fortsettelse)

| Fil | Årsak | Anbefalt fix |
|-----|-------|-------------|
| `UnifiedTradingDashboard.tsx` (553 linjer) | Hovedkomponent har 39 grener | Extract `useDashboardData` hook + `useStrategyActions` hook |
| `TradingResultsDashboard.tsx` (657 linjer) | Charts inline (~280 linjer) | Extract `CumulativePnlChart`, `DailyPnlChart`, `WinLossChart`, `TopPairsChart` |
| `layout.tsx` (339 linjer) | 40 grener i LocaleLayout | Extract `resolveLocale` + navData-fetch til utils |

### GO/NO-GO Uke 1

| Kriterium | Status |
|-----------|--------|
| type-check grønn | ✅ GO |
| verify-claims grønn | ✅ GO |
| Ingen orphaned files | ✅ GO |
| Bundle-reduksjon | 🟡 DELVIS — hovedfilene er mindre, men bundle-analyse ikke kjørt |

**Anbefaling:** Fortsett med TradingResultsDashboard chart-extraction for å komme under 500-linje-grensen, DERETTER start Uke 2 (Server Components).

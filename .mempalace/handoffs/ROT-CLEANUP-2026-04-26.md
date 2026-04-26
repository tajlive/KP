# Handoff: Rot-cleanup Session 2026-04-26

**Agent:** kimi
**Commits:** `c8d4d54bd` → `32f35f8fe` → `5de7ad02e` → `f778e4294`
**Status:** ✅ Pushed to origin/main, Vercel production Ready

---

## What was cleaned

### 1. Mock data removed from production code

| File | Before | After |
|---|---|---|
| `StatsGrid.tsx` | `DEFAULT_STATS` with fake numbers (+24.5%, 73% win rate, 1.8 Sharpe, 15 trades) | `stats` prop is now **required** — no default |
| `UpgradeGate.tsx` | Hardcoded `winRate: 73`, `totalReturn: 12.4`, `totalProfit: 2450` | Computed from real `trades` + `paper_balance` |
| `DashboardPro.tsx` | Fallback `currentCapital: 100000` when stats null | Fallback `currentCapital: 0` |
| `PortfolioChart.tsx` | Hardcoded `.eq("mode", "paper")` | Accepts `mode?: "paper" \| "live"` prop |

### 2. Duplicate components merged/deleted

| Deleted | Lines | Reason |
|---|---|---|
| `PaperTradingCard.ENHANCED.tsx` | −251 | Unused duplicate of `PaperTradingCard.tsx` |
| `PaperTradingCard.tsx.BACKUP-2026-03-28` | −? | Old backup |
| `SmartActionsRow.tsx` | −213 | Merged into `SmartActions.tsx` with `compact` prop |
| `PaperLiveToggle.tsx` | −77 | Unused |
| `TradingModeToggle.tsx` (dashboard) | −167 | Unused (landing uses `features/trading/TradingModeToggle.tsx`) |

**SmartActions merge:** Now supports both old states (`newUser`, `paperMode`, etc.) and new `UserState` (`NyBruker`, `Onboarded`, etc.). CMS fallback preserved. `useLocale()` internal instead of prop.

### 3. Backup files removed

- `src/app/api/paper-trading/balance/route.ts.BACKUP-2026-03-28`
- `src/i18n.ts.backup`
- `src/i18n.ts.final.backup`
- `src/lib/paper-trading/supabase.ts.backup`
- `vercel.json.backup.pro`

### 4. CI fix

- Removed `@swc/core-darwin-arm64` from `package.json`
- Regenerated `package-lock.json` for cross-platform compatibility

---

## What's still left (non-critical)

| Item | Location | Priority |
|---|---|---|
| NewUserHero duplicate | `NewUserHero.tsx` (standalone) vs inline in `AdaptiveDashboard.tsx` | 🟡 Medium |
| Inline TradingModeToggle | `UnifiedTradingDashboard.tsx:556` | 🟡 Medium |
| Deprecated `/api/paper-trading/*` routes | Still exist with `// ⚠️ DEPRECATED` | 🟢 Low |
| `.env.local.backup.1775853499` | Root dir | 🟢 Low (env backup) |
| `next.config.mjs.backup.1775672582` | Root dir | 🟢 Low |
| `src/types/database.types.ts.new` | Untracked file | 🟢 Low |

---

## Verification

- `npm run lint` — 0 errors
- `npx tsc --noEmit` — 0 errors
- `npm run test:unit` — 687 passed, 2 skipped
- Vercel production — Ready

---

## KG Facts Added

- `dashboard has adaptive-v2-4-state-layout`
- `dashboard includes AITip-rule-based-insights`
- `dashboard includes DemoChart-synthetic-sparkline`
- `dashboard uses SmartActions-merged-CMS-support`
- `dashboard has PortfolioChart-live-mode-support`
- `dashboard removed DEFAULT_STATS-mock-data`
- `dashboard removed UpgradeGate-hardcoded-mock-values`
- `dashboard removed PaperTradingCard.ENHANCED-duplicate`
- `dashboard removed SmartActionsRow-merged-into-SmartActions`
- `dashboard removed PaperLiveToggle-unused`
- `dashboard removed TradingModeToggle-dashboard-unused`
- `deploy-pipeline fixed SWC-darwin-arm64-CI-failure`

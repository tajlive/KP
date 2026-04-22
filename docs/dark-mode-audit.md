# Dark Mode Audit — Klarpakke

**Audit date:** 2025-03-17  
**Scope:** `src/` TSX/TS files  
**Findings:** The app is dark-only (body `bg-[#0A0B0D]`); most `dark:` classes are redundant.

---

## 1. Total Count

| Metric | Count |
|--------|-------|
| **Total `dark:` usages** | **~620** (tsx files only) |
| Files with `dark:` classes | 95 |
| Estimated redundant | ~95% (app never renders light mode) |

---

## 2. Category Breakdown

| Category | Pattern | Est. Count | % |
|----------|---------|------------|---|
| **Background** | `dark:bg-*` | ~220 | 35% |
| **Text** | `dark:text-*` | ~280 | 45% |
| **Border** | `dark:border-*`, `dark:divide-*` | ~80 | 13% |
| **Other** | `dark:hover:*`, `dark:from-*`, `dark:prose-invert`, `dark:opacity-*`, `dark:data-[*]`, etc. | ~40 | 7% |

---

## 3. Top 20 Most-Used `dark:` Patterns

| Rank | Pattern | Est. Usage |
|------|---------|------------|
| 1 | `dark:text-gray-400` | 45+ |
| 2 | `dark:text-white` | 42+ |
| 3 | `dark:text-gray-900` (with light `text-gray-900`) | 38+ |
| 4 | `dark:bg-gray-900` | 35+ |
| 5 | `dark:bg-gray-800` | 32+ |
| 6 | `dark:text-gray-600` | 28+ |
| 7 | `dark:border-gray-800` | 25+ |
| 8 | `dark:border-gray-200` (light) / `dark:border-gray-800` (dark) pairs | 24+ |
| 9 | `dark:bg-gray-900/80` | 18+ |
| 10 | `dark:border-gray-700` | 15+ |
| 11 | `dark:text-blue-400` | 14+ |
| 12 | `dark:bg-blue-900/30` | 12+ |
| 13 | `dark:text-green-200` | 11+ |
| 14 | `dark:bg-green-900/30` | 11+ |
| 15 | `dark:hover:bg-gray-800` | 10+ |
| 16 | `dark:text-slate-400` | 10+ |
| 17 | `dark:bg-slate-900` | 9+ |
| 18 | `dark:bg-gray-800/50` | 8+ |
| 19 | `dark:text-gray-300` | 8+ |
| 20 | `dark:bg-gray-700` | 7+ |

---

## 4. Top 10 Files by `dark:` Usage

| Rank | File | Count |
|------|------|-------|
| 1 | `src/app/[locale]/admin/ab-tests/ClientABTests.tsx` | 51 |
| 2 | `src/components/dashboard/BinanceAPISettings.tsx` | 48 |
| 3 | `src/components/auto-trading/StrategyBuilder.tsx` | 40 |
| 4 | `src/app/[locale]/kurs/ClientKurs.tsx` | 39 |
| 5 | `src/app/[locale]/checkout/ClientCheckout.tsx` | 36 |
| 6 | `src/components/marketplace/StrategyDetailPage.tsx` | 33 |
| 7 | `src/components/landing/ComparisonSection.tsx` | 33 |
| 8 | `src/components/trading/PositionsTable.tsx` | 32 |
| 9 | `src/components/auto-trading/TrialBanner.tsx` | 30 |
| 10 | `src/components/dashboard/bots/BotStatusCard.tsx` | 29 |

---

## 5. Theme Provider Status

| Check | Result |
|-------|--------|
| **next-themes** | Installed (`^0.4.6` in package.json) |
| **ThemeProvider** | Not wrapping app — no `<ThemeProvider>` in root layout |
| **useTheme** | Only used in `src/components/ui/sonner.tsx` for Sonner toast theme |
| **Body styles** | `bg-[#0A0B0D] text-white` — always dark |

**Conclusion:** The app is effectively dark-only. There is no theme switching; `dark:` variants are redundant because the `dark` media/class never differs from the base UI.

---

## 6. Recommendations

1. **Remove most `dark:` classes** — Since the app uses `bg-[#0A0B0D]`, keep only the intended dark look. For most components, keep the dark variant and drop the light.
2. **Convert semantic colors to CSS variables** — Use design tokens in `kp-tokens.css` for text, borders, backgrounds instead of Tailwind `dark:` classes.
3. **Reuse existing tokens** — `--color-slate-*`, `--color-gray-*` are in `src/lib/design/tokens.ts` and `src/styles/kp-tokens.css`.
4. **Optional:** If Sonner is the only next-themes consumer, consider replacing `useTheme` with a fixed `theme="dark"` and removing next-themes if nothing else needs it.

---

## 7. Migration Plan

### Phase 1: Layout files (~2–3 days)

- `src/app/[locale]/layout.tsx` (root) — already dark-only
- `src/app/[locale]/onboarding/layout.tsx` — remove light/dark duality
- `src/components/layout/Navigation.tsx`, `MarketingNavigation.tsx` — simplify to dark-only

### Phase 2: High-traffic pages (~3–4 days)

- Checkout flow (`ClientCheckout.tsx`, `ClientCheckoutSuccess.tsx`)
- Onboarding steps (`ApiSetupStep`, `WelcomeStep`, `CompletionStep`, etc.)
- Login (`InnloggingClient.tsx`)
- Dashboard (`ClientDashboard.tsx`, `ClientKurs.tsx`)

### Phase 3: Components (~4–5 days)

- Trading: `PositionsTable`, `TradeHistory`, `ProfessionalChart`, `PortfolioStats`
- Dashboard: `BinanceAPISettings`, `BotStatusCard`, `TradingModeToggle`
- Marketplace: `StrategyDetailPage`, `CreatorDashboard`, `CopyTradingDashboard`
- Landing: `ComparisonSection`, `SocialProofSection`, `FAQSection`

### Phase 4: UI primitives (~1 day)

- `src/components/ui/*` — checkbox, select, input, tabs, radio-group, badge, etc.
- Standardize on CSS variables where `dark:` is used for states (e.g. `dark:aria-invalid:*`)

### Migration rules

1. **Single-mode components:** Keep the `dark:` value as the default; remove the light prefix where both exist.
2. **Status colors:** Keep semantic colors (green/red/amber). Convert `dark:bg-green-900/30` → `bg-green-900/30` (or token).
3. **Prose:** Replace `dark:prose-invert` with `prose-invert` where used.
4. **Test:** Spot-check onboarding, checkout, dashboard, and trading views after each phase.

---

## 8. Files Touched (by Phase)

| Phase | Files |
|-------|-------|
| 1 | `onboarding/layout.tsx`, `Navigation.tsx`, `MarketingNavigation.tsx` |
| 2 | Checkout (2), innlogging (1), ClientDashboard, ClientKurs, onboarding steps (6+) |
| 3 | ~25 component files in trading, dashboard, marketplace, landing |
| 4 | ~15 files in `components/ui/` |

---

*Generated by dark mode audit script.*

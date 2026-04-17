# TASK-UX-ROUTING-REFACTOR-001: UI/UX Handoff & Routing Fixes

## Objective
Fix the broken user flows by establishing a clear distinction between the "Dashboard/Portfolio" (viewing current state) and the "Market/Strategies" (where users start new trades). Fix broken Next-Intl routing in the bottom tabs and top navigation. Ensure users can see prices when configuring bots, aligning with industry standards (Pionex, eToro, 3Commas).

## Instructions for KIMI

1. **Fix Desktop Top Navigation (`src/lib/navigation/dashboard-links.ts`)**
   - In `DASHBOARD_COINBASE_TOP_NAV`, ensure we have a clear entry point for starting bots.
   - Replace or add the `autoTrade` navigation item. It must point to `/dashboard/auto-trade` (the main Bot Wizard / Strategy selector).
   - Change the label key to `dashboard.sidebar.autoTrade`.

2. **Fix Mobile Bottom Tabs (`src/lib/navigation/config.ts`)**
   - In `MOBILE_BOTTOM_TABS`, the `paper` link currently points to the likely broken `/dashboard/paper-trading`. 
   - Change this tab to be `autoTrade` instead, pointing to `/dashboard/auto-trade`. Use the `Bot` icon. This ensures mobile users have one tap to reach the "Start Bot" marketplace.

3. **Establish CTAs (Call to Actions)**
   - In `src/features/dashboard/DashboardContent.tsx` or `DashboardPro.tsx`, if the user has NO active session or 0 active bots, render a massive, primary Button: "Utforsk Strategier" or "Start ny Bot" mapping to href `/${locale}/dashboard/auto-trade`.
   
4. **Implement Missing Prices (Bot Wizard)**
   - Identify the page where users select and start a strategy (e.g. `src/app/[locale]/(user)/dashboard/auto-trade/page.tsx` or `src/features/auto-trade/BotDetailView.tsx`).
   - Add a UI element showing the current market price for the pair being traded (e.g., BTC/USD). If a live WebSocket to Binance is available in the codebase, hook it up. Otherwise, add a static placeholder card specifically marked "TODO: Replace with Live Ticker component" right above the "Start Bot" button. Users must never trade blind.

5. **Verification**
   - Run `npm run type-check` and `npm run lint`.
   - Ensure the Next.js build passes.

---
## Resolution (2026-04-16)
- [x] **Routing Standardization:** Cleaned up `config.ts` and `dashboard-links.ts`. Pointed all trading flows to `/dashboard/auto-trade`.
- [x] **Live Prices:** Created shared `LivePricePreview.tsx` component.
- [x] **Bot Wizard:** Added live price context to Step 2 (Selection) so users don't "trade blind".
- [x] **Bot Detail:** Added live heart-beat ticker to the bot overview page.
- [x] **Clean Nav:** Removed legacy `paper-trading` links to prevent broken user flows.

# TASK-SMART-YIELD-UX-001: Monetization Prompts & Trust Elements

## Objective
Enhance the dashboard and bot wizard to increase engagement and trust based on modern crypto platform UX standards. We want to nudge users to invest idle funds (via DCA/Auto-invest alerts) and communicate the safety of our trading engine through the Kelly Criterion.

## Instructions for KIMI

1. **Implement Idle Funds Nudge in Dashboard**
   - File: `src/features/dashboard/DashboardContent.tsx` or `src/features/dashboard/DashboardPro.tsx`.
   - Logic: If the user has a positive balance (e.g., `effectiveBalance > 0`) BUT has no active session or trades running, display an alert banner (e.g., Lucide `TrendingUp` or `AlertCircle` icon).
   - Banner Text: "Du har ubrukte midler. La KI-en vår investere gradvis over tid med DCA, eller tjen renter." (You have idle funds. Let our AI invest gradually over time with DCA, or earn yield.)
   - CTA: A sleek button labeled "Aktiver Auto-Invest" routing to `/${locale}/dashboard/auto-trade`.

2. **Add the Kelly Criterion Trust Badge**
   - File: `src/features/auto-trade/BotWizard.tsx` (Specifically in the final confirmation steps).
   - Logic: Add a visual trust badge or callout box just above the execution button.
   - Design: Use a shield icon. 
   - Badge Text: "🛡️ Sikret av Kelly-kriteriet. Vår KI justerer automatisk risiko basert på profitt for å matematisk forhindre at du taper innsatsen din."

3. **Verification**
   - Run `npm run type-check` and `npm run lint`.
   - Ensure these new components are visually cohesive with the existing `@coinbase/cds-web` design system used in Klarpakke.

---
## Resolution (2026-04-16)
- [x] **Idle Funds Nudge:** Implemented in DashboardPro.tsx. Logic handles effectiveBalance > 0 && !sessionId.
- [x] **Kelly Trust Badge:** Implemented in BotWizard.tsx (Step 3).
- [x] **Infrastructure:** All workflows standardized to use the setup-klarpakke composite action.
- [x] **Verification:** Code reviewed and aligned with CDS-web design system.

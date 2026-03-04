# 🚀 Feature Implementation Plan: Klarpakke High-Priority Issues

**Author:** Antigravity (Senior Full-Stack Product Engineer)  
**Date:** March 2, 2026  
**Status:** Planning Phase

---

## 📌 Overview

This document outlines the end-to-end implementation plan for four high-priority features:

1.  **KLA-100**: Simplified "Bot Status" Dashboard
2.  **KLA-98**: Onboarding 2.0 (2-minute Paper Trade)
3.  **KLA-94**: Copy Trading 2.0 (Leaderboard, Profiles, Fees)
4.  **KLA-91**: Strategy Marketplace

---

## 🛠️ Feature 1: KLA-100 – Simplified Dashboard

**Goal:** Replace the current landing with a narrative-driven "Bot Status" view.

### Changes:

- **`src/components/trading/BotStatusDashboard.tsx` (New)**:
  - Hero section: "Bot is Active" / "Bot is Paused".
  - Last Action: "Bought 0.05 BTC @ 65k".
  - Next Expected Action: "Checking RSI in 15 mins".
  - P&L Sidebar: Daily / Weekly / Monthly stats + Sparklines.
- **`src/app/[locale]/dashboard/page.tsx`**: Update to use `BotStatusDashboard` if a strategy is active; else fallback to `UnifiedTradingDashboard` (or redirect to onboarding).

---

## 🛠️ Feature 2: KLA-98 – Onboarding 2.0

**Goal:** Interactivity wizard to get a user paper-trading in < 2 mins.

### Changes:

- **`src/components/onboarding/OnboardingWizard.tsx` (New/Refactor)**:
  - Step 1: Choose Template (Conservate/Balanced/Aggressive).
  - Step 2: Confirm Simulation Capital (1M NOK default).
  - Step 3: "Click to start Paper Bot".
  - Success: Redirect to new Dashboard.
- **`src/lib/trading-api.ts`**: Add helper to provision paper trading sessions with zero friction.

---

## 🛠️ Feature 3: KLA-94 – Copy Trading 2.0

**Goal:** Performance fees, creator profiles, and social proof.

### Changes:

- **`src/app/[locale]/dashboard/traders/[id]/page.tsx` (New)**: Creator profile page showing performance history, active strategies, and "Copy" button.
- **`src/app/api/trading/performance-fee/route.ts` (New)**: Logic to calculate and record performance fees.
- **`supabase/migrations/20260302_copy_trading_2_0.sql`**:
  - Add `performance_fees` table.
  - Add `display_name` and `bio` to `profiles`.
  - Add `is_public` to `user_strategies`.

---

## 🛠️ Feature 4: KLA-91 – Strategy Marketplace

**Goal:** Buy/Sell/Share strategies between users.

### Changes:

- **`src/app/[locale]/dashboard/marketplace/page.tsx` (New)**: Browse strategies with filters (Risk, P&L, Price).
- **`src/components/marketplace/StrategyMarketplace.tsx` (New)**: Composable components for the marketplace.
- **`src/app/api/marketplace/subscribe/route.ts`**: Handle strategy subscriptions and revenue share logic (parameterized at 30%).

---

## 📅 Roadmap & Milestones

1.  **Milestone 1**: Dashboard & Onboarding (KLA-100 & KLA-98) - 2 days.
2.  **Milestone 2**: Copy Trading 2.0 (KLA-94) - 2 days.
3.  **Milestone 3**: Strategy Marketplace (KLA-91) - 2 days.
4.  **Milestone 4**: Final QA & Documentation - 1 day.

---

## 🛡️ QA & Testing

- **Smoke Tests**: Verify onboarding flow and "Bot Status" updates.
- **E2E Tests**: Use Playwright to simulate a user buying a strategy.
- **Security Check**: Ensure RLS prevents users from seeing/copying private strategies without permission.

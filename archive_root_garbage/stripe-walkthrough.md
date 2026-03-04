# Stripe Integration Walkthrough
This document outlines the completed Stripe payment integration for Klarpakke-Universitetet.

## 1. Environment & API Keys
We have configured `.env.local` to use your **Live Mode** keys.
- **Stripe Public Key**: `pk_live_...` (Must be added to Vercel Env variables)
- **Stripe Secret Key**: `sk_live_...` (Used locally and by MCP server)
- **Webhook Secret**: `whsec_...` (For local testing via Stripe CLI)

## 2. Products & Prices
We programmatically created the following products in your Stripe account:
- **Krypto for Småsparere**: One-time purchase (999 NOK) & Monthly Sub (299 NOK)
- **Trading Masterclass**: One-time purchase (1499 NOK) & Monthly Sub (399 NOK)
- **VIP Memberships**: Basic, Komplett, and Pro tiers (Monthly/Yearly)

Additionally, a **Test Product (20 NOK)** was created for low-cost verification.

## 3. Testing Payment Flow
A dedicated test page was created at `/no/test-betaling`.
This page initiates a Checkout Session for the 20 NOK test product.

**To verify manually:**
1. Start the dev server: `npm run dev`
2. Start Stripe webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Go to [http://localhost:3000/no/test-betaling](http://localhost:3000/no/test-betaling)
4. Click "Betal med kort" and complete the payment using a real card (Refund via dashboard).

**Automated Verification:**
We added an E2E test suite in `tests/e2e/stripe-checkout.spec.ts` using Playwright.
Run it with: `npx playwright test tests/e2e/stripe-checkout.spec.ts`

## 4. Stripe MCP Server
We implemented a custom Model Context Protocol (MCP) server to manage Stripe from Claude Desktop.

**Path:** `mcp-server/`
**Building:** `cd mcp-server && npm install && npm run build`
**Usage:** Add the server configuration to `claude_desktop_config.json` (see `mcp-server/README.md`).

This allows you to ask Claude to:
- "List all products"
- "Create a new price for VIP Pro"
- "Show me the last 5 transactions"

## 5. Deployment Status
- The app builds successfully (`npm run build`).
- Fixes were applied to `layout.tsx` to handle hydration and proper HTML structure with `next-intl`.
- **Note:** Automatic deployment is paused per your request. To deploy, run `npx vercel --prod`.

## Files Modified
- [`src/app/api/checkout/test/route.ts`](file:///Users/taj/klarpakke/src/app/api/checkout/test/route.ts) - Test checkout endpoint
- [`src/app/[locale]/test-betaling/page.tsx`](file:///Users/taj/klarpakke/src/app/[locale]/test-betaling/page.tsx) - Test payment UI
- [`mcp-server/src/index.ts`](file:///Users/taj/klarpakke/mcp-server/src/index.ts) - MCP Server implementation
- [`scripts/setup-stripe.ts`](file:///Users/taj/klarpakke/scripts/setup-stripe.ts) - Product setup script

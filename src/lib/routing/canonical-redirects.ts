/**
 * Single source of truth for canonical URL redirects.
 * Used by both proxy.ts (Edge) and middleware/i18n.ts (Node.js).
 *
 * Keep this file lightweight — no heavy imports.
 */

export const CANONICAL_REDIRECTS: Record<string, string> = {
  "/dashboard/activity": "/handelshistorikk",
  "/dashboard/trading": "/handel",
  "/dashboard/innstillinger": "/profile?tab=settings",
  "/trade": "/handel",
  "/auto-trading": "/dashboard/auto-trade",
  "/auto-trading-ai": "/dashboard/auto-trade",
  "/innlogging": "/login",
  "/registrer": "/register",
  "/paper": "/handel?mode=paper",
};

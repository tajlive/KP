/**
 * Single source of truth for canonical URL redirects.
 * Used by both proxy.ts (Edge) and middleware/i18n.ts (Node.js).
 *
 * Keep this file lightweight — no heavy imports.
 */

export const CANONICAL_REDIRECTS: Record<string, string> = {
  "/dashboard/activity": "/dashboard/historikk",
  "/handelshistorikk": "/dashboard/historikk",
  "/dashboard/trading": "/handel",
  "/dashboard/trade": "/handel",
  "/dashboard/autopilot": "/dashboard/auto-trade",
  "/bots": "/dashboard/auto-trade",
  "/dashboard/innstillinger": "/profile?tab=settings",
  "/auto-trading": "/dashboard/auto-trade",
  "/auto-trading-ai": "/dashboard/auto-trade",
  "/innlogging": "/login",
  "/registrer": "/register",
  "/paper": "/handel?mode=paper",
  "/handel?mode=paper": "/handel?mode=paper",
  "/handel?mode=live": "/handel?mode=live",
};

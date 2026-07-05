---
description: OMP-native Klarpakke specialist routing. Use these project agents instead of Cursor/Claude/Antigravity/.agent routing.
alwaysApply: true
---

# Klarpakke OMP Routing

Use OMP-native routing only.

## Specialist map

- Cloudflare/OpenNext/Wrangler/deploy/production health/routes/secrets/rollback: `klarpakke-cloudflare-workers-ops`.
- Live trading, paper trading, trades, sessions, Binance, tier gates, RLS, handelshistorikk: `klarpakke-live-trading-integrity`.
- Supabase Realtime, `useCockpitRealtime`, websocket auth, heartbeat, crash detection, stale cockpit data, Binance 403/fallback: `klarpakke-trading-realtime-market-data`.
- Supabase/Postgres schema, migrations, RPC, RLS policies, generated DB types: `klarpakke-db-rls-guard`.
- Trading Cockpit `/no/handel`, `/en/handel`, tabs, filters, pagination, analysis charts, raw i18n keys, console/network UI smoke: `klarpakke-cockpit-qa`.
- Architecture, large multi-domain design, or complex decisions: `plan`.
- Cross-cutting, full-stack implementation work that spans multiple domains (Cloudflare + Supabase + trading + E2E + charts + anything else in the repo): `klarpakke-coder`.

## Routing policy

- Main remains chief architect and final verifier.
- Use `klarpakke-coder` when work touches several subsystems and no single specialist dominates; otherwise spawn the specialist for that domain.
- Use bundled OMP `explore` for read-only mapping and bundled `reviewer` for final code/security review when a custom specialist is not needed.
- Do not create Cursor rules or `.agent` routing. If old behavior is needed, port it into `.omp/`.
- Do not spawn subagents for trivial single-file edits.

---
name: klarpakke-supabase-ops
description: Bruk ved Supabase RLS-audit eller DB-endringer.
version: 1.0.0
disableModelInvocation: true
whenToUse: Når bruker ber om RLS-audit, DB-migrasjon eller Supabase-skjema-endringer.
  IKKE for vanlige queries.
---

# Klarpakke Supabase Ops

Prosjekt: `pskhryjzkobytnfwucrb` (pskhryjzkobytnfwucrb.supabase.co). Bruk Supabase MCP (mcp__supabase__*) — det fungerer stabilt (URL+header-auth).

## Hurtig-audit (5 kommandoer)

```sql
-- 1. RLS-status — tabeller UTEN RLS = eksponert for anon
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;

-- 2. Always-true-policyer (sensitive tabeller)
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND (qual = 'true' OR with_check = 'true');

-- 3. SECURITY DEFINER-views (omgår RLS)
SELECT viewname FROM pg_views WHERE schemaname='public' AND definition ILIKE '%security definer%';

-- 4. Indexer (duplikater + ubrukte)
SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public';
-- Supabase-advisor: mcp__supabase__get_advisors med type=security|performance

-- 5. Edge functions uten JWT-krav
-- mcp__supabase__list_edge_functions → sjekk verify_jwt: false
```

## Funn (audit 2026-07-31) og fikser

- **6 tabeller manglet RLS** → fikset i `20260731020000_rls_lockdown_6_tables.sql`
  (system_flags, jokertrade_guard_log, cron_health_events = service_role-only;
  trade_mistakes = eier-basert; news_events/whale_movements = public SELECT)
- **~111 SECURITY DEFINER-funksjoner kjørbare av anon** — ikke fikset ennå; revoke EXECUTE fra anon der mulig
- **4 SECURITY DEFINER-views** (api_keys, jokertrade_monitor, session_position_flows, session_health)
- **30 always-true-policyer** på bl.a. klt_transactions, subscriptions, vipps_agreements
- **5 edge functions med verify_jwt: false** (signal-engine, smart-trader-v3, daily-pnl-report, supabase-backup, resend-webhook) — supabase-backup bør få JWT-krav
- **exec-sql** er kastrert (403) men fortsatt deployet — bør slettes

## Migrasjonsregler (Toms krav)

1. ALDRI seed brukerdata — kun konfig
2. Vis SQL-diff FØR migrasjon kjøres (DB er hellig)
3. Duplikater → slett én; rename krever idempotent innhold
4. Migrasjonsfil: `supabase/migrations/<timestamp>_<navn>.sql`, kjøres med `mcp__supabase__apply_migration` (krever name + query)

## Pitfalls

- `auth.config`-tabellen finnes IKKE i nyere GoTrue — verifiser e-postbekreftelse via `email_confirmed_at` i auth.users
- Multi-statement SQL via execute_sql returnerer KUN siste resultat — kjør verifikasjon som egen spørring
- pg_net er installert i public-schema (lint-ERROR) — ikke flytt uten å teste cron-kjeden
- Siste migrasjoner 2026-07-31: jokertrade_guard_and_killswitch + RLS-lockdown
- 50 brukere, 44 bekreftet, 28 aktive (2026-07-31)

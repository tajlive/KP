# Klarpakke Supabase — Database Backup-referanse

**Prosjekt:** `pskhryjzkobytnfwucrb` (pskhryjzkobytnfwucrb.supabase.co)
**Dato:** 2026-08-02
**Type:** Struktur-/størrelses-snapshot (backup-referanse)
**Verktøy:** Supabase MCP (list_tables, list_migrations, execute_sql)

---

## Sammendrag

| Metrikk | Verdi |
|---|---|
| Antall tabeller (public-schema) | **194** |
| Total størrelse public-schema | **42 MB** |
| Total DB-størrelse (inkl. auth/storage) | **191 MB** |
| Antall migrasjoner | **333** |
| RLS-status | Alle 194 tabeller har RLS aktivert ✅ |

Merk: Automatisert backup finnes allerede via `supabase-backup` Edge Function + `20260716_backup_cron`-migrasjonen (pg_cron). Dette dokumentet er et uavhengig struktur-snapshot som referanse for gjenoppretting/verifisering.

---

## Topp 10 største tabeller

| # | Tabell | Størrelse | Rader |
|---|---|---|---|
| 1 | `trades` | 8 560 kB | 1 054 |
| 2 | `balance_sync_audit` | 5 976 kB | 9 104 |
| 3 | `notification_queue` | 4 168 kB | 748 |
| 4 | `idempotency_keys` | 3 392 kB | 993 |
| 5 | `cron_job_runs` | 2 440 kB | 12 530 |
| 6 | `trading_logs` | 2 128 kB | 4 511 |
| 7 | `ai_feature_store` | 1 864 kB | 1 156 |
| 8 | `trading_signals` | 1 544 kB | 3 098 |
| 9 | `trading_sessions` | 1 272 kB | 389 |
| 10 | `trade_decisions` | 976 kB | 2 542 |

**Øvrige notable størrelser:** `cron_health_events` 712 kB (3 121 rader), `profiles` 424 kB (42), `user_profiles` 240 kB (40), `smart_trader_log` 280 kB (125), `trade_rejections` 216 kB (85), `ai_signal_outcomes` 216 kB (657), `market_intelligence` 208 kB (150), `trade_mistakes` 184 kB (176), `paper_accounts` 96 kB (36).

---

## Migrasjoner

- **333 migrasjoner** i `supabase_migrations.schema_migrations`.
- Tidligste: `001 core_schema` … `20240101000001 initial_setup`.
- Siste (2026-07-31): `20260731193642 20260731193000_guard_equity_fix_and_enforcement`, `20260731080004 fix_stale_cron_auth`, `20260731052042 db_lint_unindexed_fks`, `20260731023027 20260731020000_rls_lockdown_6_tables`.
- Migrasjonsfilene ligger lokalt i `supabase/migrations/` (Kilde: klarpakke-repo).

---

## Nøkkeltall for kjerne-tabeller

| Tabell | Rader | Kommentar |
|---|---|---|
| `trading_sessions` | 389 | Aktive/paused/arkiverte sesjoner |
| `trades` | 1 054 | Handler (paper + live) |
| `coin_prices` | 11 | NOK-priser (sync-prices 5-min) |
| `paper_accounts` | 36 | Lekepenge-konti (100k/1M) |
| `user_profiles` | 40 | Profiler |
| `profiles` | 42 | Legacy/parallell profil-tabell |
| `user_gamification` | 6 | XP/streak/level |
| `leaderboard_bots` | 11 | AI-botter på leaderboard |
| `system_flags` | 2 | Kill-switch m.m. |
| `pilot_guard_log` | 37 | Pilot-guard hendelser |
| `mifid2_reports` | 66 | MiFID II-rapporter |
| `reconciliation_runs` | 15 | Binance-rekonsiliering |
| `smart_trader_log` | 125 | Smart-trader logg |
| `live_events` | 25 | Live-hendelser |

---

## Verifiserings-query (gjenbrukbar)

```sql
-- Tabeller + størrelser (sortert)
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename::text)) AS size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename::text) DESC;

-- Totalsum
SELECT count(*) AS table_count,
       pg_size_pretty(COALESCE(sum(pg_total_relation_size(schemaname||'.'||tablename::text)),0)) AS total_size
FROM pg_tables WHERE schemaname = 'public';

-- Migrasjonsantall
SELECT count(*) FROM supabase_migrations.schema_migrations;
```

---

*Generert automatisk av Hermes cron (klarpakke-qa skill) — 2026-08-02.*

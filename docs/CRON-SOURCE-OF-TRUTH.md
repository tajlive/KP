# Cron – source of truth: Supabase

**Regel:** Cron skal alltid kjøres fra Supabase (pg_cron eller Supabase scheduler). Vercel Cron er ikke source of truth.

## Hva det betyr

- **Nye tidsplanlegginger:** Legges i Supabase (pg_cron-jobs som kaller appens `/api/cron/*` med `CRON_SECRET`, eller Supabase Edge Functions / andre Supabase-mekanismer). Ikke i `vercel.json` crons.
- **Eksisterende app-ruter:** `/api/cron/tick`, `/api/cron/update-usdt-nok`, `/api/cron/sync-prices`, `/api/cron/auto-trade`, `/api/cron/daily-summary`, `/api/cron/keepalive` forblir kallbare med `Authorization: Bearer <CRON_SECRET>`. **Hvem som kaller dem** er Supabase (pg_cron som sender HTTP-kall mot app-URL), ikke Vercel Cron.
- **vercel.json:** Eventuelle crons som i dag står i `vercel.json` (f.eks. keepalive, update-usdt-nok) bør på sikt migreres til Supabase, slik at én plattform styrer alle tidsplanlegginger.

## Hvor regelen står

- **AGENTS.md** – tabell «Cron (source of truth)»
- **.cursorrules** – seksjon Cron
- **docs/SETTINGS-2026.md** (når den opprettes) – Supabase-innstillinger
- **Plan:** MCP/API/CLI/ENV full optimalisering

## Konsekvens for kode og deploy

- Ved nye cron-behov: opprett pg_cron-job (eller tilsvarende) i Supabase som kaller `https://<APP_URL>/api/cron/<path>` med header `Authorization: Bearer <CRON_SECRET>`. Sett `CRON_SECRET` i Vercel env (eller der appen henter env).
- Ikke legg nye oppføringer i `vercel.json` → `crons`.
- **Skjema / migrasjoner (DDL)** er ikke en cron-oppgave: bruk GitHub Actions (`db-push-on-merge`) eller Supabase sin GitHub-integrasjon; se [automation/DB-SHIP-AUTO-OPS.md](./automation/DB-SHIP-AUTO-OPS.md) og `npm run db:ship`.

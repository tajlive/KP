# Klarpakke — gjeldende arkitektur

Dato: 2026-08-12

## SSoT

| Domene        | System                          |
| ------------- | ------------------------------- |
| Oppgaver/krav | Linear (team KLA)               |
| Kode          | GitHub (tajlive/KP)             |
| Data          | Supabase (pskhryjzkobytnfwucrb) |
| Runtime       | Cloudflare Workers (klarpakke)  |
| Governance    | Arch Control Plane (`.arch/`)   |

## Komponenter

- **Frontend:** Next.js 16 (App Router, OpenNext adapter for CF Workers), i18n (next-intl)
- **API:** Route handlers (`runtime:"nodejs"` for supabase-js-ruter), edge der mulig
- **DB:** Supabase (Postgres + pg_cron), paper_accounts = penge-fasit
- **Alert Layer:** Linear-first med fingerprint-dedup (`postLinearAlert`)
- **CI/CD:** GitHub Actions — test-gate → deploy → smoke → auto-rollback
- **Monitoring:** syntetisk monitor (hvert 5. min) + Sentry/GlitchTip + max-aggressive-monitor
- **Secrets:** BWS (fasit) + wrangler + GitHub Actions + `.env.local`

## Kjente risikoområder (fra failures/)

- Kapital-summering: kun active/paused sesjoner
- supabase-js: aldri edge-runtime
- OAuth (Honcho): én refresh-klient
- React Query: alltid QueryClientProvider

Full historikk: `knowledge/failures/`.

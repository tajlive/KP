# TODO — Automatisering og launch debt

Sist oppdatert: 2026-04-14

## P0
- Fullfør TypeScript cleanup etter Supabase RejectExcessProperties-endring; erstatt resterende svake casts med riktige typer der `as any` nå er midlertidig workaround.
- Verifiser `git push origin main`, `vercel --prod`, `signals:health` og `mempalace mine` etter grønn build.
- Flytt `signal-engine-5min` auth fra inline plaintext secret i `cron.job` til Vault/secret-basert mønster.

## P1
- Kartlegg og verifiser alle pg_cron-jobber som treffer `/api/cron/*`; bekreft spesielt `sync-prices`, `tick`, `signal-health-selfcheck`.
- Fjern 404-ruter i prod: `/leaderboard`, `/leagues`, `/varsler/innstillinger` eller lag placeholder-sider.
- Rydd locale-routing: fjern hardkodede `/no/`-lenker og fiks sitemap for engelske paths.

## P2
- Lag fast autopipeline: `tsc --noEmit` + `lint` + `git push` + `vercel --prod` + `signals:health` + `mempalace mine`.
- Dokumenter standard KIMI-runbook for deploy, rollback, DB, monitor og mempalace capture.
- Oppgrader KIMI/MCP-flyt så KIMI alltid er primær executor og Perplexity brukes som styring/rapportering.

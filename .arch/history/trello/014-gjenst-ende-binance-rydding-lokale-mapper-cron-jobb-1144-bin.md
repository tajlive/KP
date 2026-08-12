# Gjenstående Binance-rydding: lokale mapper, cron-jobb 1144, BINANCE\_\* secrets

- **Trello:** kort #14 · liste «🔄 Under arbeid» · opprettet 2026-08-09
- **Kilde:** https://trello.com/c/6a77e714 (board 6a77a7ac73020977260a3931)
- **Klassifisering:** Gruppe B — dokumentasjon (ikke flyttet til Linear)

## Innhold

**Funnet under Binance-rydding 2026-08-09 (Kimi):**

Gjenstår etter at binance-proxy + smart-trader-v3 ble slettet fra prod:

1. Lokale mapper `supabase/functions/binance-proxy/` og `supabase/functions/smart-trader-v3/` — koden finnes fortsatt lokalt, men er ikke deployet. Slettes eller arkiveres.
2. Inaktiv cron-jobb 1144 (`smart-trader-v3`) i pg_cron — peker på slettet funksjon. Bør fjernes (DB-endring, krever Toms godkjenning).
3. `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `BINANCE_PROXY_SECRET`, `BINANCE_TESTNET_*`, `BINANCE_ENCRYPTION_SECRET` i `.env.local` + evt. Supabase secrets — bør fjernes/roteres ut.
4. Kommentarer i `_consolidated/api-gateway.ts` refererer fortsatt binance-connector-logikk (lav prioritet).
5. Migrasjonsfiler med binance-historikk lar vi ligge (historikk, ikke levende kode).

Relatert kort: https://trello.com/c/ogGw5kvf

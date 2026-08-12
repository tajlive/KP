# Binance-rydding: binance-proxy + smart-trader-v3 slettet fra prod, 7 døde funksjoner fjernet lokalt

- **Trello:** kort #13 · liste «🔄 Under arbeid» · opprettet 2026-08-09
- **Kilde:** https://trello.com/c/6a77e700 (board 6a77a7ac73020977260a3931)
- **Klassifisering:** Gruppe B — dokumentasjon (ikke flyttet til Linear)

## Innhold

**Utført 2026-08-09 (Kimi):**

Slettet fra Supabase-prod:

- `binance-proxy` (var ACTIVE, sist oppdatert 2026-08-04 — ingenting i src/ kalte den)
- `smart-trader-v3` (cron-jobb 1144 allerede inaktiv; kalte api.binance.com direkte)

Fjernet lokalt (7 døde Edge Functions): binance-connector, binance-get-listen-key, binance-keep-alive-listen-key, binance-websocket, get-binance-prices, place-binance-order, sync-binance-trades.

**Bevis:**

- `supabase functions list` → 0 treff på binance/smart-trader
- `cron.job`: kun autopilot-orchestrator aktiv (→ klarpakke.no/api/cron/autopilot-orchestrator → Kraken)
- `information_schema`: ingen binance-tabeller i prod-DB
- src/: ingen kall til binance-proxy eller smart-trader (kun kommentarer)

AGENTS.md oppdatert (Markedsdata-seksjon + Paper Trading + historiske notater annotert). Endringer ikke committet — venter Toms OK.

Klar for uavhengig verifisering iht. flyt.

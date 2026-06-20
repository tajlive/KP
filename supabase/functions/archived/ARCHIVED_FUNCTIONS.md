# Arkiverte Edge Functions

Disse funksjonene er flyttet fra `supabase/functions/` til `supabase/functions/archived/`
som del av optimize-supabase-migreringen til selv-hostet infrastruktur.

## Liste

| Funksjon | Årsak til arkivering |
|----------|----------------------|
| `auto-trading-executor` | Duplikat av `auto-trade`; samme ansvarsområde. |
| `explain-trade` | Erstattet av Next.js API-ruten `/api/v1/ai/explain-trade`. |
| `kla130-setup` | Engangsoppsett for KLA-130; ikke lenger nødvendig i produksjon. |
| `kla154-setup` | Engangsoppsett for KLA-154; ikke lenger nødvendig i produksjon. |
| `taj-copy-sync` | Eksperimentell/personlig funksjon; ingen aktive kallere. |
| `taj-market-alerts` | Eksperimentell/personlig funksjon; ingen aktive kallere. |
| `taj-position-checker` | Eksperimentell/personlig funksjon; ingen aktive kallere. |
| `taj-referral-engine` | Eksperimentell/personlig funksjon; ingen aktive kallere. |
| `taj-trade-engine` | Eksperimentell/personlig funksjon; kun referert i gamle docs. |
| `test-trade-sync` | Testfunksjon for manuell debugging; ikke i aktiv bruk. |
| `track-referral-click` | Gammel analytics-funksjon; erstattet av klient-side sporingsløsning. |

## Notater

- Funksjoner som kalles av aktive `pg_cron`-migrasjoner er **ikke** arkivert:
  `auto-trade`, `signal-engine`, `strategy-runner`, `cron-daily-analysis`,
  `position-monitor`, `broadcast-telegram`.
- `sync-prices` finnes ikke som Edge Function; pris-synkronisering kjøres via
  Next.js API-rute `/api/cron/sync-prices` (kalt av pg_cron).
- For å gjenopprette en funksjon:
  ```bash
  mv supabase/functions/archived/<funksjon> supabase/functions/
  supabase functions deploy <funksjon>
  ```

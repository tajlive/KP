# Live-trading aktivering på testnet — full kjede (2026-08-01)

Første live-sesjon i Klarpakkes historie (testnet). Fem påfølgende blokkeringer
ble funnet og fikset. Kjeden som MÅ fungere for at en live-ordre går gjennom:

```
trading_sessions (mode=live) → tick → executeLiveTrade
  → ExecutorFactory (api_keys, is_testnet) → BinanceProxyExecutor
  → binance-proxy Supabase EF → testnet.binance.vision
```

## Steg-for-steg aktivering

1. **Sesjon**: `INSERT INTO trading_sessions (mode='live', status='active', ...)`.
   Unik-index `idx_unique_active_session (user_id, trading_pair, strategy_id) WHERE status='active'`
   — en live-sesjon kan ligge parallelt med aktiv paper-sesjon hvis strategy_id er ulik.
   Live-sesjonen min: `strategy_config.position_size` må settes høyt nok (0.20) —
   Kelly capper nye strategier (<10 trades) til `min(base×0.6, 0.05)`, regime
   "unknown" ×0.5, volatil ATR ×0.3 → ellers blir tradeAmount ~45-75 USDT.
2. **Risk-profil**: `risk_profiles` rad med `is_active=true` KREVES for live
   (ellers `risk_blocked: NO_RISK_PROFILE`). `name` er CHECK-begrenset til
   {forsiktig, moderat, aggressiv, tilpasset}; UNIK per user_id (oppdater
   eksisterende rad, ikke insert ny). `allowed_pairs` må inkludere symbolet.
3. **Minste-ordre-terskel**: `minOrderValueForMode()` — live=10 USDT, paper=100 NOK.
   Ikke bland: live-kapital er USDT, paper-kapital NOK.
4. **Symbol må finnes på Binance**: MATICUSDT finnes IKKE (migrert til POL 2024) →
   "400 Invalid symbol". Klarpakkes 11-symbolsliste er utdatert; bruk POLUSDT.
5. **Lot-size**: `roundToLotSize` fallback var BTC-presisjon (0.00001) for alle
   ukjente symboler → "400 Filter failure: LOT_SIZE". Nå statisk tabell for alle
   11 symboler + POLUSDT (verifisert mot testnet exchangeInfo).

## B1.3-kapital: ×9.66-inflasjon (P1)

Live-kapital er USDT-denominert. B1.3-blokken i tick/route.ts gjorde
`usdtToNok(netValueUsdt)` og kalte `decrement_capital(p_amount: netValueNok)` →
47 USDT-kjøp trakk 453 NOK fra USDT-kapital → current_capital 99546 (inflert).
RPC-ene oppdaterer kun `current_capital_nok`; trigger `trg_sync_capital_nok`
synker `current_capital` 1:1 → send USDT-beløpet DIREKTE, aldri usdtToNok.
Korrigering: sett `current_capital` + `current_capital_nok` manuelt, og
`starting_capital_nok`/`initial_capital` må speile USDT (ikke 100000 NOK).

## Feil-svar uten reason = tidlig return

Tick-resultater `{action:"hold"}` UTEN reason kommer fra tidlige returns:
- `tradeAmount < minOrderValueForMode()` (l. ~991)
- `quantity <= 0` (l. ~1008)

De fleste andre hold har reason. Bruk dette for å navigere: reason-mangel
peker mot størrelses-kanalen, ikke signal/guard-kanalen.

## Live-sesjon stoppes permanent

`executeLiveTrade` returnerer `permanent: true` for ikke-reparerbare feil
(dårlige nøkler, ugyldig symbol) → tick setter `status='stopped'`. Etter å ha
fikset rotårsaken MÅ sesjonen reaktiveres manuelt:
`UPDATE trading_sessions SET status='active', error_message=NULL, last_status_message=NULL, last_heartbeat=now(), last_tick_at=now() WHERE id=...`

## Verifiser at tick faktisk kjører

Tick-motoren kjører IKKE som Hermes-cron — den er Supabase pg_cron:
`cron.job` → `klarpakke-trading-tick` (`* * * * *`,
`SELECT klarpakke_trigger_cron('/api/cron/tick')`). Diagnostikk:
```sql
SELECT jobid, status, start_time FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname='klarpakke-trading-tick')
ORDER BY start_time DESC LIMIT 5;
```
Hvis siste kjøring er gammel → tick-motoren står. Sesjonens `last_heartbeat`
alder er den raskeste indikatoren. Manuell trigger:
`curl -X POST https://www.klarpakke.no/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"`

## Ensemble-signaler (tick-lesing)

Tick leser `trading_signals` med `signal_type='ensemble_ai'` og
`agent_id='ensemble_master'` (fallback: hvilken som helst agent_id), maxAge 4t.
`ensemble_master` skrives kun når konsensus nås. Ferske signaler:
```sql
SELECT symbol, action, confidence, created_at FROM trading_signals
WHERE signal_type='ensemble_ai' AND agent_id='ensemble_master'
AND created_at > now() - interval '2 hours' ORDER BY created_at DESC;
```

# Signaler, risikonivå og auto-trade – plassering og kostnad

## Hvor er risikonivå og auto-trade?

| Ting | Plassering i dag |
|------|-------------------|
| **Risikonivå** | **AutoTradingConfigCard** på trading-dashboard (`/[locale]/dashboard/trading`) – Konservativ / Balansert / Aggressiv. Lagres i `user_auto_trading_configs` (risk_level er ikke i DB ennå, default «medium»). Samme valg finnes i **BotWizard** (`/dashboard/auto-trade`) og **ClientBetaAutoTrade** (beta). |
| **Auto-trade på/av + modus** | Samme **AutoTradingConfigCard**: av/på, paper/live, max handelsstørrelse (NOK). |
| **Auto-trade oppsett og start** | Egen side **/dashboard/auto-trade** (BotWizard) – velg strategi, risikonivå, start bot. Lenke i sidebar: «Auto-trade». |

**Trading-dashboard** (`/dashboard/trading`) inneholder:
- SignalFeed (Binance-signaler)
- AutoTradingConfigCard (risikonivå, på/av, paper/live)
- PaperTradingCard, aktive strategier, siste trades, strategivelger

**Sidebar:** Hjem | Lær | **Handle** (→ /paper-trading) | **Auto-trade** (→ /dashboard/auto-trade) | Profil.

Vurdering: Risikonivå og auto-trade-innstillinger ligger naturlig på trading-dashboard; full oppstart er på /dashboard/auto-trade. For at flere skal finne signaler + risikonivå: legg til en tydelig lenke til **Trading** (f.eks. «Trading» eller «Signaler» som peker til `/dashboard/trading`) i sidebar eller under Handle.

---

## Oppdatering hvert 5. minutt – blir det dyrt?

**Signal-engine** kjøres i dag **én gang per time** (pg_cron `0 * * * *`). Hvis den kjøres **hvert 5. minutt**:

| | 1x/time | 1x/5 min |
|--|--------|----------|
| Kall per dag | 24 | 288 |
| Kall per måned | ~720 | ~8 640 |

**Supabase Edge Functions:**  
Gratisnivå har typisk 500 000 invokasjoner/mnd. 8 640 er langt under det – **nei, det blir ikke dyrt** å kjøre signal-engine hvert 5. minutt med tanke på invokasjoner.

**Binance API:**  
Hver kjøring henter klines + pris(er) fra Binance (offentlig API). 12x flere kall per time kan være innenfor rate limits; ved mange symboler/strategier bør du sjekke at du ikke overskrider Binance sin grense (f.eks. 1200 vektet kall/min).

**Konklusjon:** Å endre til hvert 5. minutt er rimelig med tanke på kostnad.

**Implementert (mars 2026):** Migrasjon `20260318120000_signal_engine_every_5min_and_realtime.sql` setter signal-engine til **hvert 5. minutt** og legger `trading_signals` i Realtime-publikasjonen slik at nye signaler dukker opp med en gang i UI (plus toast «Nytt signal: SYMBOL Kjøp/Salg»).

---

*Sist oppdatert: mars 2026*

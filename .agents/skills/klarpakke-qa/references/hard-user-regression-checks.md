# Hard-user regresjonssjekk (2026-07-22)

Bruk med vanskelig innlogget testbruker fra `references/test-users.md`. Formål: fange feil som vanlige røyktester ikke ser fordi brukeren har edge-data, papirsaldo og JokerTrade aktivert.

## Kritiske sjekker

1. **Pris/valuta på `/no/trade`**
   - BTC/ETH/XRP fra Binance er USDT. UI skal ikke vise rå USDT-verdi med `kr`.
   - Forventet: USDT→NOK-konvertert visning eller tydelig USD/USDT-label.
   - Feil funnet: BTC vist som ca. `65 918 kr` i stedet for NOK-verdi.

2. **Ingen falske data som ser reelle ut**
   - Tilfeldig generert chart/sparkline skal ikke rendres som reell NOK-pris.
   - Feil funnet: fake candle-chart viste stor NOK-verdi og forvirret balanse/pris.

3. **Balanse uten `NaN%`**
   - Dashboard skal vise papirsaldo når `paper_accounts.current_balance` finnes.
   - Feil funnet: `Ingen data` + `NaN%` selv med 100 000 kr papirsaldo i DB.

4. **Historikk skal ikke stole på client `supabase.auth.getUser()`**
   - `/no/dashboard/historikk` må bruke API-status som auth-sannhet.
   - Feil funnet: innlogget bruker fikk “Du er ikke innlogget.”

5. **Settings/profil må være API-first**
   - `/no/dashboard/settings` skal ikke være blank; redirect/render til profil settings-tab.
   - `/no/profile` skal ikke bruke server-`requireAuth()` i Worker; bruk `/api/user/profile` + client state.

6. **Dynamiske i18n-nøkler**
   - Statisk `i18n:usage` kan være grønn mens runtime feiler.
   - Sjekk browser console for `MISSING_MESSAGE`, spesielt `trading.riskMetrics.scoreDescription.*` og `scoreLabel.*`.

7. **Engelske strenger i norsk UI**
   - Se etter `Score tittel`, `Vis details`, `Invalid request`, `UKJENT`, `ANTALL HANDLER`.

8. **Unit-test hygiene etter UI-funn**
   - `opik` skal ikke være hard import i testkritisk kode.
   - Fill-konstanter: paper/estimator/backtest skal dele én `marketSlippageRate` (0.002).
   - Routes: canonical er `/trade`, `/dashboard/historikk`, `/jokertrade`; ikke gamle `/handel`/`/handelshistorikk` i nye tester.

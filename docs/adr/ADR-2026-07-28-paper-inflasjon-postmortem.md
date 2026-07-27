# ADR/Postmortem: Paper-inflasjon 2026-07-27 — salg uten beholdning + valuta-blanding

**Status:** Lukket (alle faser applied og verifisert i prod)
**Dato:** 2026-07-27 → 2026-07-28
**Forfatter:** Kimi Work (for Tom Jensen)
**Commits:** `9996087d7` (Fase 0) · `8b9d1a848` (Fase 1) · `294fe10db` (Fase 2) · `77fd9dae1` (Fase 2b+4) · `e31757aa1` (Fase 4b)
**Relatert:** ADR-2026-04-24-BALANCE-SOURCE-OF-TRUTH, migrasjon `20260727120000_single_balance_truth.sql`

---

## Problem

To samspillende bugs blåste opp paper-kapital for alle brukere med aktive bots:

1. **Salg uten beholdning.** Triggeren `trigger_update_session_state` krediterte
   full salgsverdi ved hvert salg — uten å sjekke at sesjonen faktisk eide
   posisjonen. Gjentatte salg mot samme (eller fantom-)posisjon printet penger.
2. **Valuta-blanding.** `current_capital` (USDT-denominert) og
   `current_capital_nok` ble oppdatert med samme rå-tall. Posisjoner arvet
   dessuten valuta fra foreldreløse («orphan») posisjoner adoptert med feil kurs.

Resultat før sanering: **Σ 103,0 mrd NOK** på tvers av sesjoner. 388 sesjoner
var korrupte, 38 hadde negativ kapital (overdraft-rester), og triggeren skrev
 dessuten sesjonssummer til `user_profiles`/`wallets`/`portfolios` på hver trade
 («balanse-krigen» — se `20260727120000`).

---

## Fiks — fire faser

| Fase | Hva | Nøkkel |
|---|---|---|
| **0** | Kode-guards: `position-currency.ts`, paper-salg `NO_POSITION`/clamp i `execute-trade.ts`, clamp + valuta-normalisering i `cron/tick`, verifisert adopsjon i `orphan-positions.ts` | 27 tester |
| **1** | Trigger-hardening: krediter kun `LEAST(solgt, beholdning)`; P&L kun ved basis_ratio 0,4–2,5, ellers NULL + audit | migrasjon `20260727233000` |
| **2** | Data-sanering: 388 sesjoner replayer fra trades (FIFO, clamped salg, median USDT/NOK fra trades). Σ 103,0 mrd → **133,2 mill NOK** | `scripts/phase2-sanering-recompute.py`, `sanering-fase2-rapport.md`, 388 audit-rader |
| **2b** | 38 negative kapitaler flooret til 0 (før-verdier i audit) + **validert CHECK-constraint** `trading_sessions_capital_nonnegative` — negativ kapital er nå umulig i DB | migrasjon `20260728000000` |
| **4** | Invariant-overvåking i `cron/balance-drift-check`: `negative_capital`, `negative_position` (sann oversalgs-fanger), `extreme_growth >10×` → JSON + Slack. View `session_position_flows` for diagnostikk | `session-invariants.ts` (rene funksjoner) |
| **4b** | Testbrukere (`@klarpakke.test` + allowlist) fritatt fra **kun** vekst-alarmen — ellers spammet 124×/491× testdata Slack hver cron | hentes dynamisk via `auth.admin.listUsers` |

**Verifisert etter fiks:** 0 negative rader · constraint `convalidated=true` ·
38 floor-audit-rader · 1488→1490 tester grønne · deploy `e31757aa1` live.

---

## Viktige konklusjoner (ikke åpenbare)

- **Sesjons-sum ≠ kontobalanse.** `paper_accounts.current_balance` er en separat,
  statisk hovedbok (dokumentert i `20260727120000`). Sesjoner er selvstendige
  og trekker IKKE konto. Hourly sync `klarpakke_hourly_balance_sync()` kopierer
  paper_accounts → profiles/wallets/portfolios — eneste skriver på den stien.
  Ingenting i gjeldende kode skriver paper_accounts ved trade.
- **All-time `solgt > kjøpt` er ikke en brudd-indikator** — det er uforanderlig
  historikk fra bug-æraen (601 par). Den sanne oversalgs-invarianten er
  `positions.quantity < 0`.
- **De 45 ikke-recomputede >2,5×-sesjonene er testdata** (10 seedede
  `@klarpakke.test`-tradere + Toms kontoer). Read-only simulering
  (`scripts/fase2c-simuler-glemte.py`) viste at de er aritmetisk konsistente
  med egne trades (±2 %) — Fase 2s utvelgelse fanget nøyaktig det korrupte
  settet. Re-recompute ville i noen tilfeller ØKT verdiene (bogus testpriser).
- **Ekte brukere er rene** — ingen drift hos ikke-test-kontoer.
- **Fase 3 (paper_accounts-utjevning) er bevisst droppet:** modellkandidatene
  ga villere tall enn status quo. Eneste absurde verdi er
  `viking.no@klarpakke.test` (−3,72 mrd) — testbruker, resettes ved
  testdata-rydding.

---

## Driftsnotater for neste agent

- **SQL mot prod:** bruk `curl` mot
  `POST https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query`
  med `SUPABASE_ACCESS_TOKEN` fra `~/.zshrc`. Python `urllib` gir 403 (Cloudflare).
- **`balance_sync_audit` har CHECK-constraints:** `check_type` må være en av
  `balance_mismatch / autopilot_health / bot_count / sell_oversell_clamped /
  pnl_skipped_implausible_basis / phase2_recompute`; `status` kun
  `ok / warning / error`. Gjenbruk eksisterende verdier — ikke finn på nye.
- **Deploy:** `source .env.local` FØR `npx wrangler deploy` (ellers feiler
  opplastingen stille — ingen "Uploaded"-linje, og `wrangler deployments list`
  viser gammel versjon). Verifiser alltid versjon etterpå.
- **Pre-commit tar 3–4 min** (AST + tsc) — kjør med timeout ≥ 300 s.

## Lærdommer

1. Skriv-side av penger må alltid clampe mot beholdning — aldri stol på at
   kalleren har sjekket (triggeren er siste forsvarslinje).
2. To kolonner for «samme» verdi i ulike valutaer er en invariant-bombe;
   rene funksjoner (`position-currency.ts`) + CHECK-constraints låser det.
3. Sanerings-skript skal være replayer (trades → tilstand), ikke patcher
   (tilstand → tilstand) — replay er bevisbart og re-kjørbart.
4. Testdata med ekstreme verdier må ekskluderes fra alarmer, ellers dør
   alarmtilliten (alarm-fatigue).

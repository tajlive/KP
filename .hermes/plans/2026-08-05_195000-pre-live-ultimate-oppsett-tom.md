# Pre-Live Checklist + Ultimat Oppsett: tomarnejensen@gmail.com

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Før første live-Kraken-trade for Toms konto: full sikkerhetsgjennomgang + det mest aggressive (men trygge) oppsettet som gir maksimal inntjening fra sekund én — all kapital investert, null idle USDT, grid fra første tick.

**Architecture:** Tre blokker: (1) **Pre-live security gates** — API-nøkkel-tillatelser, kill-switch-drill, dry-run, (2) **Ultimate allocation** — all kapital (BTC 60% + USDC 100%) → USDT fordelt på 3–4 backtest-verifiserte par med fee-bevisst spacing, (3) **Max-profit-mekanikk** — reinvest 80%, ingen kapital utenfor grid, ukentlig rebalansering fra best-config.

**Tech Stack:** Eksisterende: KrakenClient (Web Crypto+retry), KrakenGridTrader, kill-switch, auto-convert (USDC/EUR/USD→USDT), best-config backtest-pipeline. Nytt: allocation fra autopilot-planen (Task 2–5 i `2026-08-05_193000-kraken-full-autopilot.md`).

---

## Ærlig forventningsstyring (fakta, ikke fluff)

Tom krever «maksimal inntjening fra 1 sekund». Her er matematikken som styrer svaret:

| Parameter | Verdi |
|---|---|
| Kapital til grid (etter 60% BTC-salg + USDC-konvertering) | ~85 USDT |
| Kraken taker-fee round-trip (kjøp+salg) | 0,52% |
| Minimum grid-spacing for profitt etter fees | ~1,0% per nivå |
| Fordeling | 3 par × ~28 USDT × 5 nivåer |
| Netto gevinst per fylt nivå-runde | ~0,03–0,06 USDT |
| Realistisk daglig (1–3 fyll totalt, normal volatilitet) | ~0,05–0,20 USDT/dag |

**Konklusjon:** Med $100 er «maksimal inntjening» = riktig struktur, ikke store tall. Strukturen under maksimerer antall profitt-runder per krone: høy-vol par, tett-men-lovlønnsom spacing, all kapital i arbeid. Skaleres likt når kapitalen vokser (reinvest + nye innskudd).

---

## Task 1: Pre-live security gates (P0 — blokkerer alt)

**Objective:** Verifiser at verst tenkelige scenario er håndtert FØR første krone trades.

**Step 1: API-nøkkel-tillatelser (manuell Kraken-sjekk, Tom gjør i UI — 2 min)**
- Kraken → Settings → API → nøkkelen Klarpakke bruker:
  - ✅ Query funds, Query open orders/trades, Query ledger — PÅ
  - ✅ Modify orders, Cancel orders — PÅ
  - ❌ **Withdraw funds — AV** (en handelsbot skal ALDRI kunne ta ut penger; lekket nøkkel uten withdrawal = angriper kan ikke stjele, kun trade)
  - ❌ Query/withdraw fiat — AV
- IP-whitelist: IKKE aktuelt — Cloudflare Workers har dynamiske IP-er (dokumentert begrensning, samme som Binance TRD_GRP_031-problemet). Kompenseres med withdrawal=AV + kryptering at-rest.

**Step 2: 2FA på Kraken-kontoen** — verifiser aktiv (Google Auth/passkey).

**Step 3: Kill-switch-drill (dry)**
Run: `curl -X POST https://klarpakke.no/api/admin/kill-switch -H "Authorization: Bearer $CRON_SECRET" -d '{"userId":"0dd08529-b8a8-4fd3-9806-275e2d0135dd","reason":"pre_live_drill"}'`
Expected: 200, `ordersCancelled: 0` (ingen ordre ennå), `sessionsStopped: 0` — beviser endepunktet funker før det trengs.

**Step 4: AUTOPILOT_DRY_RUN-flagg**
- Create: miljøvariabel `AUTOPILOT_DRY_RUN` (Wrangler secret) — når `true`, logger orchestratoren alle AddOrder-kall uten å sende dem.
- Første aktivering kjøres med DRY_RUN=true → verifiser plan → sett false → kjør på nytt live.

**Step 5:** Commit: `feat: pre-live security gates + dry-run flagg`

---

## Task 2: Fullfør deploy-verifisering av d80d9760b

**Objective:** Bekreft at USDC-converteren faktisk er live (forrige deploy timet ut ved 300s).

Run: `curl -sL -o /dev/null -w '%{http_code}' https://klarpakke.no/api/health` (forvent 200) + `npx wrangler deployments list --name klarpakke | head -3` (forvent `d80d9760b` som aktiv versjon). Hvis ikke aktiv: `bash scripts/deploy.sh` på nytt (bakgrunn, notify_on_complete).

---

## Task 3: Toms konto — kapitalmobilisering (manuelt + API)

**Objective:** Alt unntatt 40% BTC skal inn i USDT, klart for grid.

**Nåværende beholdning (per 2026-08-05):** ~36,90 USD i BTC (0,000571 XBT) + ~60 USDC (kortkjøp, betalt EUR).

**Step 1:** Verifiser balanse via API
Run: KrakenClient.getBalance() med Toms nøkler — forvent `XXBT`, `USDC`, ev. `ZEUR`-rester.

**Step 2:** USDC → USDT
Run: `POST /api/kraken/auto-convert {"userId":"<tom>","fromAsset":"USDC","amount":<full USDC-balanse>}` med CRON_SECRET.
Expected: marketSell USDCUSDT, ~60 USDT inn. **Dette tester den nettopp deployete USDC-pathen med ekte penger.**

**Step 3:** BTC-rebalansering — selg 60% av BTC
- Behold 40% (~0,000228 XBT) som langsiktig posisjon
- Market-sell 0,000343 XBT → XBTUSDT (over ordremin 0,00005 ✅)
- ⚠️ Krever Toms eksplisitte OK — irreversibel handel (per plan-regel)

**Step 4:** Endelig USDT-total: ~85 USDT (22 fra BTC + 60 fra USDC + evt. rester)

---

## Task 4: Ultimate grid-allokering for ~85 USDT

**Objective:** Maks antall profitt-runder per krone, innenfor Kraken ordremin og fee-gulv.

**Allokering (3 par — konsentrasjon slår spredning på små beløp):**

| Par | Kapital | Nivåer | Per nivå | Ordremin-sjekk | Spacing | Begrunnelse |
|---|---|---|---|---|---|---|
| XBTUSDT | 30 USDT | 5 | 6,0 USDT | 0,00005 XBT ≈ 3,2 USDT ✅ | 1,2% | Dypest orderbok, minst slippage |
| ETHUSDT | 30 USDT | 5 | 6,0 USDT | 0,001 ETH ≈ 3,6 USDT ✅ | 1,5% | Høyest vol av store par |
| SOLUSDT | 25 USDT | 5 | 5,0 USDT | 0,06 SOL ≈ 4,8 USDT ✅ (strammest) | 1,8% | Høyest vol i universet → flest fyll |

**Regler som håndheves i Allocation Engine:**
- `capital/gridLevels >= ordremin × pris × 1,1` per par — ellers forkastes paret
- `spacing >= 1,0%` (2× taker-fee + margin) — ellers justeres gridLevels ned
- best-config (`getGridConfigForSymbol`) overstyrer range hvis sharpe ≥ 2.0 finnes for symbolet
- Reserve: alt under min-størrelse for nytt par (her ~0) rapporteres, ikke gjemmes

**Grid-oppførsel:** Sell-first-evaluering, trailing +2% på kjøpte celler, DCA under bunn (95/90/85% × multiplikator 1/1.5/2) — samme beviste logikk som paper-grid (klarpakke-trading-strategy skill).

**Step 5:** Verifiser i Kraken UI: 15 åpne limit-ordre (5+5+5) synlige under Orders → Open.

---

## Task 5: Max-profit-mekanikk (alltid-i-arbeid-regelen)

**Step 1:** Reinvest-cron (daglig 06:00): gevinst > 10 USDT → 80% reinvesteres i best-UTFØRENDE par (ikke blindt BTC — fiks kraken-reinvest.ts som i dag hardkoder BTCUSDT).
**Step 2:** Null idle-regel: etter hver tick, USDT > 20 som ikke er i åpne ordre → legges inn som ekstra grid-nivå på nærmeste par.
**Step 3:** Ukentlig rebalansering (søn 05:00, samme slot som backtest-sweep): nye best-config-parametere → grids re-sentreres rundt nåpris.
**Step 4:** Nye innskudd (deposit-poll) → auto-convert → re-allokering (autopilot Task 6).

---

## Task 6: Go/No-go + dokumentasjon

**Go-kriterier (alle må være ✅):**
- [ ] Withdrawal-tillatelse AV på Kraken-nøkkelen (Tom verifisert i UI)
- [ ] Kill-switch-drill kjørt og svart 200
- [ ] d80d9760b verifisert aktiv i prod
- [ ] USDC→USDT konvertert med ekte penger (Task 3.2) — beviser hele kjeden
- [ ] Dry-run av full allokering vist og godkjent av Tom (eksakt liste over 15 ordre med priser)
- [ ] Toms eksplisitte OK på BTC-salg (60%)

**No-go hvis:** noen av disse feiler — ingen unntak, det er Toms ekte penger.

---

## Risiko og tradeoffs

| Risiko | Sannsynlighet | Mitigering |
|---|---|---|
| SOL-nivået (5,0 USDT) er 4% over ordremin — prisfall 5% underjordisk gjør neste nivå ugyldig | Middels | Allocation Engine re-beregner nivåer ved rebalansering; SOL droppes til fordel for 2-par-oppsett hvis margin < 1,1× |
| Grid i sterk nedtrend → DCA kjøper fallende kniv | Kjent (paper-erfaring) | DCA tak = 3 nivåer, deretter full stopp; kill-switch |
| Fees spiser små gevinster | Garantert ved spacing < 1% | Hardt gulv 1,0% spacing |
| Nøkkel lekker | Lav | Withdrawal AV + AES-GCM at-rest + kill-switch |
| «Maks inntjening» ≠ dag én-profitt | Fakta | Grid trenger svingninger; flat dag = 0 fyll. Forventningsstyringen øverst er del av leveransen. |

**Åpent spørsmål til Tom:** 2-par-oppsett (BTC+ETH, 42 USDT hver, romsligere margin) vs 3-par (med SOL på minimumsmargin)? Min anbefaling: **3 par** — SOLs volatilitet er nettopp det grid lever av, og marginen holder.

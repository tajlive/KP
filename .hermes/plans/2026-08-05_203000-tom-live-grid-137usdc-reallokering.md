# Oppdatert Plan: Tom Live Grid — 137,45 USDC (etter +50 USDC)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Re-allokere Toms Kraken-grid etter tilskudd på 50 USDC: full 3-par-dekning (BTC+ETH+SOL) med alle 5 nivåer intakte på SOL, tett spacing rundt nåpris, trailing-salg ved fill — maksimalt antall profitt-runder per dag.

**Architecture:** Eksisterende live-grid (12 ordre, re-sentreret 2026-08-05 kveld) kanselleres og legges på nytt med oppdatert kapital. Deretter porter paper-gridens beviste trailing/DCA-logikk til en dedikert live-grid-manager (cron) som håndterer fills → salgsordre → re-kjøp automatisk.

**Tech Stack:** Kraken REST (signerte kall via python/execute_code nå, TypeScript-route for cron-manager), daglig analyse-cron (kl. 07:00, job ada921a4e191), kill-switch.

---

## Nåværende live-tilstand (verifisert 2026-08-05 kveld)

| Element | Verdi |
|---|---|
| Åpne ordre | 12 (BTC 5 @ 0,8% spacing, ETH 5 @ 1,0%, SOL 2 @ 4,8/6,0%) |
| USDC i grid | 87,45 |
| Ny tilskudd | +50 USDC (underveis/på konto) |
| **Ny grid-kapital** | **137,45 USDC** |
| BTC beholdt (40%) | 0,00022872 XBT (~$14,8) |
| Fills hittil | 0 (grid 1 var for bredt; grid 2 lagt ut i kveld) |

### Lærdommer fra grid 1 og 2 (innarbeides i denne planen)
1. **Grid 1 (1,2–1,8% spacing, 6–7,5% unna nåpris):** 0 fills på timer — for bredt ved oppstart i opptrend. Regel: alltid re-sentrer tett ved kapitalendring.
2. **Grid 2:** SOL lvl1–3 skippet (kapital/nivå under ordremin ×1.1). Med +50 USDC forsvinner denne begrensningen → full 5-nivås SOL.
3. **Trailing-mekanikk finnes ikke på live ennå** — fills uten motsatt salgsordre = gevinst aldri realisert. Prioritet #1 etter re-allokering.

---

## Task 1: Re-allokering ved 137,45 USDC (kjøres når 50 USDC er på konto)

**Objective:** Erstatt dagens 12 ordre med 15 fulle nivåer (5 per par).

**Step 1: Verifiser at 50 USDC er landet**
Run: `Balance` via signert kall — forvent `USDC >= 137`.
Hvis den kommer som fiat-kjøp direkte til USDC: ingenting å konvertere. Hvis EUR/USD: auto-convert (USDTEUR/USDTUSD er blokkert for NO — bruk USDCUSDT motsatt vei eller behold USDC som den er).

**Step 2: Kanseller alle åpne ordre**
Run: `OpenOrders` → `CancelOrder` per txid (som i kveldens re-sentrering).

**Step 3: Legg nytt grid — allokering**

| Par | Andel | Kapital | Nivåer | Spacing | Per nivå | Ordremin×1.1-sjekk |
|---|---|---|---|---|---|---|
| XBTUSDC | 38% | 52,2 USDC | 5 | 0,8% | 10,4 USDC | 3,56 ✅ |
| ETHUSDC | 32% | 44,0 USDC | 5 | 1,0% | 8,8 USDC | 2,11 ✅ |
| SOLUSDC | 30% | 41,2 USDC | 5 | 1,2% | 8,2 USDC | 4,92 ✅ |

**Alle nivåer grønne — SOL får endelig full dekning.**

Nivå-priser (beregnes på nåpris ved kjøring, format `price × (1 − spacing × i)`, i = 1..5):
- BTC: 0,8 / 1,6 / 2,4 / 3,2 / 4,0% under nåpris (desimaler: 1)
- ETH: 1,0 / 2,0 / 3,0 / 4,0 / 5,0% under (desimaler: 2)
- SOL: 1,2 / 2,4 / 3,6 / 4,8 / 6,0% under (desimaler: 2)

**Step 4: Verifiser**
Run: `OpenOrders` — forvent nøyaktig 15 kjøpsordre. Kryssjekk at totalt volum × pris ≈ 137 USDC (±1% avrunding).
Expected: 15 ordre, 0 feil.

---

## Task 2: Live-grid-manager — trailing-salg + fill-håndtering (P0 etter Task 1)

**Objective:** Automatisk gevinstrealisering uten manuell inngripen — kjernen i «kjapp inntjening».

**Problem i dag:** Når en kjøpsordre fylles, ligger crypto-en bare der. Ingen salgsordre legges før noen gjør det manuelt. Paper-grid løste dette med `checkFills()` + trailing; live mangler motstykket.

**Files:**
- Create: `scripts/kraken-grid-manager.mjs` (Node-script, kjøres av Hermes-cron hvert 5. min — IKKE Cloudflare-cron, fordi signering krever nøklene fra .env.local som ikke skal inn i Workers)
- Create: `scripts/__tests__/kraken-grid-manager.test.mjs`

**Step 1: Logikk (port av paper-grid trailing, klarpakke-trading-strategy skill)**

```
Hvert 5. minutt:
1. OpenOrders → sett av åpne txids
2. Sammenlign med state-fil (.hermes/kraken-grid-state.json):
   - ordre som VAR åpen men er borte = FILLED
3. For hver filled kjøpsordre:
   a. Legg SALGSORDRE umiddelbart: sell volum @ kjøpspris × 1.02 (trailing-aktivering +2%, dekker 0.52% round-trip-fee × 3.8 margin)
   b. Oppdater state: nivå markert "bought" med buyPrice
4. For hver filled salgsordre:
   a. Gevinst realisert → logg til .hermes/kraken-snapshots/
   b. Legg NY kjøpsordre på samme nivå (grid-cellen resettes)
5. USDC idle > 25 USDC → ekstra nivå på par med størst avstand til laveste nivå
6. SOL-oppfølging: hvis USDC ≥ 20 etter fills → forsøk SOL lvl1–3 på nytt
```

**Step 2: Test med mock-Kraken (vitest/node:test)**
- filled buy → sell-order plassert @ ×1.02
- filled sell → ny buy på samme pris
- dobbelkjøring = ingen duplikater (state-guard)

**Step 3: Registrer Hermes-cron `*/5 * * * *`**
Prompt: kjør `node scripts/kraken-grid-manager.mjs` fra /Users/taj/klarpakke, lever kun output ved endring (fills/salg), ellers stille.

**Step 4: Verifiser live:** vent på første fill (grid er nå tett — forventet innen timer ved normal vol), bekreft at salgsordre dukker opp i OpenOrders innen 5 min.

---

## Task 3: Utvid daglig analyse (07:00-cron ada921a4e191)

**Objective:** Legg til trailing-helse og 50-USDC-tilskudd i analysen.

**Step 1:** Oppdater cron-prompten: legg til sjekk «fills uten motsatt salgsordre innen 10 min = trailing-manager nede → KRITISK flagg».
**Step 2:** Snapshot-diff skal vise USDC 137,45-baseline fra i dag.
**Step 3:** Verifiser neste kjøring (kl. 07:00) produserer rapport hit i chatten.

---

## Task 4: Reinvest-loop (venter til første gevinst > 10 USDC)

**Objective:** 80% av realisert gevinst reinvesteres i par med best fill-rate.

**Step 1:** I grid-manager: akkumuler `realized_profit` i state-fil.
**Step 2:** Ved `profit > 10`: legg ekstra grid-nivå (0.8 × profit) på par med flest fills siste 7 dager. 20% forblir USDC-buffer.
**Step 3:** Test: simuler 12 USDC profit → nytt nivå plassert på riktig par.

---

## Risiko og tradeoffs

| Risiko | Mitigering |
|---|---|
| 50 USDC lander som EUR (ikke USDC) | Auto-convert USDT-blokk for NO gjelder ikke EUR→USDC... men USDT-par er blokkert — konvertering skjer via USDCEUR-salg (verifiser par før kjøring) |
| Tett grid = flere fills men mindre gevinst per runde | Bevisst valg: volum av runder > margin per runde ved 137 USDC. Spacing 0,8–1,2% > 0,52% fee-gulv med 1,5–2,3× margin |
| Grid-manager (lokal cron) nede → fills uten salgsordre | Daglig analyse flagger «fills uten motsatt ordre»; kill-switch kan alltid flate alt |
| Pris stiger og aldri faller tilbake → 0 fills | Normalt for grid i opptrend — kapitalen er da i BTC-beholdning (40%) som stiger. Ukentlig re-sentrering (søn 05:00) fanger opp |
| SOL-nivå under ordremin igjen ved prisfall | Manager re-beregner nivåer ved re-allokering; SOL droppes til 2 par hvis margin < 1,1× |

## Go-kriterier før Task 1 kjøres

- [ ] 50 USDC synlig i Balance
- [ ] Nåpriser hentet ferskt (samme minutt som ordre legges)
- [ ] Verifisering etter legging: 15 ordre, korrekte priser/volum

## Åpent spørsmål

Ingen blokkerende. (Tidligere besluttet: 3 par, full kapital, trailing P0, daglig analyse kl. 07.)

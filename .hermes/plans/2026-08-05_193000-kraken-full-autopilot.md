# Kraken Full Autopilot Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Klarpakke tar full kontroll over brukerens Kraken-konto — auto-allokerer kapital (BTC, fiat, framtidige innskudd) til optimale grid-setups, slik at både Tom og nye kunder (som vil erstatte tipping/lotto med 200 kr-sparing) får et ferdig «ultimat oppsett» uten å røre en innstilling.

**Architecture:** Tre-lags autopilot: (1) **Portfolio Scanner** leser Kraken-balanse og klassifiserer eiendeler (USDT / fiat / BTC / alt), (2) **Allocation Engine** fordeler kapital til grid-oppdeling per par via backtest-optimale parametere (`best-config`), (3) **Autopilot Orchestrator** kobler sammen deposit-deteksjon → auto-convert → grid-start → reinvest i én uforstyrret loop. Alt overvåkes av eksisterende Kill Switch.

**Tech Stack:** Next.js 16 API routes, Supabase (pg_cron + service role), KrakenClient (Web Crypto, edge-ready), eksisterende `KrakenGridTrader`, `kraken-reinvest.ts`, backtest-pipeline.

---

## Nåværende tilstand (verifisert 2026-08-05)

| Komponent | Status | Gap |
|---|---|---|
| KrakenClient (Web Crypto, retry/backoff) | ✅ Deployet | — |
| Symbol-mapping + min-ordre-verdier | ✅ Deployet | — |
| Kill Switch (kanseller ordre, stopp sesjoner) | ✅ Deployet | — |
| Auto-convert fiat→USDT | ✅ Deployet | Pair-navn fikset, men kalles kun fra deposit-webhook — ikke ved oppstart |
| Grid-start API | ✅ Deployet | Kun CRON_SECRET-auth (ikke bruker-auth), kun 1 symbol om gangen, hardkodede grid-parametere (10 nivåer, ±10%) |
| Auto-reinvest | ✅ Kode finnes | Hardkoder BTCUSDT, bruker ikke best-config, kalles ikke fra noe cron |
| Backtest-pipeline (`best-config`) | ✅ Kode finnes | **Ikke koblet til Kraken grid-start** — grid bruker fortsatt ±10% default |
| Deposit-polling | ✅ Deployet | Trigger auto-convert, men ikke grid-start etterpå |
| **Portfolio Scanner** | ❌ Finnes ikke | Må bygges |
| **Allocation Engine** | ❌ Finnes ikke | Må bygges |
| **Autopilot Orchestrator** | ❌ Finnes ikke | Må bygges |
| **Bruker-auth på /api/kraken/*** | ❌ Mangler | Alle ruter krever CRON_SECRET — kunder kan ikke koble til selv |
| **Autopilot UI** | ❌ Finnes ikke | «Aktiver autopilot»-knapp, status-visning |

### Tom-spesifikk situasjon
Tom har **kun BTC** på Kraken. Autopilot må støtte: selg deler av BTC → USDT → fordel på flere grid-par. Dette er en ny flyt (crypto-rebalansering), ikke bare fiat→USDT.

### Kunde-scenario (200 kr «erstatt tipping»-målgruppe)
Kunde setter inn 200 kr via SEPA → Kraken (EUR) → Klarpakke detekterer → konverterer til USDT → fordeler på 2–3 grid-par (ikke alle 9 — min-ordre-krav gjør små beløp umulig å spre for tynt). Med ordremin på Kraken (ADA: 20 ADA ≈ 16 USDT, DOT: 3.9 DOT ≈ 25 USDT) er **~20 USDT per par** praktisk minimum → 200 kr (~20 EUR ~ 21 USDT) gir realistisk **1–2 aktive par**. Planen må håndtere dette elegant (færre par for små beløp, ikke feil).

---

## Task 1: Bruker-auth på Kraken API-ruter

**Objective:** Kunder kan koble til Kraken og aktivere autopilot fra UI uten CRON_SECRET.

**Files:**
- Modify: `src/app/api/kraken/connect/route.ts` — legg til Supabase SSR-auth (cookie-basert `getUser()`), behold CRON_SECRET som alternativ for admin/cron
- Modify: `src/app/api/kraken/grid/start/route.ts` — samme dual-auth
- Modify: `src/app/api/kraken/auto-convert/route.ts` — samme dual-auth
- Test: `src/app/api/kraken/__tests__/auth.test.ts` (ny)

**Step 1:** Skriv test for dual-auth pattern
```typescript
// Tester at både cookie-auth og CRON_SECRET fungerer
// Mock: createClient fra @/lib/supabase/server
```

**Step 2:** Implementer auth-helper `src/lib/kraken/auth.ts`
```typescript
export async function resolveKrakenUser(request: NextRequest): Promise<
  { userId: string } | { error: NextResponse }
> {
  // 1. Sjekk CRON_SECRET header (admin/cron)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey === process.env.CRON_SECRET) {
    const body = await request.clone().json();
    return { userId: body.userId };
  }
  // 2. Sjekk Supabase session (bruker selv)
  const supabase = await createClient(); // SSR server client
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { userId: user.id };
  return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}
```

**Step 3:** Refaktorer alle 3 ruter til å bruke helperen. **Security rule:** bruker-auth kan KUN operere på egen userId (aldri body.userId — alltid user.id fra session).

**Step 4:** Kjør `npx vitest run src/app/api/kraken` — alle grønne.

**Step 5:** Commit: `feat: dual-auth (user+admin) på Kraken API-ruter`

---

## Task 2: Portfolio Scanner — les og klassifiser Kraken-balanse

**Objective:** Én funksjon som leser hele Kraken-porteføljen og returnerer strukturert bilde: USDT, fiat, BTC, andre crypto — med USDT-ekvivalenter.

**Files:**
- Create: `src/lib/kraken/portfolio-scanner.ts`
- Create: `src/lib/kraken/__tests__/portfolio-scanner.test.ts`

**Step 1:** Test først
```typescript
it("klassifiserer BTC + ZEUR + USDT korrekt", async () => {
  // Mock KrakenClient.getBalance() → { XXBT: "0.05", ZEUR: "100", USDT: "50" }
  // Mock getTicker for priser
  const scan = await scanKrakenPortfolio(client);
  expect(scan.crypto).toContainEqual({ asset: "XXBT", amount: 0.05, usdtValue: expect.any(Number) });
  expect(scan.fiat).toContainEqual({ asset: "ZEUR", amount: 100 });
  expect(scan.usdt).toBe(50);
  expect(scan.totalUsdtValue).toBeGreaterThan(0);
});
```

**Step 2:** Implementasjon
```typescript
export interface PortfolioScan {
  usdt: number;
  fiat: Array<{ asset: string; amount: number; usdtValue: number }>;
  crypto: Array<{ asset: string; amount: number; usdtValue: number }>;
  totalUsdtValue: number;
}

const FIAT_ASSETS = new Set(["ZUSD", "ZEUR", "USD", "EUR"]);
const DUST_THRESHOLD_USDT = 5; // under $5 = dust, ignorer

export async function scanKrakenPortfolio(client: KrakenClient): Promise<PortfolioScan> {
  const balance = await client.getBalance();
  // For hver asset med amount > 0:
  //   - USDT → usdt
  //   - fiat → hent USDT-pris via USDTUSD/USDTEUR ticker
  //   - crypto → hent USDT-pris via <ASSET>USDT ticker (fallback <ASSET>USD)
  // Filtrer bort dust < $5
  // Returner sortert etter usdtValue desc
}
```

**Step 3:** Test med reelle Kraken-responser (XXBT, ZEUR, USDT, tom balanse, dust).

**Step 4:** Commit: `feat: Portfolio Scanner for Kraken-balanse`

---

## Task 3: Allocation Engine — optimal fordeling per kapitalstørrelse

**Objective:** Gitt en portefølje-scan, beregn hvilke par som skal ha grid og hvor mye kapital hvert par får — med min-ordre-guard og backtest-optimale parametere.

**Files:**
- Create: `src/lib/kraken/allocation-engine.ts`
- Create: `src/lib/kraken/__tests__/allocation-engine.test.ts`
- Read: `src/lib/trading/backtest/best-config.ts` (getGridConfigForSymbol)
- Read: `src/lib/trading/edge-allocation.ts` (edge-vektet fordeling)

**Step 1:** Test — små beløp
```typescript
it("20 USDT → 1 par (BTC), ikke 9", () => {
  const plan = computeAllocation(20, SCAN_MED_20_USDT);
  expect(plan.grids).toHaveLength(1);
  expect(plan.grids[0].symbol).toBe("XBTUSDT");
  expect(plan.grids[0].capital).toBeGreaterThanOrEqual(MIN_GRID_CAPITAL);
});

it("200 USDT → 3 par, alle over min-ordre", () => {
  const plan = computeAllocation(200, SCAN_MED_200_USDT);
  expect(plan.grids.length).toBeLessThanOrEqual(3);
  for (const g of plan.grids) {
    const minOrder = parseFloat(krakenMinOrder(g.krakenPair));
    const price = g.currentPrice;
    expect(g.capital / g.gridLevels).toBeGreaterThanOrEqual(minOrder * price * 1.1);
  }
});
```

**Step 2:** Implementasjon — kjerne-logikk
```typescript
const MIN_GRID_CAPITAL_USDT = 15;  // praktisk min for én grid-celle over ordremin
const MAX_GRIDS_SMALL = 2;         // < 100 USDT
const MAX_GRIDS_MEDIUM = 4;        // 100–500 USDT
const MAX_GRIDS_LARGE = 8;         // > 500 USDT

export interface AllocationPlan {
  grids: Array<{
    symbol: string;        // internt format (BTCUSDT)
    krakenPair: string;    // XBTUSDT
    capital: number;       // USDT
    lowerPrice: number;
    upperPrice: number;
    gridLevels: number;
    currentPrice: number;
  }>;
  totalAllocated: number;
  reserve: number;         // ufordelt (for lite til nytt par)
}

export async function computeAllocation(
  totalUsdt: number,
  scan: PortfolioScan,
): Promise<AllocationPlan> {
  // 1. Bestem antall par fra totalUsdt (tiers over)
  // 2. Hent edge-vektet symbol-rangering (best-config sharpe per symbol)
  // 3. Plukk topp N symboler, fordel kapital jevnt (eller edge-vektet)
  // 4. Per symbol: hent best-config grid-params, re-sentrer rundt nåpris
  // 5. Guard: forkast par der capital/gridLevels < ordremin × pris × 1.1
  // 6. Rest → reserve
}
```

**Step 3:** Test mot ALLE ordremin-verdier (SOL 0.06, ADA 20, DOT 3.9 etc. — de verifiserte fra 2026-08-05).

**Step 4:** Commit: `feat: Allocation Engine med min-ordre-guard og best-config`

---

## Task 4: BTC-rebalansering — selg overflødig BTC til USDT

**Objective:** Tom-case: bruker har kun BTC. Autopilot må kunne selge en del av BTC → USDT for å finansiere multi-par grid.

**Files:**
- Create: `src/lib/kraken/rebalancer.ts`
- Create: `src/lib/kraken/__tests__/rebalancer.test.ts`
- Modify: `src/app/api/kraken/autopilot/activate/route.ts` (Task 5)

**Step 1:** Test
```typescript
it("beholder 40% BTC, selger 60% til USDT for grid", async () => {
  // Mock: 0.01 BTC (verdi 6000 USDT), keepBtcPct = 0.4
  const plan = planRebalance(scan, { keepBtcPct: 0.4 });
  expect(plan.sellOrders).toHaveLength(1);
  expect(plan.sellOrders[0].pair).toBe("XBTUSDT");
  expect(plan.sellOrders[0].volume).toBeCloseTo(0.006, 4);
});
```

**Step 2:** Implementasjon
```typescript
export interface RebalanceConfig {
  keepBtcPct: number;      // default 0.4 — behold 40% av BTC som langsiktig beholdning
  targetPairs: string[];   // fra Allocation Engine
}

export async function planRebalance(
  scan: PortfolioScan,
  config: RebalanceConfig,
): Promise<{ sellOrders: Array<{ pair: string; volume: string; estimatedUsdt: number }> }> {
  // For hver crypto-asset som ikke er USDT:
  //   - Hvis BTC: behold keepBtcPct, selg resten (market sell mot USDT)
  //   - Hvis annen alt (f.eks. ETH hos kunde): selg 100% mot USDT (grid tar seg av eksponering)
  // Guard: ikke selg hvis volum < ordremin
}
```

**⚠️ Risiko-avklaring for Tom:** Market-sell av 60% BTC er en reell, irreversibel handel. Aktivering av autopilot MÅ vise eksplisitt oppsummering («Vi selger 0.006 BTC (~X kr) og fordeler på disse parene: ...») og kreve bekreftelse. Dette er produkt-endring Tom må godkjenne visuelt før deploy.

**Step 3:** Commit: `feat: BTC-rebalansering for autopilot`

---

## Task 5: Autopilot Orchestrator — den samlede motoren

**Objective:** Én endepunkt + én cron-flow som kjører hele kjeden: scan → (rebalanser) → convert fiat → allocate → start grids → schedule reinvest.

**Files:**
- Create: `src/app/api/kraken/autopilot/activate/route.ts` — POST: aktiver autopilot for bruker
- Create: `src/app/api/kraken/autopilot/status/route.ts` — GET: status for bruker
- Create: `src/app/api/kraken/autopilot/deactivate/route.ts` — POST: stopp alt (bruk kill-switch-logikk per bruker)
- Create: `src/lib/kraken/autopilot.ts` — orchestrator-logikk
- Create: `supabase/migrations/YYYYMMDD_kraken_autopilot.sql` — `kraken_autopilot_configs` tabell
- Tests: `src/lib/kraken/__tests__/autopilot.test.ts`

**Step 1:** DB-migrasjon
```sql
CREATE TABLE kraken_autopilot_configs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  keep_btc_pct NUMERIC NOT NULL DEFAULT 0.4,
  max_grids INT,                     -- NULL = auto fra kapital
  last_scan_at TIMESTAMPTZ,
  last_allocation JSONB,             -- siste AllocationPlan (audit)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE kraken_autopilot_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own autopilot" ON kraken_autopilot_configs
  FOR SELECT USING (auth.uid() = user_id);
-- service_role: full access
```

**Step 2:** `activate` route — sekvens
```typescript
// 1. Auth (Task 1 helper, kun egen bruker)
// 2. Hent kraken-nøkler, dekrypter
// 3. scanKrakenPortfolio(client)
// 4. Hvis fiat > 5: auto-convert til USDT (gjenbruk auto-convert-logikk, ikke HTTP-kall — direkte funksjon)
// 5. Hvis crypto utover keepBtcPct: planRebalance → market sells → vent på fills (poll DepositStatus/TradeBalance, max 60s)
// 6. Re-scan etter konverteringer
// 7. computeAllocation(totalUsdt)
// 8. For hvert grid i plan: KrakenGridTrader.initialize + placeOrders
// 9. Lagre trading_sessions per grid + kraken_autopilot_configs
// 10. Returner lesbar oppsummering (nybegynner-språk: «Vi fordeler pengene dine på 3 støvsuger-oppsett...»)
```

**Step 3:** `status` route — vis: totalt USDT, aktive grids (par, nivåer, pending/filled ordrer), P&L så langt, neste reinvest-sjekk.

**Step 4:** `deactivate` — kanseller alle brukerens grid-ordre (gjenbruk kill-switch per-user path), sett is_enabled=false. **Ikke** market-sell posisjoner (la bruker bestemme — vis «Du har fortsatt X BTC og Y USDT på Kraken»).

**Step 5:** Tester for hele flyten med mockede KrakenClient.

**Step 6:** Commit: `feat: Autopilot Orchestrator — full Kraken-kontroll`

---

## Task 6: Koble deposit-polling → autopilot (kunde-flyt)

**Objective:** Kunde setter inn 200 kr → automatisk i grid uten å åpne appen.

**Files:**
- Modify: `src/app/api/webhooks/kraken/deposit/route.ts`
- Modify: `src/app/api/cron/kraken-deposit-poll/route.ts` (hvis separat)

**Step 1:** Etter vellykket auto-convert i deposit-webhook: sjekk `kraken_autopilot_configs.is_enabled` for brukeren. Hvis true → kjør autopilot allocate+grid-start for det nye beløpet (gjenbruk Task 5-funksjonen direkte, ikke HTTP).

**Step 2:** Idempotens-guard: ikke re-alloker hvis samme txid allerede prosessert (dedupe på deposit txid — mønster finnes allerede i deposit-poll).

**Step 3:** Test: simuler deposit-webhook → verifiser grid-start kalt.

**Step 4:** Commit: `feat: deposit→autopilot flyt for kunder`

---

## Task 7: Reinvest-loop koblet til best-config + multi-par

**Objective:** Fiks `kraken-reinvest.ts` slik at gevinst reinvesteres på tvers av par (ikke hardkodet BTCUSDT) med best-config-parametere, og koble til ukentlig cron.

**Files:**
- Modify: `src/lib/trading/kraken-reinvest.ts`
- Create: `src/app/api/cron/kraken-reinvest/route.ts`
- Test: oppdater/ny

**Step 1:** `checkAndReinvest` bruker `computeAllocation` for reinvest-beløpet i stedet for hardkodet BTCUSDT.

**Step 2:** Cron-route (daglig 06:00) itererer alle `kraken_autopilot_configs WHERE is_enabled=true` og kaller reinvest per bruker. Batch 25 om gangen (samme mønster som tick-parallellisering).

**Step 3:** Registrer pg_cron-job `klarpakke-kraken-reinvest` (daglig, ikke minutt — reinvest er ikke tid-kritisk).

**Step 4:** Commit: `feat: reinvest-loop multi-par + best-config`

---

## Task 8: Autopilot UI — aktivering og status (nybegynner-språk)

**Objective:** Brukere skal forstå hva autopilot gjør uten fagjargong.

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/autopilot/page.tsx` (eller integrer i /handel — avklar med Tom)
- Modify: i18n `messages/no.json` (+ en.json)
- Create: `src/components/kraken/AutopilotCard.tsx` — status-kort
- Create: `src/components/kraken/ActivateAutopilotDialog.tsx` — bekreftelsesflyt

**Step 1:** Aktiveringsdialog — TOM-GODKJENNING PÅKREVES (produkt-endring):
- Viser nåværende Kraken-beholdning («Du har 0.05 Bitcoin og 100 euro»)
- Viser planen i metafor-språk: «Vi legger ut støvsugere på 3 prisnivåer for Bitcoin, Ethereum og Solana. De kjøper litt hver gang prisen faller, og selger med gevinst når den stiger.»
- Viser eksplisitt: «Vi selger X av Bitcoin-en din for å fordele pengene» (kun hvis rebalansering)
- Checkbox: «Jeg forstår at Klarpakke handler med ekte penger på min Kraken-konto»
- Kill switch-info: «Du kan stoppe alt med én knapp når som helst»

**Step 2:** Status-visning: grids per par med «støvsuger»-visualisering (gjenbruk `GridLevelVisualization`), total verdi, gevinst så langt, «Stopp alt»-knapp (rød, alltid synlig).

**Step 3:** Playwright-screenshot av dialog + status FØR deploy (Tom-regel: visuell verifisering før «ferdig» erklæres).

**Step 4:** Commit: `feat: Autopilot UI med nybegynner-forklaringer`

---

## Task 9: End-to-end verifisering mot Kraken sandbox + prod-gates

**Step 1:** `npx tsc --noEmit` = 0, `npm run lint` = 0, `npm run test` = grønn (inkl. alle nye tester)
**Step 2:** Manuell test med Toms Kraken-nøkler i DRY-RUN-modus (ny env `AUTOPILOT_DRY_RUN=true` — alle market-orders logges men ikke sendes)
**Step 3:** Deploy
**Step 4:** Curl-verifiser: `/api/kraken/autopilot/status` med Toms session → 200 + lesbar JSON
**Step 5:** Første reelle aktivering: Tom godkjenner dialog → autopilot kjører → verifiser i Kraken UI at ordre faktisk ligger ute
**Step 6:** Kill-switch-test: aktiver, verifiser alle ordre kansellert

---

## Risiko, tradeoffs, åpne spørsmål

| Risiko | Mitigering |
|---|---|
| BTC market-sell er irreversibel | Eksplisitt bekreftelse i UI + dry-run først + behold 40% BTC som default |
| 200 kr for lite til meningsfull grid | Allocation Engine gir 1–2 par, ærlig UI («med 200 kr får du 1 støvsuger på Bitcoin») |
| Kraken fees (0.26% taker) spiser små grids | Grid-spacing må > 0.6% per celle for profitt etter fees — guard i Allocation Engine |
| Reinvest-logikk var forenklet (profit-beregning feil) | Task 7 må bruke reell trade-historikk (getTradeHistory), ikke balanse-basert gjetting |
| Brukere kobler til med feil API-tillatelser | Connect-route validerer allerede med getBalance — legg til sjekk for trade-tillatelse (plasser og kanseller en dust-test-ordre ved connect?) |

**Åpne spørsmål til Tom:**
1. **BTC-salg:** Er 40% behold / 60% til grid riktig default, eller vil du beholde mer BTC? (Alternativer: 25% / 50% / 75%)
2. **Kunde-minimum:** 200 kr → ~1 par. Skal vi sette 500 kr som anbefalt minimum i UI for «fullt oppsett» (3+ par), eller kjøre 1 par fra 200 kr?
3. **UI-plassering:** Egen /dashboard/autopilot-side, eller integrert i /handel som ny modus (Pilot-paper / Pilot-live)?
4. **Fees:** Kraken+ (månedsabonnement) fjerner 1% instant-fee — relevant å nevne for kunder med 200 kr, eller støtter vi kun API-grid (0.26%)?

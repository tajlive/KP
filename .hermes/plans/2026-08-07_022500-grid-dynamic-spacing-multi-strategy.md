# Klarpakke Grid-optimalisering — Dynamisk spacing + Multi-strategi

> **For Hermes:** Bruk `klarpakke-trading-strategy` + `test-driven-development` skills. Dette er Toms ekte penger ($153.10 på Kraken). Alle endringer må være fullt testet før deploy til prod.

**Goal:** Få Tom til å tjene penger umiddelbart ved å (1) aktivere orkestratoren som nå er fikset, (2) implementere volatilitets-basert grid-spacing, og (3) legge til DCA-strategi for perioder der grid ikke produserer fills.

**Architecture:** `processAutopilotUser` → `buildInitialBuyLevels(spacing=volatilitet)` → `runGridTick` → UPSERT `autopilot_state`. Dynamisk spacing leser 24h-volatilitet fra Kraken ticker (allerede hentet i pipelinen).

**Tech Stack:** TypeScript, Kraken API, `src/lib/trading/autopilot/orchestrator.ts`, `src/lib/trading/kraken-grid-config.mjs`

---

## Nåværende tilstand — Toms konto

| Parameter          | BTC     | ETH       | SOL    |
| ------------------ | ------- | --------- | ------ |
| Pris nå            | $64,269 | $1,899.50 | $72.64 |
| Høyeste kjøpsordre | $64,215 | $1,899.69 | $71.90 |
| Avstand til fyll   | 0.08%   | **0.01%** | 1.03%  |
| Spacing (statisk)  | 1.0%    | 1.0%      | 1.2%   |
| 24h volatilitet    | ~1.0%   | ~1.2%     | ~1.5%  |
| Kapital allokert   | $61.20  | $55.08    | $36.72 |
| Åpne kjøpsordrer   | 5       | 4         | 3      |

**ETH er 0.01% fra fyll.** Når orkestratoren kjører, vil den enten:

- Detektere at de 4 ETH-ordrene allerede finnes på Kraken og fortsette å overvåke
- ELLER (hvis autopilot_state er tom) legge nye 5+5+1 nivåer som KAN overlappe med eksisterende ordrer

**Kritisk:** Nåværende Kraken-ordrer (11 stk) er IKKE registrert i `autopilot_state.grid_levels` (som er `[]`). Orkestratoren vil ved første kjøring legge NYE nivåer. Disse kan duplisere eksisterende ordrer. Løsning: importer eksisterende ordrer inn i autopilot_state før første orchestrator-kjøring.

---

## Fase 0: Importer eksisterende Kraken-ordrer + trigger orchestrator (nå)

**Mål:** Få autopilot_state i sync med Kraken, og kjør orkestratoren.

### Task 0.1: Importer eksisterende ordrer til autopilot_state

**Objective:** Les Toms 11 åpne Kraken-ordrer og skriv dem inn i `autopilot_state.grid_levels` så orkestratoren ikke dupliserer.

**Files:**

- Les: Kraken API (allerede gjort — 11 ordrer)
- Skriv: `autopilot_state` tabell

**Step 1: Oppdater grid_levels i DB**

```sql
UPDATE autopilot_state
SET grid_levels = '{
  "SOLUSDC": [
    {"txid":"OTR2G7-DLJLV-TS2MGL","side":"buy","pair":"SOLUSDC","price":70.11,"volume":"0.11866496","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OVNEVO-BOWLP-3W4XPJ","side":"buy","pair":"SOLUSDC","price":71.01,"volume":"0.11716096","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OTGVLO-R2KBV-CKH7BI","side":"buy","pair":"SOLUSDC","price":71.90,"volume":"0.11571071","status":"open","placedAt":"2026-08-06T00:00:00Z"}
  ],
  "ETHUSDC": [
    {"txid":"OPE2L3-64FM6-DWXZIZ","side":"buy","pair":"ETHUSDC","price":1821.35,"volume":"0.00487234","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OE7WLS-QBPUU-QUXGB2","side":"buy","pair":"ETHUSDC","price":1840.52,"volume":"0.00482159","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OAUW5Z-L7O3A-ZC7D3D","side":"buy","pair":"ETHUSDC","price":1859.69,"volume":"0.00477189","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"O5FWTP-CZR6M-KCHIYY","side":"buy","pair":"ETHUSDC","price":1878.87,"volume":"0.00472318","status":"open","placedAt":"2026-08-06T00:00:00Z"}
  ],
  "BTCUSDC": [
    {"txid":"O2ZLQ6-CMIQR-XHT3BA","side":"buy","pair":"BTCUSDC","price":62143.2,"volume":"0.00016958","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OUIXWR-U3T5R-JIYFUX","side":"buy","pair":"BTCUSDC","price":62661.1,"volume":"0.00016818","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OCG2SO-UFBG2-A7AQRS","side":"buy","pair":"BTCUSDC","price":63179.0,"volume":"0.00016680","status":"open","placedAt":"2026-08-06T00:00:00Z"},
    {"txid":"OHBL4F-N37CP-QCNM2J","side":"buy","pair":"BTCUSDC","price":63696.8,"volume":"0.00016544","status":"open","placedAt":"2026-08-06T00:00:00Z"}
  ]
}'::jsonb
WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
```

Expected: `UPDATE 1`

**Step 2: Trigger orchestrator**

```bash
curl -X POST "https://www.klarpakke.no/api/cron/autopilot-orchestrator" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected: `processed=1, errors=0`. Orkestratoren finner grid_levels allerede fylt → kjører `runGridTick` som overvåker fills → legger salgsordre når kjøp fylles.

**Step 3: Verifiser at ETH-nivået på $1,899.69 overvåkes**

```sql
SELECT grid_levels->'ETHUSDC' FROM autopilot_state WHERE user_id = '0dd08529-...';
```

Expected: 4 ETH-entries med status='open', inkludert nivået på $1,899.69.

---

## Fase 1: Dynamisk grid-spacing basert på 24h-volatilitet

**Mål:** Juster spacing automatisk så nivåene treffes oftere i lavvolum-markeder.

### Task 1.1: Lag `computeDynamicSpacing` — ren funksjon

**Objective:** Beregn optimal spacing fra 24h high/low range. TDD: skriv test først.

**Files:**

- Create: `src/lib/trading/dynamic-spacing.ts`
- Create: `src/lib/trading/__tests__/dynamic-spacing.test.ts`

**Design:**

```
spacing = max(fee_guard, min(max_spacing, base_spacing × volatility_ratio))

der:
  volatility_ratio = current_24h_range_pct / baseline_range_pct
  baseline_range_pct = 2.0% (normal volatilitet)
  base_spacing = PAIR_CFG[pair].spacing
  max_spacing = base_spacing × 1.5
  fee_guard = 2 × taker_fee × 1.9 = 0.988% ≈ 1.0%
```

Dagens volatilitet: BTC 1.0%, ETH 1.2%, SOL 1.5%
→ volatility_ratio: BTC 0.50, ETH 0.60, SOL 0.75
→ spacing: BTC 0.50% (guarded til 1.0% pga fee), ETH 0.60% (guarded til 1.0%), SOL 0.90% (OK)

Resultat: I ekstremt lavt volatilitetsmiljø (< 1%) beholdes 1.0% spacing pga fee-guard. I normalt miljø (2%) brukes konfigurert spacing. I høyt miljø (4%+) økes spacing til 1.5x.

**Step 1: Skriv test**

```typescript
// src/lib/trading/__tests__/dynamic-spacing.test.ts
import { describe, it, expect } from "vitest";
import { computeDynamicSpacing } from "../dynamic-spacing";

describe("computeDynamicSpacing", () => {
  it("bruker base spacing ved normal volatilitet (2%)", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 65000,
      low24h: 63700,
    });
    expect(s).toBeCloseTo(0.01, 3); // 2% range → ratio 1.0 → uendret
  });

  it("reduserer spacing ved lav volatilitet", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.012,
      high24h: 73.0,
      low24h: 71.9,
    });
    expect(s).toBeCloseTo(0.009, 3); // 1.5% range → ratio 0.75 → 0.75 × 0.012 = 0.009
  });

  it("øker spacing ved høy volatilitet", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 68000,
      low24h: 62000,
    });
    expect(s).toBeCloseTo(0.015, 2); // 9.2% → clamped til 1.5x max → 0.015
  });

  it("respekterer fee-guard (aldri under 1.0%)", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 64100,
      low24h: 64000,
    });
    expect(s).toBe(0.01); // 0.16% range → ville gitt 0.08% spacing, men guardes
  });

  it("bruker fallback-spacing når high/low mangler", () => {
    const s = computeDynamicSpacing({
      baseSpacing: 0.01,
      high24h: 0,
      low24h: 0,
    });
    expect(s).toBe(0.01); // ingen data → base spacing
  });
});
```

**Step 2: Implementer**

```typescript
// src/lib/trading/dynamic-spacing.ts

export interface DynamicSpacingInput {
  baseSpacing: number;
  high24h: number;
  low24h: number;
  feeGuardPct?: number;
  maxMultiplier?: number;
  baselineRangePct?: number;
}

export function computeDynamicSpacing(input: DynamicSpacingInput): number {
  const {
    baseSpacing,
    high24h,
    low24h,
    feeGuardPct = 0.01,
    maxMultiplier = 1.5,
    baselineRangePct = 0.02,
  } = input;

  if (high24h <= 0 || low24h <= 0) return baseSpacing;

  const currentRangePct = (high24h - low24h) / low24h;
  const volatilityRatio = currentRangePct / baselineRangePct;
  const clampedRatio = Math.max(0.5, Math.min(maxMultiplier, volatilityRatio));
  const spacing = Math.max(feeGuardPct, baseSpacing * clampedRatio);

  return Math.round(spacing * 10000) / 10000;
}
```

**Step 3: Kjør tester**

```bash
npx vitest run src/lib/trading/__tests__/dynamic-spacing.test.ts --reporter=verbose
```

Expected: 5/5 passed.

---

### Task 1.2: Integrer dynamisk spacing i orkestratoren

**Objective:** `buildInitialBuyLevels` bruker dynamisk spacing istedenfor statisk `PAIR_CFG[pair].spacing`.

**Files:**

- Modify: `src/lib/trading/autopilot/orchestrator.ts:229-276` (`buildInitialBuyLevels`)
- Modify: `src/lib/trading/autopilot/__tests__/orchestrator.test.ts` (legg til test med dynamisk spacing)

**Step 1: Endre `buildInitialBuyLevels` til å akseptere `spacing` som parameter**

I `buildInitialBuyLevels` opts, erstatt lesing av `cfg.spacing` med en `spacing`-parameter:

```typescript
export function buildInitialBuyLevels(opts: {
  pair: string;
  currentPrice: number;
  capitalUsdc: number;
  levels: number;
  minLevelUsdc: number;
  levelSizeMultiplier: number;
  spacing: number;  // NY: dynamisk spacing
}): InitialLevel[] {
  const { pair, currentPrice, capitalUsdc, levels, minLevelUsdc, levelSizeMultiplier, spacing } = opts;
  const cfg = PAIR_CFG_LOOKUP[pair];
  if (!cfg || currentPrice <= 0 || capitalUsdc <= 0 || levels <= 0) return [];
  // ... resten uendret, men bruk spacing istedenfor cfg.spacing
```

**Step 2: I `processAutopilotUser`, beregn dynamisk spacing fra ticker-data**

```typescript
// I loopen over operatePairs (linje 451):
const ticker = await client.getTicker(pair);
const currentPrice = parseFloat(ticker?.c?.[0] ?? "0") || 0;
const high24h = parseFloat(ticker?.h?.[1] ?? "0") || 0;
const low24h = parseFloat(ticker?.l?.[1] ?? "0") || 0;
prices[pair] = currentPrice;

const dynamicSpacing = computeDynamicSpacing({
  baseSpacing: cfg.spacing,
  high24h,
  low24h,
});
```

**Step 3: Oppdater orchestrator-tester**

Legg til en test som verifiserer at spacing justeres basert på 24h high/low:

```typescript
it("bruker dynamisk spacing basert på 24h-volatilitet", async () => {
  const { db } = makeDb({
    keys: await keysRow(),
    state: stateRow({ grid_levels: {} }),
  });
  getBalanceMock.mockResolvedValue({ USDC: "150" });
  // Lav volatilitet: high=90300 low=89700 → 0.67% range → spacing reduseres
  getTickerMock.mockImplementation(async (pair: string) => ({
    ...ticker(PRICES[pair] ?? "100"),
    h: [PRICES[pair], "90300"], // [today, 24h]
    l: [PRICES[pair], "89700"],
  }));

  const result = await processAutopilotUser(db, "u1");
  expect(result.ok).toBe(true);
  // spacing = 0.01 × (0.67%/2.0%) = 0.00335 → guardet til 0.01 (fee-guard)
  // Nivåene skal fortsatt legges med 1.0% spacing
});
```

**Step 4: Kjør ALLE orchestrator-tester**

```bash
npx vitest run src/lib/trading/autopilot/__tests__/ --reporter=verbose
```

Expected: Alle 15+ tester passerer. Ingen regresjon.

---

## Fase 2: DCA-strategi som fallback

**Mål:** Når grid ikke produserer fills på > 24 timer, fall tilbake til DCA (akkumuler posisjon over tid).

### Task 2.1: Lag `shouldFallbackToDCA` — ren funksjon

**Objective:** Detekter når grid har 0 fills på > 24 timer og utløs DCA-modus.

**Files:**

- Create: `src/lib/trading/strategy-fallback.ts`
- Create: `src/lib/trading/__tests__/strategy-fallback.test.ts`

**Step 1: Skriv test**

```typescript
import { describe, it, expect } from "vitest";
import { shouldFallbackToDCA } from "../strategy-fallback";

describe("shouldFallbackToDCA", () => {
  it("utløser DCA når ingen fills på > 24 timer", () => {
    const lastFill = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    expect(shouldFallbackToDCA({ lastFillAt: lastFill, totalFills: 0 })).toBe(
      true,
    );
  });

  it("utløser IKKE DCA når fills < 24 timer siden", () => {
    const lastFill = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(shouldFallbackToDCA({ lastFillAt: lastFill, totalFills: 5 })).toBe(
      false,
    );
  });

  it("utløser IKKE DCA når grid har produsert fills", () => {
    expect(shouldFallbackToDCA({ lastFillAt: null, totalFills: 10 })).toBe(
      false,
    );
  });

  it("utløser DCA når ingen fills noensinne og grid > 24 timer gammel", () => {
    const firstRun = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    expect(
      shouldFallbackToDCA({
        lastFillAt: null,
        totalFills: 0,
        firstRunAt: firstRun,
      }),
    ).toBe(true);
  });
});
```

**Step 2: Implementer**

```typescript
export interface FallbackInput {
  lastFillAt: string | null;
  totalFills: number;
  firstRunAt?: string | null;
  idleThresholdHours?: number;
}

export function shouldFallbackToDCA(input: FallbackInput): boolean {
  const { lastFillAt, totalFills, firstRunAt, idleThresholdHours = 24 } = input;

  if (totalFills > 0) return false;

  const referenceTime = lastFillAt ?? firstRunAt;
  if (!referenceTime) return false;

  const hoursSince =
    (Date.now() - new Date(referenceTime).getTime()) / (3600 * 1000);
  return hoursSince > idleThresholdHours;
}
```

### Task 2.2: Implementer DCA-modus i orkestratoren

**Objective:** Når `shouldFallbackToDCA` utløses, gjør én DCA-kjøpsordre per tick istedenfor å vente på grid-fills.

**Files:**

- Modify: `src/lib/trading/autopilot/orchestrator.ts`

**Step 1: Legg til DCA-logikk i `processAutopilotUser`**

Etter grid-tick-loopen, hvis ingen fills:

```typescript
// DCA-fallback — hvis grid ikke har produsert fills
if (fills === 0) {
  const dcaTrigger = shouldFallbackToDCA({
    lastFillAt: state?.last_fill_at ?? null,
    totalFills: state?.total_fills ?? 0,
    firstRunAt: state?.created_at ?? null,
  });

  if (dcaTrigger) {
    // DCA: kjøp for 10% av idle USDC på paret med minst gap
    const idlePair = pickIdlePair(operatePairs, gridLevels, prices);
    if (idlePair) {
      const cfg = PAIR_CFG_LOOKUP[idlePair.pair]!;
      const idleUsdc = ...; // beregn tilgjengelig USDC
      const dcaAmount = Math.min(idleUsdc * 0.1, 10); // 10% av idle, maks $10
      const dcaVolume = (dcaAmount / prices[idlePair.pair]).toFixed(8);
      try {
        const res = await client.marketBuy(idlePair.pair, dcaVolume);
        // ... registrer i grid_levels
      } catch (e) { ... }
    }
  }
}
```

**Step 2: Oppdater tester**

Legg til test for DCA-fallback i orchestrator-tester.

---

## Fase 3: Live-overvåkning og varsling

### Task 3.1: Legg til fill-deteksjon i watchdog

**Objective:** Cron-job som varsler når Tom får fills (inntjening!).

**Files:**

- Create: `~/.hermes/scripts/kraken-fill-watchdog.sh`

**Script:**

```bash
#!/bin/bash
# Sjekk om Tom har fått nye fills siden sist
PREV=$(cat /tmp/klarpakke-fills-count 2>/dev/null || echo 0)
CURRENT=$(curl -s "https://www.klarpakke.no/api/kraken/live-state" \
  -H "Cookie: sb-..." 2>/dev/null | python3 -c "
import json,sys; d=json.load(sys.stdin)
orders = d.get('snapshot',{}).get('orders',[])
filled = [o for o in orders if o.get('status') == 'filled']
print(len(filled))
" 2>/dev/null)

if [ "$CURRENT" -gt "$PREV" ]; then
  echo "💰 Tom fikk $((CURRENT - PREV)) nye fills! Total: $CURRENT"
  echo "$CURRENT" > /tmp/klarpakke-fills-count
fi
```

---

## Risikoer

| Risiko                                                             | Sannsynlighet | Håndtering                                                     |
| ------------------------------------------------------------------ | ------------- | -------------------------------------------------------------- |
| Dupliserte ordrer ved orchestrator-førstegangskjøring              | HØY           | Task 0.1: Importer eksisterende ordrer FØR orchestrator kjøres |
| Kraken rate-limit                                                  | Middels       | 3 retries i KrakenClient, vent 60s mellom manuelle triggere    |
| DCA kjøper på topp                                                 | Middels       | Maks $10 per DCA-kjøp. Grid er primærstrategi                  |
| Dynamisk spacing for stram → flere små handler, høyere fee-kostnad | Lav           | Fee-guard (1.0%) forhindrer ulønnsom spacing                   |
| Toms $153 equity for lite for 5-par                                | Ingen         | Allokator håndterer dette: < $250 → kun 3 par                  |

---

## Estimert inntjening

| Strategi                   | Frekvens | Est. per fyll | Est. per uke (3 par)          |
| -------------------------- | -------- | ------------- | ----------------------------- |
| Grid (statisk 1%)          | ~1-2/uke | $0.50-2.00    | $3-12                         |
| Grid (dynamisk spacing)    | ~3-5/uke | $0.50-2.00    | $10-30                        |
| DCA-fallback (ved 0 fills) | Daglig   | $0.10-0.50    | $1-3                          |
| **Kombinert**              | —        | —             | **$15-35/uke (10-23% årlig)** |

---

## Verifisering

- [ ] ETH $1,899.69-nivået fylles (0.01% fra nåpris — bør skje innen timer)
- [ ] Orkestrator legger salgsordre @ $1,937.68 når ETH-kjøp fylles
- [ ] Dynamisk spacing-tester passerer (5/5)
- [ ] Orchestrator-tester passerer alle (ingen regresjon)
- [ ] `autopilot_state.last_run` oppdateres hvert 5. min
- [ ] `autopilot_state.grid_levels` viser riktig antall ordrer

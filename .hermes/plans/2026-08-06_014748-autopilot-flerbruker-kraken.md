# Klarpakke Autopilot — Flerbruker Kraken Grid Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development — fersk subagent per task, to-stegs review (spec → kode). Bygg på eksisterende infrastruktur (KrakenClient, grid-manager-mønster, backtest-pipeline). TDD på alle rene funksjoner.

**Goal:** Skalere Toms live-grid (~153 USDC, 1 bruker) til **alle brukere med Kraken-kobling** — full autopilot: innskudd → automatisk grid → rebalansering → reinvestering → compound.

**Architecture:** Cron-orchestrator (hvert 5. min) → per-bruker pipeline: scan portfolio → allocate capital → run grid (buy/sell/reinvest) → sync state to DB. Eksisterende KrakenClient + GridBotStrategy-mønster gjenbrukes.

**Tech Stack:** TypeScript, vitest, Supabase (user_kraken_keys + autopilot_state), Kraken REST, pg_cron, Cloudflare Workers.

**Bygger på:**
- `src/lib/exchanges/kraken/client.ts` — KrakenClient (REST, HMAC-SHA512)
- `src/lib/trading/kraken-grid.ts` — KrakenGridTrader (per-bruker grid)
- `src/lib/trading/kraken-kill-switch.ts` — drawdown-kill (TDD-testet, progressiv)
- `src/lib/trading/kraken-grid-config.mjs` — PAIR_CFG SSoT
- `scripts/kraken-grid-manager.mjs` — Toms grid (mønster for flerbruker)
- `src/lib/trading/backtest/best-config.ts` — backtest-drevne parametere
- `src/lib/trading/edge-allocation.ts` — edge-vektet kapitalfordeling
- `supabase/migrations/*` — user_kraken_keys finnes; autopilot_state må opprettes
- `src/app/api/webhooks/kraken/deposit/route.ts` — deposit-webhook finnes

---

## Fase A — Infrastruktur (DB + auth)

### Task A1: Fiks connect-ruta (blokkert: upsert uten onConflict)

**Problem:** `POST /api/kraken/connect` feiler med `"Invalid API keys"` selv med gyldige nøkler — `upsert` uten `onConflict`-felt i Supabase-kallet.

**Files:** `src/app/api/kraken/connect/route.ts`

**Step 1:** Les ruten, finn upsert-kallet mot `user_kraken_keys`.
**Step 2:** Skriv test: nøkler lagres kryptert (AES-GCM) og kan leses tilbake.
**Step 3:** Fiks upsert → `{ onConflict: "user_id" }` (men tabellen har ingen unik constraint på user_id — kun `WHERE NOT EXISTS`-mønster, se trading-strategy-skillens pitfall).
**Step 4:** Verifiser: valid nøkkel → 200 OK, invalid → 400 med beskrivende feil.
**Step 5:** Commit.

### Task A2: Autopilot-state DB-tabell

**Objective:** Én tabell for per-bruker autopilot-tilstand (grid-nivåer, equity, realized_profit, last_run, activated).

**Files:**
- Create: `supabase/migrations/20260806_autopilot_state.sql`
- Generate: `supabase:generate-types` (oppdater `database.types.ts`)

```sql
CREATE TABLE IF NOT EXISTS autopilot_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activated boolean NOT NULL DEFAULT false,
  initial_equity_usdc numeric(18,8) NOT NULL DEFAULT 0,
  current_equity_usdc numeric(18,8) NOT NULL DEFAULT 0,
  realized_profit_usdc numeric(18,8) NOT NULL DEFAULT 0,
  grid_levels jsonb DEFAULT '[]'::jsonb,
  drawdown_kill boolean NOT NULL DEFAULT false,
  five_pair_activated boolean NOT NULL DEFAULT false,
  last_run timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: kun egen rad + service_role
ALTER TABLE autopilot_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own autopilot state"
  ON autopilot_state FOR SELECT USING (auth.uid() = user_id);
```

**Step 1:** Skriv migrasjon (TDD: test at tabellen opprettes med riktige kolonner via supabase MCP).
**Step 2:** Appliser migrasjon.
**Step 3:** Generer typer → `npm run supabase:generate-types`.
**Step 4:** Commit.

---

## Fase B — Kjernefunksjoner (rene funksjoner, TDD)

### Task B1: Portfolio Scanner

**Objective:** `scanPortfolio(client: KrakenClient): Portfolio` — henter balanse + ticker, beregner total equity, per-par fordeling, idle USDC.

**Files:**
- Create: `src/lib/trading/autopilot/scanner.ts`
- Test: `src/lib/trading/autopilot/__tests__/scanner.test.ts`

**API:** Returnerer `{ equityUsdc, freeUsdc, positions: [{ pair, qty, priceUsdc, valueUsdc }] }`.

**TDD:** Test med mocked KrakenClient (Balance + Ticker respons). Test at USDC + krypto-value = equity. Test at XBT-lesing bruker riktig asset-navn (XXBT/XETH — lærdommen).

### Task B2: Allocation Engine

**Objective:** `allocateCapital(portfolio: Portfolio, config: GridConfig): Allocation[]` — fordeler kapital per par basert på edge-allokering (backtest-drevet).

**Files:**
- Create: `src/lib/trading/autopilot/allocator.ts`
- Test: `src/lib/trading/autopilot/__tests__/allocator.test.ts`

**Regler:**
- Opptil 5 par (BTC/ETH/SOL + 2 kandidater fra Task 3-univers: ADA/DOT)
- Kapital per par = edgeWeight × totalCapital / sum(edgeWeights)
- Minimum 8 USDC per nivå (fill-fysikk)
- Minst 50 USDC per par (ellers 3-par-modus)
- Edge-vekter fra backtest (BTC 10, ETH 9, SOL 6, ADA 4, DOT 5 — normalisert)

### Task B3: Reinvesteringsmotor

**Objective:** `shouldReinvest(realizedProfit, totalEquity): ReinvestDecision` — 80% av gevinst >10 USDC reinvesteres.

**Files:** Utvid `src/lib/trading/kraken-reinvest.ts` (finnes) med rein funksjon + test.

**TDD:** Test at profit 15 USD → reinvest 4 USD (80% av 5 overskytende). Profit 9 USD → 0 (under terskel). Reinvestert beløp legges til idle USDC → nye nivåer.

---

## Fase C — Orchestrator

### Task C1: Autopilot Orchestrator (per-bruker cron-pipeline)

**Objective:** `processAutopilotUser(db, userId)` — en funksjon som per bruker: (1) henter nøkler fra DB, (2) scanner portfolio, (3) allokerer kapital, (4) kjører grid (kjøp/salg/reinvest), (5) synker state til autopilot_state-tabellen.

**Files:**
- Create: `src/lib/trading/autopilot/orchestrator.ts`
- Test: `src/lib/trading/autopilot/__tests__/orchestrator.test.ts`

**Arkitektur (per bruker):**
```
1. Hent user_kraken_keys (dekrypter AES-GCM)
2. Opprett KrakenClient(nøkler)
3. scanPortfolio(client) → Portfolio
4. allocateCapital(Portfolio) → Allocation[]
5. Per par: KrakenGridTrader.run(allocation, priceFeed) → fills/reinvest
6. evaluateProgressiveDrawdown(equity, initialEquity) → kill/reduced
7. UPSERT autopilot_state
```

**Sikkerhet:** Kill-switch per bruker (progressiv). Kill = stopp all trading for den brukeren, sett drawdown_kill=true. Ikke påvirk andre brukere.

### Task C2: Orchestrator API-rute + pg_cron

**Objective:** `POST /api/cron/autopilot-orchestrator` — cron-rute som prosesserer ALLE brukere med `user_kraken_keys.is_active=true` OG `autopilot_state.activated=true`.

**Files:**
- Create/modify: `src/app/api/cron/autopilot-orchestrator/route.ts`
- Modify: Supabase pg_cron (ny jobb: `klarpakke-autopilot-orchestrator`, hvert 5. min)

**Cron-SQL:**
```sql
SELECT cron.schedule(
  'klarpakke-autopilot-orchestrator',
  '*/5 * * * *',
  $$SELECT klarpakke_trigger_cron('/api/cron/autopilot-orchestrator')$$
);
```

**Rute-sikkerhet:** `validateCronSecret` (samme som tick-ruten). Batch-prosessering (parallellisering per 25 brukere, som tick).

---

## Fase D — Deposit→Autopilot

### Task D1: Deposit-webhook → autopilot-trigger

**Objective:** Når Kraken deposit-webhook mottar et innskudd: aktiver autopilot for brukeren (hvis ikke allerede aktivert), oppdater initial_equity, utløs grid-oppsett.

**Files:**
- Modify: `src/app/api/webhooks/kraken/deposit/route.ts`
- Test: `src/app/api/webhooks/kraken/deposit/__tests__/route.test.ts`

**Logikk:**
1. Webhook mottatt (Kraken POST med beløp)
2. Finn user_id fra webhook-payload (mapping: Kraken-konto → user_kraken_keys)
3. `UPSERT autopilot_state SET activated=true, initial_equity_usdc = ...`
4. Svar 200 OK (Kraken forventer raskt svar)
5. Orchestrator-cron plukker opp neste kjøring

---

## Fase E — UI

### Task E1: Autopilot Dashboard-kort

**Objective:** Vis autopilot-status på /handel: equity, grid-aktivitet (åpne ordre, fills), realisert profit, kill-switch-status. Kun for brukere med aktiv Kraken-kobling.

**Files:**
- Create: `src/features/autopilot/AutopilotDashboard.tsx`
- Modify: `src/app/no/handel/page.tsx` (legge inn kortet)

**Data:** Hent fra `GET /api/kraken/autopilot-state` (ny rute, eller utvid eksisterende live-state-rute). Bruk Supabase SSR for real-time state.

### Task E2: «Koble Kraken» flyt (fikse connect-ruta)

**Objective:** UI-flyt for å koble Kraken: API-nøkkel + hemmelighet → lagre → verifiser → start autopilot.

**Files:** Eksisterende Kraken-tilkoblings-UI (finnes delvis). Oppdater connect-ruta fra Task A1.

---

## Fase F — E2E

### Task F1: Autopilot E2E-test

**Objective:** Playwright-test: bruker kobler Kraken (mock), innskudd mottas, autopilot starter, grid opererer, profit akkumuleres, dashboard viser korrekt state.

**Files:**
- Create: `tests/e2e/autopilot/autopilot-flow.spec.ts`

**Scenario:**
1. Logg inn som testbruker
2. Koble Kraken (mock API-nøkler)
3. Simuler innskudd
4. Verifiser: autopilot activated=true
5. Vent på orchestrator-kjøring → grid opprettet
6. Dashboard viser equity + ordre

---

## Filer som opprettes/endres (oversikt)

| Fil | Task | Type |
|---|---|---|
| `supabase/migrations/20260806_autopilot_state.sql` | A2 | NY |
| `database.types.ts` | A2 | Generert |
| `src/app/api/kraken/connect/route.ts` | A1 | Fiks |
| `src/lib/trading/autopilot/scanner.ts` + test | B1 | NY |
| `src/lib/trading/autopilot/allocator.ts` + test | B2 | NY |
| `src/lib/trading/kraken-reinvest.ts` + test | B3 | Utvid |
| `src/lib/trading/autopilot/orchestrator.ts` + test | C1 | NY |
| `src/app/api/cron/autopilot-orchestrator/route.ts` | C2 | NY |
| `src/app/api/webhooks/kraken/deposit/route.ts` + test | D1 | Modifiser |
| `src/features/autopilot/AutopilotDashboard.tsx` | E1 | NY |
| `src/app/no/handel/page.tsx` | E1 | Modifiser |
| `tests/e2e/autopilot/autopilot-flow.spec.ts` | F1 | NY |

## Tester / Validering (per fase)

- **Fase A:** `npx vitest run src/app/api/kraken/connect/__tests__/` → connect-rute fikset
- **Fase B:** `npx vitest run src/lib/trading/autopilot/__tests__/` → scanner, allocator, reinvest — alle grønne
- **Fase C:** `npx vitest run src/lib/trading/autopilot/__tests__/orchestrator.test.ts` → orchestrator-pipeline TDD
- **Fase D:** deposit-webhook TDD
- **Fase F:** `npx playwright test tests/e2e/autopilot/`
- **Full:** `npm run test` → 0 regresjoner; `npx tsc --noEmit` → 0

## Risikoer / Tradeoffs

1. **Flerbruker Kraken rate-limiting** — Kraken har rate-limit per API-nøkkel, men per bruker har hver sin nøkkel → scalability OK. Orchestrator bør uansett ha rate-limit guard (1 req/s per bruker).
2. **Nøkkelkryptering** — AES-GCM fungerer for Tom i dag (`store-tom-kraken-keys.mjs`). For flerbruker: implementer `encryptApiKey`/`decryptApiKey` i en egen modul (bruk eksisterende ENCRYPTION_KEY fra `.env.local`).
3. **Kapital per bruker varierer voldsomt** — Tom har 153 USDC, en annen bruker kan ha 10 000. Allocation engine må håndtere små beløp (minimum 50 USDC for 3-par-modus, ellers 1-par BTC-only).
4. **Grid-state persistering** — Bruk DB (autopilot_state.grid_levels) som SSoT, ikke lokal state-fil. Hver orchestrator-kjøring leser → opererer → skriver tilbake.
5. **Orchestrator-timeout** — Med N brukere kan prosessering ta tid. Bruk samme batch-parallellisering som tick (25 per batch, 55s timeout per batch).

## Åpne spørsmål

1. Skal autopilot være **opt-in** (bruker aktiverer selv) eller **auto-on** for alle med Kraken-kobling? (Planen antar opt-in: deposit-webhook trigger aktivering.)
2. Skal Toms grid-manager (scripts/kraken-grid-manager.mjs) erstattes av orchestrator-en, eller kjøre parallelt for Tom? (Planen antar: orchestrator-en blir ny SSoT for alle; Toms manager fases ut når orchestrator er stabil.)
3. Skal paper-brukere med Kraken-kobling se autopilot-UI men IKKE handle live? (Ja — vis "Klar for live" med aktiveringsknapp.)

---
*Generert 2026-08-06 01:47 — 9 tasks i 6 faser, TDD, subagent-delegering.*

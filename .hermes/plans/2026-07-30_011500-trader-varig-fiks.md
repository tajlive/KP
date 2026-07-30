# Varig fiks av Trader-oppsettet — Implementasjonsplan

> **For Hermes:** Bruk subagent-driven-development for å implementere steg-for-steg.

**Goal:** Eliminer alle gjentakende trader-feil (session-crash-loop, valutamismatch, minimum-ordre-avvisninger, phantom-kapital) med én samlet arkitekturfiks som gjelder ALLE brukere.

**Architecture:** Tre rotårsaker → tre arkitekturfikser:
1. **Session-livssyklus-kaos** — 4 DB-jobber + 3 kode-stier skriver `status` mot hverandre. Løsning: én eier, én heartbeat-kontrakt, én idempotent vedlikeholdsfunksjon.
2. **Valutamismatch NOK/USDT** — pris hentes i USDT, sizing beregnes i NOK, fill-modellen konverterer med en TREDJE rate. Løsning: én kanonisk rate-tjeneste, USDT internt, NOK kun ved DB/display-grenser.
3. **Tilfeldig brukervalg + flere session-skapere** — Math.random() velger 1 bruker per cron-kall, men sessions opprettes for andre → heartbeat går ut → crash. Løsning: deterministisk round-robin + session opprettes kun av én funksjon.

**Tech Stack:** TypeScript, Next.js 16 API routes, Supabase (pg_cron + plpgsql), Vitest

---

## 🔍 Verifiserte rotårsaker (fakta fra feilsøking 30.7.2026)

### R1: `detect_crashed_sessions()` dreper JokerTrade-sessions
```sql
-- DB-funksjon (VERIFISERT i pg_proc):
UPDATE trading_sessions SET status = 'crashed'
WHERE status IN ('active','paused') AND mode='paper'
  AND last_heartbeat < NOW() - INTERVAL '5 minutes';
```
- JokerTrade (`src/app/api/jokertrade/route.ts`) oppretter sessions UTEN å sette `last_heartbeat`
- Tick-motoren (`/api/cron/tick`) er den ENESTE som oppdaterer heartbeat — og den eier ikke JokerTrade-sessions
- Resultat: session opprettes → 5 min senere → `crashed`. Målt: 181 crashed, 11 active i prod.

### R2: Fire DB-jobber kjemper mot hverandre (VERIFISERT i cron.job)
| Jobb | Intervall | Gjør |
|------|-----------|------|
| `recover-crashed-sessions` (1160) | */2 min | `recover_crashed_paper_sessions()` |
| `reactivate-stale-sessions` (1150) | */5 min | `reactivate_stale_sessions()` |
| `db-monitor-hanging-sessions` (1145) | 1/time | UPDATE status='stopped' |
| `klarpakke-trading-tick` (1143) | 1 min | kaller `/api/cron/tick` → `heal_stale_sessions()` |

Status flakker: active → crashed → active → stopped. Ingen eier.

### R3: Valutapipeline (VERIFISERT i trades-tabellen)
- BTC-trade: `price=616445 NOK`, `total_value=46536 NOK` på session med 99 485 kapital ved ~5% sizing (= 47% — 9x for stort)
- `execute-trade.ts` fill-modell lagrer `total_value` i NOK med egen rate; JokerTrade beregnet i NOK med hardkodet 7.3
- Binance-proxy returnerer USDT-priser

### R4: `Math.random()` brukervalg (VERIFISERT i route.ts)
- 1 tilfeldig bruker per cron-kall av ~36 → de fleste handler aldri
- `ensure_active_sessions_for_all()` (RPC) oppretter sessions for ALLE → disse crasher pga. R1

### R5: Min-ordre-sjekk divergerer
- JokerTrade estimerer med rate X, `execute-trade` sjekker med rate Y → "Order value 4.74 below minimum 10.00" til tross for lokale guards

---

## 📋 Oppgaver

### Task 1: Heartbeat-kontrakt i JokerTrade (STOPP CRASH-LOOPEN)

**Objective:** JokerTrade-sessions overlever `detect_crashed_sessions` — alltid.

**Files:**
- Modify: `src/app/api/jokertrade/route.ts` (`ensureActiveSession`, POST-handler)

**Step 1: Sett heartbeat ved opprettelse**

I `ensureActiveSession`, session-insert:

```typescript
const { data: created, error } = await db
  .from("trading_sessions")
  .insert({
    // ...eksisterende felter...
    last_heartbeat: new Date().toISOString(),
    last_tick_at: new Date().toISOString(),
  })
  .select("id")
  .single();
```

**Step 2: Touch heartbeat ved hver POST-syklus**

Rett etter at `session` hentes (både eksisterende og ny):

```typescript
await db
  .from("trading_sessions")
  .update({ last_heartbeat: new Date().toISOString() } as never)
  .eq("id", session.id);
```

**Step 3: Verifiser**

```bash
npx tsc --noEmit --pretty false 2>&1 | grep -c error  # forventet: 0
bash scripts/deploy.sh
# Vent 6 minutter (over crash-terskelen), deretter:
# SQL: SELECT status FROM trading_sessions WHERE user_id='<toms-id>' ORDER BY created_at DESC LIMIT 1
# Forventet: 'active' — IKKE 'crashed'
```

**Step 4: Commit**

```bash
git add src/app/api/jokertrade/route.ts
git commit -m "fix: heartbeat-kontrakt i JokerTrade — sessions overlever crash-deteksjon"
```

---

### Task 2: Grace-period i `detect_crashed_sessions`

**Objective:** Sessions yngre enn 15 minutter kan ALDRI crashe — gir alle systemer tid til første heartbeat.

**Files:**
- DB-migrasjon: `supabase/migrations/YYYYMMDD_grace_period_crashed.sql`

**Step 1: Skriv migrasjonen**

```sql
CREATE OR REPLACE FUNCTION public.detect_crashed_sessions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE trading_sessions
    SET status = 'crashed', updated_at = NOW()
    WHERE status IN ('active', 'paused')
      AND mode = 'paper'
      AND last_heartbeat < NOW() - INTERVAL '5 minutes'
      AND created_at < NOW() - INTERVAL '15 minutes'  -- 🆕 grace period
      AND archived = FALSE;
    PERFORM alert_stalled_sessions();
END;
$$;
```

**Step 2: VIS SQL-DIFF TIL TOM FØR KJØRING** (DB er hellig — Toms regel)

**Step 3: Kjør via Supabase MCP `execute_sql` etter godkjenning**

**Step 4: Verifiser**

```sql
-- Opprett test-session med gammel heartbeat men ny created_at:
-- skal IKKE crashe. Session eldre enn 15 min med stale heartbeat: SKAL crashe.
SELECT id, status, created_at, last_heartbeat FROM trading_sessions
WHERE mode='paper' ORDER BY created_at DESC LIMIT 10;
```

**Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "fix: 15-min grace period i detect_crashed_sessions"
```

---

### Task 3: Konsolider de 4 session-vedlikeholdsjobbene til ÉN

**Objective:** Én idempotent DB-funksjon eier alle session-statusoverganger. Ingen kaker som kjemper.

**Files:**
- DB-migrasjon: `supabase/migrations/YYYYMMDD_unified_session_maintenance.sql`
- pg_cron-endringer (disable 3 av 4 jobber)

**Step 1: Skriv unified funksjon**

```sql
CREATE OR REPLACE FUNCTION public.session_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  crashed_count int; healed_count int; stopped_count int;
BEGIN
  -- 1. Crash kun gamle sessions med stale heartbeat (inkl. grace period)
  UPDATE trading_sessions SET status='crashed', updated_at=NOW()
  WHERE status IN ('active','paused') AND mode='paper'
    AND last_heartbeat < NOW() - INTERVAL '5 minutes'
    AND created_at < NOW() - INTERVAL '15 minutes'
    AND archived = FALSE;
  GET DIAGNOSTICS crashed_count = ROW_COUNT;

  -- 2. Heal crashed sessions som har fått heartbeat tilbake (f.eks. etter deploy)
  UPDATE trading_sessions
  SET status='active', last_heartbeat=NOW(), updated_at=NOW(), stopped_at=NULL
  WHERE status='crashed' AND mode='paper'
    AND last_heartbeat > NOW() - INTERVAL '5 minutes'
    AND archived = FALSE;
  GET DIAGNOSTICS healed_count = ROW_COUNT;

  -- 3. Stopp hengende sessions (>24t uten heartbeat, ikke crashed ennå)
  UPDATE trading_sessions
  SET status='stopped', stopped_at=NOW(), updated_at=NOW()
  WHERE status='active' AND mode='paper'
    AND last_heartbeat < NOW() - INTERVAL '24 hours'
    AND archived = FALSE;
  GET DIAGNOSTICS stopped_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'crashed', crashed_count, 'healed', healed_count, 'stopped', stopped_count);
END;
$$;
```

**Step 2: VIS DIFF TIL TOM → kjør SQL**

**Step 3: Deaktiver de gamle jobbene, lag ÉN ny**

```sql
SELECT cron.unschedule('recover-crashed-sessions');
SELECT cron.unschedule('reactivate-stale-sessions');
SELECT cron.unschedule('db-monitor-hanging-sessions');
SELECT cron.schedule('session-maintenance', '*/2 * * * *', 'SELECT public.session_maintenance()');
```

**Step 4: Verifiser**

```sql
SELECT jobname, active FROM cron.job WHERE jobname LIKE '%session%';
-- Forventet: kun 'session-maintenance' aktiv
SELECT public.session_maintenance();
-- Forventet: {"crashed":0,"healed":N,"stopped":0}
```

**Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: unified session_maintenance — én eier av statusoverganger"
```

---

### Task 4: Kanonisk valutatjeneste (USDT↔NOK)

**Objective:** ÉN rate-kilde for hele plattformen. Ingen hardkodede 7.3/12-verdier.

**Files:**
- Create: `src/lib/trading/canonical/exchange-rate.ts`
- Modify: `src/app/api/jokertrade/route.ts` (fjern `nokToUsdt = 7.3`, `FALLBACK_PRICES` beholdes men kun som siste utvei)
- Modify: `src/lib/trading/canonical/execution/fill-model.ts` (bruk samme rate)

**Step 1: Skriv rate-tjenesten**

```typescript
// src/lib/trading/canonical/exchange-rate.ts
const CACHE_TTL_MS = 60_000;
let cached: { rate: number; at: number } | null = null;

/** ÉN kanonisk NOK→USDT rate for hele plattformen. */
export async function getNokUsdtRate(): Promise<number> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rate;
  try {
    // USDTNOK fra Binance via proxy (samme kilde som prisdata)
    const res = await fetch(
      "https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy?symbol=USDTNOK",
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = await res.json() as { price?: string };
      const rate = parseFloat(data.price ?? "0");
      if (rate > 5 && rate < 20) {
        cached = { rate, at: Date.now() };
        return rate;
      }
    }
  } catch { /* fall through */ }
  // Fallback: 60-min cache → sist kjente rate → 10.5 (konservativ)
  return cached?.rate ?? 10.5;
}
```

**Step 2: Bruk i JokerTrade**

Erstatt `const nokToUsdt = 7.3;` med:

```typescript
import { getNokUsdtRate } from "@/lib/trading/canonical/exchange-rate";
// ...i trade-blokken:
const nokToUsdt = await getNokUsdtRate();
const capitalUsdt = session.capital / nokToUsdt;
let positionUsdt = capitalUsdt * (sizingPct / 100);
if (positionUsdt < 10) positionUsdt = 10;
const quantity = positionUsdt / price; // price er USDT — konsistent
```

**Step 3: Skriv test**

```typescript
// src/lib/trading/canonical/__tests__/exchange-rate.test.ts
import { describe, it, expect } from "vitest";
import { getNokUsdtRate } from "../exchange-rate";

describe("exchange-rate", () => {
  it("returnerer rate i rimelig intervall", async () => {
    const rate = await getNokUsdtRate();
    expect(rate).toBeGreaterThan(5);
    expect(rate).toBeLessThan(20);
  });
  it("cacher rate i 60 sekunder", async () => {
    const r1 = await getNokUsdtRate();
    const r2 = await getNokUsdtRate();
    expect(r1).toBe(r2);
  });
});
```

**Step 4: Kjør test + verifiser trade-størrelse**

```bash
npx vitest run src/lib/trading/canonical/__tests__/exchange-rate.test.ts
# Deploy, deretter curl JokerTrade → sjekk at total_value ≈ sizingPct × kapital (±10%)
```

**Step 5: Commit**

```bash
git add src/lib/trading/canonical/exchange-rate.ts src/app/api/jokertrade/route.ts
git commit -m "feat: kanonisk USDT↔NOK rate-tjeneste — én kilde, 60s cache"
```

---

### Task 5: Fjern valutamismatch i fill-modellen

**Objective:** `execute-trade` lagrer `total_value` konsekvent — samme rate som JokerTrade bruker.

**Files:**
- Modify: `src/lib/trading/canonical/execution/fill-model.ts`
- Modify: `src/lib/trading/core/execute-trade.ts`

**Step 1: Les fill-model.ts — finn der rate brukes, bytt til `getNokUsdtRate()`**

**Step 2: Skriv invariant-test**

```typescript
// INVARIANT: total_value (NOK) = quantity × price(USDT) × rate
// For paper-trades skal dette ALLTID stemme innen 1% avvik
it("total_value matcher quantity × price × rate", async () => {
  const rate = await getNokUsdtRate();
  const fill = computeFill({ quantity: 2, price: 100, /* ... */ });
  expect(Math.abs(fill.totalValue - 2 * 100 * rate) / fill.totalValue).toBeLessThan(0.01);
});
```

**Step 3: Verifiser mot eksisterende trades i DB**

```sql
SELECT id, trading_pair, quantity::numeric, price::numeric, total_value::numeric,
       total_value::numeric / NULLIF(quantity::numeric * price::numeric, 0) as implied_rate
FROM trades WHERE joker_trade = true ORDER BY created_at DESC LIMIT 10;
-- Forventet etter fiks: implied_rate ≈ samme verdi (10-11) på alle rader
```

**Step 4: Commit**

```bash
git add src/lib/trading/canonical/execution/fill-model.ts src/lib/trading/core/execute-trade.ts
git commit -m "fix: fill-modell bruker kanonisk rate — eliminerer valutadrift"
```

---

### Task 6: Deterministisk brukerrotasjon (fjern Math.random)

**Objective:** ALLE auto-brukere handler jevnt — ikke tilfeldig én om gangen.

**Files:**
- Modify: `src/app/api/jokertrade/route.ts` POST-handler

**Step 1: Round-robin via minste `last_jokertrade_at`**

```typescript
if (isCron) {
  try { await db.rpc("ensure_active_sessions_for_all" as never); } catch { /* best effort */ }

  const { data: users } = await db
    .from("auto_trading_configs")
    .select("user_id")
    .eq("is_enabled", true)
    .limit(50);

  if (!users?.length) {
    return NextResponse.json({ success: true, message: "Ingen auto-brukere" });
  }

  // Velg brukeren som har ventet lengst siden forrige JokerTrade-handel
  const { data: lastTrades } = await db
    .from("trades")
    .select("user_id, created_at")
    .eq("joker_trade", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const lastByUser = new Map<string, string>();
  for (const t of lastTrades ?? []) {
    if (!lastByUser.has(t.user_id)) lastByUser.set(t.user_id, t.created_at);
  }

  // Brukere uten handler først, deretter eldst sist handlet
  const sorted = [...users].sort((a, b) => {
    const ta = lastByUser.get(a.user_id) ?? "1970-01-01";
    const tb = lastByUser.get(b.user_id) ?? "1970-01-01";
    return ta.localeCompare(tb);
  });

  userId = sorted[0].user_id;
}
```

**Step 2: Test at rotasjonen er rettferdig**

```sql
-- Etter 12 cron-kall: ALLE auto-brukere skal ha minst 1 joker_trade
SELECT user_id, COUNT(*) FROM trades WHERE joker_trade=true
AND created_at > NOW() - INTERVAL '3 hours' GROUP BY user_id;
```

**Step 3: Commit**

```bash
git add src/app/api/jokertrade/route.ts
git commit -m "feat: rettferdig round-robin brukervalg i JokerTrade"
```

---

### Task 7: Integrasjonstest — session-livssyklus

**Objective:** Automatisk test som fanger REGRESJON av hele denne planen.

**Files:**
- Create: `src/app/api/jokertrade/__tests__/lifecycle.test.ts`

**Step 1: Skriv testene**

```typescript
describe("Session-livssyklus (regresjonsguard)", () => {
  it("ny session har last_heartbeat satt", () => { /* mock db, verifiser insert-felter */ });
  it("heartbeat touches ved hver POST", () => { /* verifiser update-kall */ });
  it("sizing: positionUsdt = capital/rate × pct, min 10 USDT", () => {
    // capital=99485 NOK, rate=10.5, pct=5% → 473.7 USDT → ALDRI under 10
    const capitalUsdt = 99485 / 10.5;
    const pos = Math.max(capitalUsdt * 0.05, 10);
    expect(pos).toBeGreaterThanOrEqual(10);
    expect(pos).toBeLessThan(500);
  });
  it("detect_crashed_sessions respekterer 15-min grace", () => { /* SQL-dokumentasjonstest */ });
});
```

**Step 2: Kjør full test-suite**

```bash
npx vitest run src/app/api/jokertrade  # forventet: alle grønne
npm run check                          # forventet: 5/5
```

**Step 3: Commit**

```bash
git add src/app/api/jokertrade/__tests__/lifecycle.test.ts
git commit -m "test: session-livssyklus regresjonsguard"
```

---

### Task 8: Fakta-audit + endelig verifisering (Toms PUNKT 0)

**Objective:** Hvert tall på dashboardet spores til DB-spørring. Live-verifisering.

**Step 1: Kjør audit-spørringer**

```sql
-- Sessions: forventet 0 crashed etter 30 min drift
SELECT status, COUNT(*) FROM trading_sessions WHERE mode='paper' GROUP BY status;
-- Trades: forventet implied_rate ≈ konstant
SELECT COUNT(*), AVG(total_value::numeric / NULLIF(quantity::numeric*price::numeric,0))::numeric(10,2)
FROM trades WHERE joker_trade=true AND created_at > NOW() - INTERVAL '1 hour';
-- Fordeling: forventet jevn fordeling på brukere
SELECT COUNT(DISTINCT user_id) FROM trades WHERE joker_trade=true
AND created_at > NOW() - INTERVAL '1 hour';
```

**Step 2: Produksjonsverifisering**

```bash
npm run check   # 5/5
curl -s https://www.klarpakke.no/api/health | python3 -m json.tool | grep -A2 session_health
```

**Step 3: Rapporter tallene til Tom med DB-spørring som kilde for hvert tall**

---

## 📊 Suksesskriterier (målbare, 24t etter deploy)

| Metrikk | Nå (verifisert) | Mål |
|---------|-----------------|-----|
| Crashed sessions (siste time) | 35 | **0** |
| Aktive paper-sessions | 11 | **= antall auto-brukere** |
| implied_rate spredning i trades | 2.7–11 (kaos) | **±5% fra kanonisk rate** |
| Brukere som handlet siste 3t | 5 | **alle auto-brukere** |
| Min-ordre-avvisninger | daglig | **0** |
| Session-jobber i pg_cron | 4 konkurrende | **1** |

## ⚠️ Risiko & åpne spørsmål

1. **DB-migrasjoner krever Toms godkjenning** (vis SQL-diff FØR kjøring — Toms regel).
2. **`recover_crashed_paper_sessions`/`reactivate_stale_sessions` fjernes** — sjekk at ingen Edge Function kaller dem direkte før unschedule.
3. **Rate-kilden USDTNOK på Binance** kan være illikvid — fallback til 10.5 er konservativ; vurder Norges Bank-rate som alternativ kilde.
4. **Åpne posisjoner i crashed sessions** — eksisterende posisjoner må ikke dobbelttelles; `orphan-redning`-logikken i tick (linje 1789) må testes mot nye aktive sessions.
5. **Ikke rør inntektskritiske stier** (live-trading) — alt her gjelder KUN `mode='paper'`.

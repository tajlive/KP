# Fiks alle QA-problemer med agenter — Implementation Plan

> **For Hermes:** Bruk agent-drevet utvikling: én fersk `delegate_task` per task, med to-stegs review (spec compliance → code quality). Ikke implementer i denne plan-runden.

**Goal:** Fiks alle funn fra vanskelig innlogget QA-bruker: feil valuta/priser, falsk chart/balanse, dashboard `NaN%`, historikk som tror bruker er utlogget, blank settings, profil-redirect, dynamiske i18n-feil og feilende unit-tester.

**Architecture:** Behold eksisterende arkitektur, men tving én sannhet per område: USDT→NOK-konvertering for prisvisning, `paper_accounts.current_balance`/`getUserDashboardMetrics` for balanse, API-first auth for brukerspesifikke sider, konsoliderte fill-konstanter, og canonical routes (`/trade`, `/dashboard/historikk`, `/jokertrade`).

**Tech Stack:** Next.js 16, React 19, TypeScript, next-intl, Supabase, Vitest, Cloudflare Workers/OpenNext.

---

## Current context / assumptions

- Repo: `/Users/taj/klarpakke`. Ingen kode er endret i plan-runden.
- QA-bruker finnes i Supabase: `test+hard.case+ae-oe-aa+001@klarpakke.no` / user id `832bf495-487d-44a2-8ace-67580e6a851c`.
- Verifiserte produksjonsfunn:
  - `/no/trade` viser USDT-priser som `kr` og falsk SVG-chart som ser ut som reell NOK-pris.
  - DB-balanse er 100 000 kr, mens trade/dashboard viser andre tall/`NaN%`.
  - `/no/dashboard/historikk` sier “Du er ikke innlogget” selv om bruker er innlogget.
  - `/no/dashboard/settings` render kun nav/blankt. Det finnes ingen `src/app/[locale]/(user)/dashboard/settings/page.tsx`.
  - `/no/profile` bruker server-`requireAuth()` selv om prosjektet krever client-side auth/API-first.
  - Runtime i18n mangler `trading.riskMetrics.scoreDescription.*` og `scoreLabel.*` selv om statisk `i18n:usage` er grønn.
- Repo-sjekker:
  - `npm run lint` består.
  - `npm run i18n:validate` består for aktive språk.
  - `npm run i18n:usage` består, men fanger ikke dynamiske nøkler.
  - `npm run test:unit`: 14 filer / 23 tester feiler.

## Agent execution model

Bruk maks 4 parallelle agenter per wave. Hver agent får én task og må følge TDD: RED → GREEN → REFACTOR. Ingen agent committer eller pusher. Hver agent returnerer: endrede filer, kjørte kommandoer, testresultat, og restfeil.

Prompt-template til hver agent:

```text
Repo: /Users/taj/klarpakke. Følg planen i .hermes/plans/2026-07-22_122147-fix-qa-problemer-med-agenter.md, kun Task <id>. Ikke endre andre områder. Ikke commit/push. Bruk strict TDD: skriv/oppdater test først, se den feile, implementer minimalt, se den passere. Kjør relevante tester + til slutt npm run lint. Returnér kort på norsk med filer, kommandoer og resultat.
```

---

## Wave 0 — Baseline og sikkerhetsnett

### Task 0: Frys baseline før endringer

**Objective:** Dokumenter eksakt før-status slik at agenter kan bevise forbedring.

**Files:**
- Ingen kodeendringer.

**Step 1: Kjør baseline**
Run:
```bash
git status --short
npm run lint
npm run i18n:validate
npm run i18n:usage
CI=1 npm run test:unit > /tmp/kp-vitest-before.log 2>&1; echo $?
```
Expected: lint/i18n grønne, vitest exit `1` med 14 failed files / 23 failed tests.

**Step 2: Lag baseline-notat**
Run:
```bash
mkdir -p .hermes/qa
cp /tmp/kp-vitest-before.log .hermes/qa/vitest-before.log
```
Expected: `.hermes/qa/vitest-before.log` finnes.

---

## Wave 1 — P0: Pris/valuta og falsk chart

### Task 1: Client-safe USDT→NOK helper med tester

**Objective:** Én client-safe helper for prisvisning i NOK, uten å blande inn server-side DB/env.

**Files:**
- Create: `src/lib/market/nok.ts`
- Test: `src/lib/market/__tests__/nok.test.ts`

**Step 1: Write failing test**
```ts
import { describe, expect, it } from "vitest";
import { getDisplayUsdtToNokRate, usdtPriceToNok } from "../nok";

describe("market/nok", () => {
  it("uses fallback rate when public env is missing", () => {
    delete process.env.NEXT_PUBLIC_USDT_NOK_RATE;
    expect(getDisplayUsdtToNokRate()).toBe(10.92);
  });

  it("converts USDT price to NOK", () => {
    expect(usdtPriceToNok(63258, 10)).toBe(632580);
  });

  it("rejects invalid env rate", () => {
    process.env.NEXT_PUBLIC_USDT_NOK_RATE = "0";
    expect(getDisplayUsdtToNokRate()).toBe(10.92);
  });
});
```

**Step 2: Run test to verify failure**
Run: `npx vitest run src/lib/market/__tests__/nok.test.ts`
Expected: FAIL — module not found.

**Step 3: Minimal implementation**
```ts
const FALLBACK_USDT_NOK = 10.92;

export function getDisplayUsdtToNokRate(): number {
  const env = process.env.NEXT_PUBLIC_USDT_NOK_RATE;
  if (env) {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return FALLBACK_USDT_NOK;
}

export function usdtPriceToNok(priceUsdt: number, rate = getDisplayUsdtToNokRate()): number {
  return priceUsdt * rate;
}
```

**Step 4: Run test to verify pass**
Run: `npx vitest run src/lib/market/__tests__/nok.test.ts`
Expected: PASS.

### Task 2: Fjern USD-labeled “kr” og falsk NOK-chart i trade-terminalen

**Objective:** `/no/trade` skal ikke vise Binance USDT-priser som `kr`, og ikke vise tilfeldig generert chart som reell pris.

**Files:**
- Modify: `src/features/trading/UnifiedTradeTerminal.tsx:20-76, 110-228, 230-373`
- Test: `src/features/trading/__tests__/UnifiedTradeTerminal.prices.test.tsx`

**Step 1: Write failing test**
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({
    prices: { BTCUSDT: { price: 63258, price_change_percent_24h: 2.3 } },
    loading: false,
    isConnected: true,
  }),
}));

import { UnifiedTradeTerminal } from "../UnifiedTradeTerminal";

describe("UnifiedTradeTerminal prices", () => {
  it("shows BTC price converted to NOK, not raw USDT labeled kr", () => {
    render(<UnifiedTradeTerminal />);
    expect(screen.queryByText(/65\s?918 kr|63\s?258 kr/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/690\s?\d{3}/).length).toBeGreaterThan(0);
  });

  it("does not render random fake candle prices as real NOK", () => {
    render(<UnifiedTradeTerminal />);
    expect(screen.queryByText(/66\s?837,067 NOK/)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify failure**
Run: `npx vitest run src/features/trading/__tests__/UnifiedTradeTerminal.prices.test.tsx`
Expected: FAIL — raw `63258 kr`/fake chart finnes.

**Step 3: Minimal implementation**
Endre `UnifiedTradeTerminal.tsx`:
- Importér:
```ts
import { formatNOK } from "@/lib/format/currency";
import { usdtPriceToNok } from "@/lib/market/nok";
```
- I `LiveTicker`, konvertér før visning:
```ts
const priceNok = usdtPriceToNok(p);
priceData.push({ symbol: symbol.replace("USDT", ""), price: priceNok, change24h: change });
```
og vis:
```tsx
{formatNOK(t.price, { locale: "nb-NO", maximumFractionDigits: t.price > 1000 ? 0 : 2 })}
```
- I `OrderPanel`, bruk `priceNok` for all NOK-visning og BTC-estimat:
```ts
const priceUsdt = btc?.price ?? 63258;
const priceNok = usdtPriceToNok(priceUsdt);
```
```tsx
<span>1 BTC = {formatNOK(priceNok, { locale: "nb-NO", maximumFractionDigits: 0 })}</span>
<span>≈ {(Number(amount) / priceNok).toFixed(6)} BTC</span>
```
- Erstatt `SparklineChart` fake-data med en enkel “Laster reell pris…”/skjult chart inntil reell serie finnes. Tillatt minimal variant: fjern `<SparklineChart />` fra render og vis kun reellt `priceNok`-kort.

**Step 4: Run test to verify pass**
Run: `npx vitest run src/features/trading/__tests__/UnifiedTradeTerminal.prices.test.tsx`
Expected: PASS.

### Task 3: Norsk feltvalidering for ugyldig beløp i OrderPanel

**Objective:** Beløp `0`/negativt skal stoppes lokalt med norsk feilmelding før API-kall.

**Files:**
- Modify: `src/features/trading/UnifiedTradeTerminal.tsx:244-281, 337-360`
- Test: `src/features/trading/__tests__/UnifiedTradeTerminal.validation.test.tsx`

**Step 1: Write failing test**
```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({ prices: { BTCUSDT: { price: 63258 } }, loading: false, isConnected: true }),
}));

import { UnifiedTradeTerminal } from "../UnifiedTradeTerminal";

describe("OrderPanel validation", () => {
  it("shows Norwegian field error for zero amount and does not call execute API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<UnifiedTradeTerminal />);
    fireEvent.change(screen.getByLabelText(/beløp/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /kjøp btc/i }));
    expect(await screen.findByText(/beløpet må være større enn 0/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalledWith("/api/paper-trading/execute", expect.anything());
  });
});
```

**Step 2: Run test to verify failure**
Run: `npx vitest run src/features/trading/__tests__/UnifiedTradeTerminal.validation.test.tsx`
Expected: FAIL — API kalles / engelsk `Invalid request`.

**Step 3: Minimal implementation**
```ts
const amountNumber = Number(amount);
const amountError = !Number.isFinite(amountNumber) || amountNumber <= 0
  ? "Beløpet må være større enn 0 kr."
  : null;
```
I `handleTrade`:
```ts
if (amountError) {
  setFeedback({ ok: false, msg: amountError });
  return;
}
```
Disable knapp når `amountError` finnes.

**Step 4: Run test to verify pass**
Run: `npx vitest run src/features/trading/__tests__/UnifiedTradeTerminal.validation.test.tsx`
Expected: PASS.

---

## Wave 2 — P0: Balanse/dashboard `NaN%`

### Task 4: Gjør `paper_accounts.current_balance` til første fallback i dashboard metrics

**Objective:** Dashboard skal aldri vise `NaN%` eller “Ingen data” for en papirbruker med `paper_accounts.current_balance`.

**Files:**
- Modify: `src/server/dashboard/getUserDashboardMetrics.ts:185-204`
- Modify: `src/features/dashboard/DashboardTopBar.tsx:73-101`
- Test: `src/server/dashboard/__tests__/getUserDashboardMetrics.integration.test.ts`
- Test: `src/features/dashboard/__tests__/DashboardTopBar.test.tsx`

**Step 1: Write failing tests**
```ts
it("uses paper_accounts.current_balance before user_profiles.paper_balance", async () => {
  // arrange supabase mock: paper_accounts.current_balance = 100000, user_profiles.paper_balance = 1
  // act
  // assert totalCapital === 100000
});
```
```tsx
it("does not render NaN% when changePct is not finite", () => {
  render(<DashboardTopBar balance={100000} changePct={Number.NaN} mode="paper" />);
  expect(screen.queryByText(/NaN%/)).not.toBeInTheDocument();
});
```

**Step 2: Run tests to verify failure**
Run:
```bash
npx vitest run src/server/dashboard/__tests__/getUserDashboardMetrics.integration.test.ts
npx vitest run src/features/dashboard/__tests__/DashboardTopBar.test.tsx
```
Expected: FAIL.

**Step 3: Minimal implementation**
I `getProfileFallback`:
```ts
const { data: paperAccount } = await supabaseClient
  .from("paper_accounts")
  .select("current_balance")
  .eq("user_id", userId)
  .maybeSingle();

if (typeof paperAccount?.current_balance === "number") {
  return { totalCapital: paperAccount.current_balance, startingCapital: 100_000 };
}
```
Behold `user_profiles.paper_balance` som sekundær fallback.

I `DashboardTopBar`:
```tsx
const safeChangePct = typeof changePct === "number" && Number.isFinite(changePct) ? changePct : null;
```
Bruk `safeChangePct` i stedet for `changePct`.

**Step 4: Run tests to verify pass**
Run samme to kommandoer.
Expected: PASS.

### Task 5: Sikre `/api/dashboard/metrics` mot feil bruker og cache-staleness

**Objective:** API skal ikke kunne brukes til å hente andre brukeres metrics, og dashboard skal ikke vise gammel balanse etter trade.

**Files:**
- Modify: `src/app/api/dashboard/metrics/route.ts:90-123`
- Test: `src/app/api/dashboard/__tests__/metrics.route.test.ts`

**Step 1: Write failing test**
```ts
it("returns 403 when query userId differs from authenticated user", async () => {
  // mock createServerClient auth.getUser -> user.id = "u1"
  // request /api/dashboard/metrics?userId=u2&mode=paper
  // expect status 403
});
```

**Step 2: Run test to verify failure**
Run: `npx vitest run src/app/api/dashboard/__tests__/metrics.route.test.ts`
Expected: FAIL — i dag godtas vilkårlig `userId`.

**Step 3: Minimal implementation**
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Ikke innlogget" } }, { status: 401 });
if (userId !== user.id) {
  return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Ikke tilgang til denne brukeren" } }, { status: 403 });
}
```
Reduser dashboard-metrics cache for `paper` til maks 5s eller invalidér etter successful trade. Velg enkleste: `paper` TTL 5s, `live` 15s.

**Step 4: Run test to verify pass**
Run: `npx vitest run src/app/api/dashboard/__tests__/metrics.route.test.ts`
Expected: PASS.

---

## Wave 3 — P0/P1: Auth-flater som feilaktig tror bruker er utlogget

### Task 6: Historikk skal ikke gate på client `supabase.auth.getUser()`

**Objective:** `/dashboard/historikk` skal bruke API-respons som auth-sannhet og aldri si “ikke innlogget” når `/api/user/trades` svarer 200.

**Files:**
- Modify: `src/app/[locale]/(user)/dashboard/historikk/ClientHandelshistorikk.tsx:99-217, 236-257`
- Create: `src/app/api/user/trade-decisions/route.ts`
- Test: `src/app/api/user/__tests__/trade-decisions.route.test.ts`
- Test: `src/app/[locale]/(user)/dashboard/historikk/__tests__/ClientHandelshistorikk.test.tsx`

**Step 1: Write failing test**
```tsx
it("renders empty signed-in history when /api/user/trades returns 200 with no trades", async () => {
  // fetch mock: /api/user/trades -> 200 { trades: [], diagnostic_id }
  // render ClientHandelshistorikk
  // expect queryByText(/du er ikke innlogget/i) === null
});
```

**Step 2: Run test to verify failure**
Run: `npx vitest run "src/app/[locale]/(user)/dashboard/historikk/__tests__/ClientHandelshistorikk.test.tsx"`
Expected: FAIL.

**Step 3: Minimal implementation**
- Fjern tidlig `return` når client-side `getUser()` er tom. La alltid `/api/user/trades` avgjøre:
```ts
const res = await fetch("/api/user/trades?limit=200", { credentials: "same-origin" });
if (res.status === 401) {
  setSignedIn(false);
  setFetchError(t("notLoggedIn"));
  return;
}
setSignedIn(true);
```
- Flytt `trade_decisions`-henting ut av client Supabase:
```ts
const decisionsRes = await fetch("/api/user/trade-decisions?limit=50", { credentials: "same-origin" });
```
Ny API-route returnerer kun innlogget brukers rader via `createServerClient().auth.getUser()`.

**Step 4: Run test to verify pass**
Run:
```bash
npx vitest run "src/app/[locale]/(user)/dashboard/historikk/__tests__/ClientHandelshistorikk.test.tsx"
npx vitest run src/app/api/user/__tests__/trade-decisions.route.test.ts
```
Expected: PASS.

### Task 7: Lag `/dashboard/settings` og fjern server-`requireAuth()` fra `/profile`

**Objective:** Innstillinger skal ikke være blank, og profil skal følge prosjektets client-side auth-regel.

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/settings/page.tsx`
- Modify: `src/app/[locale]/(user)/profile/page.tsx`
- Modify: `src/app/[locale]/(user)/profile/ProfilePageClient.tsx`
- Test: `src/app/[locale]/(user)/profile/__tests__/ProfilePageClient.test.tsx`

**Step 1: Write failing test**
```tsx
it("shows login required only after /api/user/profile returns 401", async () => {
  // fetch /api/user/profile -> 401
  // render ProfilePageClient
  // expect LoginRequired
});
it("renders settings tab from ?tab=settings when profile API succeeds", async () => {
  // fetch /api/user/profile -> 200
  // render ProfilePageClient initialTab="settings"
  // expect settings content
});
```

**Step 2: Run test to verify failure**
Run: `npx vitest run "src/app/[locale]/(user)/profile/__tests__/ProfilePageClient.test.tsx"`
Expected: FAIL — profile server gate/blank settings.

**Step 3: Minimal implementation**
`dashboard/settings/page.tsx`:
```tsx
"use client";
import { useEffect } from "react";
import { useLocale, useRouter } from "next/navigation";

export default function DashboardSettingsRedirect() {
  const locale = useLocale();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${locale}/profile?tab=settings`);
  }, [locale, router]);
  return null;
}
```
`profile/page.tsx`:
```tsx
export default async function ProfilePage({ searchParams }: PageProps) {
  const tab = (await searchParams)?.tab;
  return <ProfilePageClient initialTab={tab} />;
}
```
`ProfilePageClient.tsx`: hent `/api/user/profile` først; vis `LoginRequired` kun ved 401.

**Step 4: Run test to verify pass**
Run: `npx vitest run "src/app/[locale]/(user)/profile/__tests__/ProfilePageClient.test.tsx"`
Expected: PASS.

---

## Wave 4 — P1: i18n runtime + test-hygiene

### Task 8: Legg til manglende riskMetrics-nøkler og fang dynamiske keys

**Objective:** Fjern runtime `MISSING_MESSAGE` og engelske placeholder-tekster i risk panel.

**Files:**
- Modify: `messages/no.json:4782-4800`
- Modify: `messages/en.json:4787-4805`
- Modify: `scripts/validate-i18n-usage.js`
- Test: `scripts/__tests__/validate-i18n-usage.test.js`

**Step 1: Write failing test**
Legg til validator-test som krever at dynamiske nøkler under `trading.riskMetrics.scoreDescription.{low,moderate,high}` og `scoreLabel.{low,moderate,high}` finnes.
Run: `node scripts/validate-i18n-usage.js`
Expected: etter utvidelse skal den feile før messages er oppdatert.

**Step 2: Minimal messages implementation**
`messages/no.json`:
```json
"scoreTitle": "Risikoscore",
"panelTooltip": "Scoren viser hvor aggressivt du handler basert på trender, tapstreker og risikojustert avkastning.",
"hideDetails": "Skjul detaljer",
"showDetails": "Vis detaljer",
"scoreDescription": {
  "low": "Lav risiko: rolige bevegelser og få store tap.",
  "moderate": "Moderat risiko: normal aktivitet med noe svingninger.",
  "high": "Høy risiko: store svingninger og økt sjanse for tap."
},
"scoreLabel": {
  "low": "Lav risiko",
  "moderate": "Moderat risiko",
  "high": "Høy risiko"
}
```
`messages/en.json`: samme struktur på engelsk.

**Step 3: Extend validator**
I `scripts/validate-i18n-usage.js`, legg til statisk kravliste for dynamiske next-intl keys:
```js
const REQUIRED_DYNAMIC_KEYS = [
  "trading.riskMetrics.scoreDescription.low",
  "trading.riskMetrics.scoreDescription.moderate",
  "trading.riskMetrics.scoreDescription.high",
  "trading.riskMetrics.scoreLabel.low",
  "trading.riskMetrics.scoreLabel.moderate",
  "trading.riskMetrics.scoreLabel.high",
];
```
Fail hvis noen mangler i `messages/no.json` eller `messages/en.json`.

**Step 4: Verify**
Run:
```bash
npm run i18n:validate
npm run i18n:usage
```
Expected: PASS. Browser console skal ikke lenger vise `MISSING_MESSAGE` for riskMetrics.

### Task 9: Fjern hard Opik-avhengighet fra test-kritisk kode

**Objective:** `opik-client` skal ikke kreve at npm-pakken `opik` er installert for å kjøre tester.

**Files:**
- Modify: `src/lib/ai/opik-client.ts:10-24, 52-167`
- Test: `src/lib/ai/opik-client.test.ts`

**Step 1: Run failing suite**
Run: `npx vitest run src/lib/ai/opik-client.test.ts`
Expected: FAIL — `Failed to resolve import "opik"`.

**Step 2: Minimal implementation**
Erstatt SDK-typer med lokale strukturelle typer:
```ts
type OpikLikeTrace = { end?: (input?: unknown) => void };
type OpikLikeClient = { trace: (input: Record<string, unknown>) => OpikLikeTrace };
type OpikModuleLike = { Opik: new (config: { apiKey: string; projectName: string }) => OpikLikeClient };

let OpikModule: OpikModuleLike | null = null;
let OpikClientInstance: OpikLikeClient | null = null;
```
`getOpikModule()` bruker fortsatt `await import("opik")`, men caster til `OpikModuleLike | null` uten type-import av pakken.

**Step 3: Run suite to verify pass**
Run: `npx vitest run src/lib/ai/opik-client.test.ts`
Expected: PASS uten `opik` i `package.json`.

### Task 10: Konsolider fill-konstanter til én kilde

**Objective:** Paper executor, estimator og backtest skal bruke samme fee/slippage/min-order.

**Files:**
- Create: `src/lib/trading/canonical/execution/fill-constants.ts`
- Modify: `src/lib/trading/paper-executor.ts`
- Modify: `src/lib/trading/core/execute-trade.ts`
- Modify: `src/lib/trading/backtestEngine.ts`
- Modify: `src/lib/backtest/engine.ts`
- Test: `src/lib/trading/__tests__/fill-constants-parity.test.ts`
- Test: `src/lib/trading/__tests__/paper-backtest-fill-parity.test.ts`

**Step 1: Run failing parity tests**
Run:
```bash
npx vitest run src/lib/trading/__tests__/fill-constants-parity.test.ts src/lib/trading/__tests__/paper-backtest-fill-parity.test.ts
```
Expected: FAIL — `marketSlippageRate` paper=0.002 vs backtest=0.0005.

**Step 2: Minimal implementation**
```ts
export const FILL_CONSTANTS = {
  feeRate: 0.001,
  marketSlippageRate: 0.002,
  minOrderValue: 10,
} as const;
```
Bruk `FILL_CONSTANTS` i alle tre konsumentene. Valg: `0.002` fordi prosjektet har besluttet 0.2% realistisk slippage for paper trading.

**Step 3: Run parity tests to verify pass**
Run samme kommando.
Expected: PASS.

---

## Wave 5 — P1/P2: Canonical routes, cache-tester og AutoTrader

### Task 11: Gjør tester og config enige om canonical routes

**Objective:** Én route-sannhet: `/trade`, `/dashboard/historikk`, `/jokertrade`.

**Files:**
- Modify: `src/lib/navigation/config.ts:370-385`
- Modify: `src/lib/navigation/__tests__/config.test.ts`
- Modify: `src/features/trading-cockpit/__tests__/QuickActions.test.tsx`
- Modify: `src/features/trading-cockpit/__tests__/SessionList.test.tsx`
- Modify: `src/shared/navigation/__tests__/BottomTabs.test.tsx`
- Modify: `src/middleware/cache-control.ts:13-45`
- Modify: `src/middleware/cache-control.test.ts:22-41`

**Step 1: Run failing navigation/cache tests**
Run:
```bash
npx vitest run src/lib/navigation/__tests__/config.test.ts src/features/trading-cockpit/__tests__/QuickActions.test.tsx src/features/trading-cockpit/__tests__/SessionList.test.tsx src/shared/navigation/__tests__/BottomTabs.test.tsx src/middleware/cache-control.test.ts
```
Expected: FAIL.

**Step 2: Minimal implementation**
- Legg til `/jokertrade` i `APP_SHELL_PATHS`.
- I `NO_STORE_PATHS`, erstatt `/handel` med `/trade` (behold `/handel` kun hvis legacy redirect fortsatt er aktiv og testet separat).
- Oppdater tester fra `/handel` → `/trade`, `/handelshistorikk` → `/dashboard/historikk`.
- Oppdater cache-control landing-test: `/no` og `/en` skal ha marketing edge-cache (`s-maxage=300`), ikke `no-store`, fordi prosjektet krever edge-cachet landing.

**Step 3: Run tests to verify pass**
Run samme kommando.
Expected: PASS.

### Task 12: Reparer AutoTrader export/test-drift

**Objective:** `auto-trader.test.ts` skal teste faktisk public API, ikke en utdatert konstruktør.

**Files:**
- Read first: `src/lib/trading/auto-trader.ts`
- Modify: `src/lib/trading/__tests__/auto-trader.test.ts`
- Modify only if needed: `src/lib/trading/auto-trader.ts`

**Step 1: Run failing suite**
Run: `npx vitest run src/lib/trading/__tests__/auto-trader.test.ts`
Expected: FAIL — `AutoTrader is not a constructor`.

**Step 2: Minimal implementation**
Agent skal først lese `auto-trader.ts` og velge én av to minimale løsninger:
1. Hvis `AutoTrader` fortsatt er ment som public API: gjenopprett/eksporter klassen som named export.
2. Hvis factory er riktig API: oppdater testene til å bruke factory og fjern konstruktør-forventning.

**Step 3: Run suite to verify pass**
Run: `npx vitest run src/lib/trading/__tests__/auto-trader.test.ts`
Expected: PASS.

---

## Wave 6 — P2: Støy og restfeil

### Task 13: Reduser WebSocket heartbeat-støy og tom JS-exception

**Objective:** Console skal ikke fylles med heartbeat warnings ved normal bruk, og tom exception skal identifiseres.

**Files:**
- Read first: `src/lib/websocket/BinanceWebSocket.ts`
- Modify: `src/lib/websocket/BinanceWebSocket.ts`
- Test: `src/lib/websocket/__tests__/BinanceWebSocket.test.ts`

**Step 1: Reproduser**
Kjør browser QA mot `/no/trade` og samle console. Forventet før: gjentatte `Heartbeat timeout, forcing reconnect` + 1 exception uten message.

**Step 2: Minimal implementation**
- Logg heartbeat timeout kun når reconnect faktisk feiler, eller bruk `debug`-nivå for normal reconnect.
- Legg til `error.message || String(error)` ved capture slik at tom exception ikke logges uten kontekst.

**Step 3: Verify**
Browser console etter 60s på `/no/trade`: ingen gjentatte heartbeat warnings; eventuelle errors har message.

---

## Files likely to change

- `src/lib/market/nok.ts`
- `src/lib/market/__tests__/nok.test.ts`
- `src/features/trading/UnifiedTradeTerminal.tsx`
- `src/features/trading/__tests__/UnifiedTradeTerminal.prices.test.tsx`
- `src/features/trading/__tests__/UnifiedTradeTerminal.validation.test.tsx`
- `src/server/dashboard/getUserDashboardMetrics.ts`
- `src/features/dashboard/DashboardTopBar.tsx`
- `src/app/api/dashboard/metrics/route.ts`
- `src/app/api/dashboard/__tests__/metrics.route.test.ts`
- `src/app/[locale]/(user)/dashboard/historikk/ClientHandelshistorikk.tsx`
- `src/app/api/user/trade-decisions/route.ts`
- `src/app/[locale]/(user)/dashboard/settings/page.tsx`
- `src/app/[locale]/(user)/profile/page.tsx`
- `src/app/[locale]/(user)/profile/ProfilePageClient.tsx`
- `messages/no.json`
- `messages/en.json`
- `scripts/validate-i18n-usage.js`
- `src/lib/ai/opik-client.ts`
- `src/lib/trading/canonical/execution/fill-constants.ts`
- `src/lib/trading/paper-executor.ts`
- `src/lib/trading/core/execute-trade.ts`
- `src/lib/trading/backtestEngine.ts`
- `src/lib/backtest/engine.ts`
- `src/lib/navigation/config.ts`
- `src/middleware/cache-control.ts`
- relaterte tester over.

## Tests / validation

Etter hver wave:
```bash
npx vitest run <wave-test-filer>
npm run lint
```

Før ferdigstillelse:
```bash
npm run lint
npm run i18n:validate
npm run i18n:usage
CI=1 npm run test:unit
npm run build
```

Manuell browser-verifisering med QA-bruker:
- `/no/dashboard`: ingen `NaN%`, ingen “Ingen data” når paper_balance finnes, ingen `MISSING_MESSAGE` i console.
- `/no/trade`: BTC-pris er NOK-konvertert, ingen fake NOK-chart, beløp `0` gir norsk feilmelding.
- `/no/dashboard/historikk`: viser “Ingen handler”/data, ikke “Du er ikke innlogget”.
- `/no/dashboard/settings`: redirecter til `/no/profile?tab=settings` og viser innhold.
- `/no/profile`: blir stående på profil, ikke redirecte til dashboard.

## Risks, tradeoffs, and open questions

- **Cache-control landing:** Testen forventer `no-store`, men prosjektet sier landing skal være edge-cachet. Planen velger edge-cache for `/no` og `/en`; hvis dette var en bevisst sikkerhetsendring, må landing flyttes til `NO_STORE_PATHS` og testen beholdes.
- **Opik:** Planen fjerner hard type-avhengighet i stedet for å installere `opik`. Hvis Opik tracing er påkrevd i prod, må pakken heller legges til som optional dependency og testes med mock.
- **Slippage:** Velger `0.002` som eneste sannhet fordi prosjektet allerede har besluttet 0.2% for paper trading.
- **Prisrate:** Client helper bruker `NEXT_PUBLIC_USDT_NOK_RATE` hvis satt, ellers fallback 10.92. Server/cron må fortsatt eie sanntidsrate.
- **JokerTrade aktiv:** QA-bruker har JokerTrade aktiv i paper. Ikke bruk denne brukeren til rene “første bruker”-scenarier før JokerTrade er stoppet/reset.
- **AutoTrader:** Faktisk public API må leses før test endres; ikke gjett konstruktør/factory.

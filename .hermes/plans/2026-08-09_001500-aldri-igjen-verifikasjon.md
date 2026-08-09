# «Aldri igjen» — Verifikasjons- og Selvheling-plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task.

**Goal:** Forhindre at Hermes noen gang igjen erklærer noe «fikset» uten at det er verifisert i prod med faktiske data — og at Tom må oppdage feilen selv.

**Architecture:** Tre lag: (1) **Automatisk prod-verifikasjon** etter hver deploy (Playwright e2e som kjører mot klarpakke.no, ikke localhost); (2) **DB-invarianter** som feiler CI hvis data er inkonsistent (totalPnl=0 men current≠starting); (3) **Self-healing monitor** (cron) som kjører samme sjekker hvert 15. minutt og posterer til Trello + Slack ved brudd. Tom skal aldri være QA-avdelingen.

**Tech Stack:** Playwright (allerede i repo, `e2e/critical/`), GitHub Actions (deploy.yml), Supabase RPC, Trello API (allerede konfigurert i `.env.local`).

---

## Rotårsaksanalyse (hvorfor skjedde dette?)

| Feil | Hvorfor det skjedde | Konsekvens |
|---|---|---|
| Jeg erklærte «Ingen data» fikset | Verifiserte kun at `startingCapital` ble satt — ikke at `totalReturn` faktisk viste riktig verdi i UI | Tom så «9 492,46 kr + Ingen data» og måtte korrigere meg |
| Jeg brukte `accountBalance` i fiksen | `accountBalance` er `null` for live — jeg antok at den var satt uten å sjekke | Fiksen virket ikke; Tom måtte igjen korrigere |
| Ingen e2e-test fanget det | `e2e/critical/dashboard.spec.ts` tester ikke live-modus P&L | Feilen nådde prod uten at CI reagerte |
| Ingen DB-invariant | Ingen sjekk at `total_pnl=0` + `current≠starting` = inkonsistent | DB tillot logisk umulig tilstand |

**Kjernen:** Jeg verifiserte *koden* (tsc/eslint/tester), ikke *faktisk oppførsel i prod med faktiske data*. Det er forskjellen mellom «koden kompilerer» og «brukeren ser riktig tall».

---

## Task 1: Prod-verifikasjons-e2e — kjører mot klarpakke.no etter deploy

**Objective:** Playwright-test som kjører mot **prod** (ikke localhost) og verifiserer at dashboard viser riktige tall for live-modus. Feiler CI hvis «Ingen data» vises når data finnes.

**Files:**
- Create: `e2e/prod-verify/dashboard-live-pnl.spec.ts`
- Modify: `.github/workflows/deploy.yml` — legg til `prod-verify`-steg etter `e2e-smoke-prod`
- Test: `e2e/prod-verify/dashboard-live-pnl.spec.ts` (kjøres manuelt først for å bevise at den feiler på dagens bug)

**Test-design (kjernen):**
```ts
test("live dashboard viser faktisk P&L, ikke 'Ingen data'", async ({ page }) => {
  // Logg inn som Tom (QA-testbruker med live-sesjon)
  await loginAsTestUser(page);
  await page.goto("https://www.klarpakke.no/no/dashboard");

  // Bytt til live-modus
  await page.getByRole("switch", { name: /live/i }).click();

  // VERIFISER: beløpet vises (ikke "Ingen data")
  const balanceText = await page.locator("[data-testid='top-bar-balance']").textContent();
  expect(balanceText).not.toContain("Ingen data");
  expect(balanceText).toMatch(/\d/); // minst ett tall

  // VERIFISER: P&L-prosenten vises (ikke "Ingen data")
  const pnlText = await page.locator("[data-testid='top-bar-change']").textContent();
  expect(pnlText).not.toContain("Ingen data");
  expect(pnlText).toMatch(/[+-]?\d+\.\d+%/); // f.eks. "-5.08%"

  // VERIFISER: tallet stemmer med DB (API-kall i samme test)
  const metrics = await fetchMetricsFromAPI(page, "live");
  expect(metrics.totalReturn).toBeCloseTo(parseFloat(pnlText), 2);
});
```

**Step 1:** Skriv testen. Kjør den mot prod **nå** — den skal feile (dagens bug er fortsatt i prod fordi `totalReturn` viser «Ingen data» når `totalPnl=0`).

**Step 2:** Verifiser at testen feiler med eksakt samme symptom som Tom rapporterte.

**Step 3:** Fiks buggen (allerede gjort — men nå med test som beviser det).

**Step 4:** Kjør testen igjen — PASS.

**Step 5:** Legg til i CI: `prod-verify`-steg kjører etter `e2e-smoke-prod` og blokkerer deploy hvis den feiler.

**Commit:** `test(e2e): prod-verifikasjon av live P&L — aldri 'Ingen data' når data finnes`.

---

## Task 2: DB-invarianter — feil CI hvis data er logisk umulig

**Objective:** Supabase RPC-funksjon som sjekker invarianter og feiler hvis de brytes. Kjøres i CI etter deploy + i cron hvert 15. minutt.

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_dashboard_invariants.sql`
- Create: `src/lib/invariants/check-dashboard-invariants.ts`
- Modify: `.github/workflows/deploy.yml` — kjør invarianter etter deploy
- Test: `src/lib/invariants/__tests__/check-dashboard-invariants.test.ts`

**Invarianter (SQL):**
```sql
-- Invariant 1: total_pnl=0 men current≠starting → inkonsistent
-- (skjedde for Toms live-sesjon: total_pnl=0.00 men current=9492.46 vs starting=10000)
CREATE OR REPLACE FUNCTION check_dashboard_invariants()
RETURNS TABLE(invariant_name text, violation_count bigint, details jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'total_pnl_zero_but_capital_differs'::text,
    COUNT(*)::bigint,
    jsonb_agg(jsonb_build_object(
      'session_id', id,
      'starting', starting_capital_nok,
      'current', current_capital_nok,
      'total_pnl', total_pnl
    ))
  FROM trading_sessions
  WHERE mode = 'live'
    AND total_pnl = 0
    AND ABS(current_capital_nok - starting_capital_nok) > 1 -- >1 kr differanse
    AND status IN ('active', 'stopped')
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**TS-wrapper (kjøres i CI):**
```ts
export async function checkDashboardInvariants(): Promise<void> {
  const { data, error } = await supabase.rpc("check_dashboard_invariants");
  if (error) throw new Error(`Invariant-check failed: ${error.message}`);
  if (data && data.length > 0) {
    throw new Error(
      `Dashboard-invarianter brutt: ${JSON.stringify(data, null, 2)}`
    );
  }
}
```

**Step 1:** Skriv SQL + TS. Test at invarianten feiler på Toms nåværende sesjon (total_pnl=0, current≠starting).

**Step 2:** Kjør test — FAIL (invarianten er brutt i prod).

**Step 3:** Fiks data (oppdater `total_pnl` for eksisterende sesjoner — separat migrasjon).

**Step 4:** Kjør test igjen — PASS.

**Step 5:** Legg til i CI + cron.

**Commit:** `feat(invariants): DB-sjekk forhindrer total_pnl=0 når kapital er endret`.

---

## Task 3: Self-healing monitor — cron som posterer til Trello ved brudd

**Objective:** Cron-jobb (hvert 15. minutt) som kjører invarianter + prod-verifikasjon og oppretter Trello-kort i «🚨 Varsler» ved brudd. Tom skal aldri måtte rapportere feil — systemet rapporterer seg selv.

**Files:**
- Create: `src/app/api/cron/self-healing-monitor/route.ts`
- Modify: `vercel.json` (eller Cloudflare Workers cron) — legg til `*/15 * * * *`-schedule
- Test: `src/app/api/cron/self-healing-monitor/__tests__/route.test.ts`

**Design:**
```ts
export async function GET() {
  const violations: string[] = [];

  // 1. DB-invarianter
  try {
    await checkDashboardInvariants();
  } catch (e) {
    violations.push(`DB-invariant: ${e.message}`);
  }

  // 2. Prod-verifikasjon (kjør Playwright headless mot klarpakke.no)
  try {
    await runProdVerify();
  } catch (e) {
    violations.push(`Prod-verify: ${e.message}`);
  }

  // 3. Hvis brudd → opprett Trello-kort i «🚨 Varsler»
  if (violations.length > 0) {
    await createTrelloCard({
      listId: TRELLO_ALERTS_LIST_ID, // "🚨 Varsler"
      name: `Self-healing: ${violations.length} brudd oppdaget`,
      desc: violations.join("\n\n"),
    });
    return NextResponse.json({ status: "alert", violations }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
```

**Step 1–5:** TDD. Mock Trello-API i test. Verifiser at kort opprettes ved brudd.

**Commit:** `feat(monitor): self-healing cron — rapporterer brudd til Trello automatisk`.

---

## Task 4: data-testid på TopBar — gjør prod-verifikasjon stabil

**Objective:** Legg til `data-testid`-attributter på TopBar-balanse og P&L slik at Playwright-testen (Task 1) ikke brekker ved tekstendringer.

**Files:**
- Modify: `src/features/dashboard/DashboardTopBar.tsx` — legg til `data-testid="top-bar-balance"` og `data-testid="top-bar-change"`

**Step 1–5:** TDD. Test at attributtene finnes i DOM.

**Commit:** `test(a11y): data-testid på TopBar for stabil prod-verifikasjon`.

---

## Task 5: Retrospektiv-test — kjør alle sjekker mot historiske bugs

**Objective:** Verifiser at de nye sjekkene (Task 1–3) faktisk fanger **alle tidligere rapporterte bugs**. Kjør dem mot en liste over kjente feil («Ingen data», USDT-NOK-bug, guest-header, døde lenker).

**Files:**
- Create: `e2e/prod-verify/regression-suite.spec.ts`

**Design:** Parametrisert test som kjører samme sjekk for hver historisk bug:
```ts
const historicalBugs = [
  { name: "Ingen data live P&L", check: checkLivePnL },
  { name: "USDT i NOK-visning", check: checkNoUSDTInUI },
  { name: "Guest-header for innlogget", check: checkNoGuestHeader },
  { name: "Død /trade?tab=auto lenke", check: checkTabAutoWorks },
];
```

**Step 1–5:** TDD. Test skal feile på alle historiske bugs før fiks, passe etter.

**Commit:** `test(regression): retrospektiv-suite fanger alle kjente bugs`.

---

## Ikke-mål (YAGNI)

- **Ingen full observability-plattform** (Datadog, Sentry er allerede på plass). Dette er en enkel invariant-sjekk, ikke en monitoring-suite.
- **Ingen AI-drevet anomalideteksjon.** Enkle SQL-invarianter er nok — de er deterministiske og falske-positive-frie.
- **Ingen automatisk fiksing** (self-healing betyr *rapportering*, ikke *autofiks*). En menneskelig beslutning kreves for å fikse data.

## Risiko & åpne spørsmål

1. **Playwright mot prod kan være treg/flaky.** Løsning: kjør kun 1 kritisk test (live P&L), ikke hele suita. Timeout 30s.
2. **Trello-rate-limit** ved mange varsler. Løsning: dedupe — ikke opprett kort hvis samme brudd allerede har åpent kort (sjekk `dateLastActivity`).
3. **Spørsmål til Tom:** Skal cron monitoren kjøre hvert 15. minutt, eller er 1t nok? (Kostnad: 1 Trello-API-kall per brudd.)

## Verifiseringsplan (før «ferdig» erklæres)

1. Kjør `e2e/prod-verify/dashboard-live-pnl.spec.ts` mot prod — PASS.
2. Kjør `check-dashboard-invariants.ts` — 0 violations.
3. Kjør `regression-suite.spec.ts` — alle historiske bugs fanget.
4. Verifiser i Trello at self-healing-kort opprettes ved test-brudd.
5. **Tom verifiserer selv i prod** at dashboard viser −5.08% (ikke «Ingen data») før planen erklæres ferdig.

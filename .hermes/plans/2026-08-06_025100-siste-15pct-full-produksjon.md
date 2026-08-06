# 🏁 Siste 15% — Fullfør Klarpakke til 100% Produksjon

> **For Hermes:** Bruk subagent-driven-development. Prioritet: 🔴 > 🟡. TDD på all ny kode. Hyppige commits.

**Goal:** Lukke alle åpne sår — aktivere orchestrator for Tom, merge grid-manager og orchestrator til én kodesti, E2E-verifisering, og permanent R2-fiks.

**Architecture:** Rewire C2 cron-rute → bruk `processAutopilotUser()` fra C1 orchestrator-modulen. Orchestrator erstatter grid-manager for Tom (én kodesti). E2E-tester autopilot fra innskudd til profit. R2-scope utvides i Cloudflare-token.

**Tech Stack:** TypeScript, vitest, Supabase, Kraken REST, Cloudflare Workers API, Playwright.

---

## Forutsetninger

- **Orchestrator-modulen** (`src/lib/trading/autopilot/orchestrator.ts`) er ferdig, TDD-testet (9 tester), tsc=0
- **C2 cron-rute** (`src/app/api/cron/autopilot-orchestrator/route.ts`) har inline pipeline — må rewires
- **Grid-manager** (`scripts/kraken-grid-manager.mjs`) håndterer Tom i dag — må fases ut
- **R2-patch** ligger i `node_modules/@opennextjs/cloudflare/dist/cli/utils/ensure-r2-bucket.js` — fungerer men er en hack
- **Kraken-connect** (`src/app/api/kraken/connect/route.ts`) fikset med mock — aldri testet mot ekte API

---

## 🔴 Fase 1: Orchestrator-aktivering for Tom (én kodesti)

### Task 1.1: Rewire C2 cron-rute → bruk `processAutopilotUser`

**Objective:** Erstatt inline-pipelinen i `src/app/api/cron/autopilot-orchestrator/route.ts` med kall til `processAutopilotUser()` fra orchestrator-modulen.

**Files:**
- Modify: `src/app/api/cron/autopilot-orchestrator/route.ts`

**Step 1: Bygg Adapter-bro**

C1's `processAutopilotUser` tar `AutopilotDb`-interface. C2 bruker raw `SupabaseClient<Database>`. Lag en factory-funksjon:

```typescript
// I route.ts, rett før POST
function createDbFromEnv(): AutopilotDb {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const db: AutopilotDb = {
    fetchUserKrakenKeys: async (userId) => {
      const { data } = await supabase
        .from("user_kraken_keys")
        .select("api_key_encrypted, api_secret_encrypted")
        .eq("user_id", userId).eq("is_active", true).maybeSingle();
      if (!data) return null;
      return {
        api_key_encrypted: data.api_key_encrypted,
        api_secret_encrypted: data.api_secret_encrypted,
      };
    },
    fetchAutopilotState: async (userId) => {
      const { data } = await supabase
        .from("autopilot_state").select("*")
        .eq("user_id", userId).maybeSingle();
      if (!data) return null;
      return {
        ...data,
        grid_levels: (data.grid_levels ?? {}) as unknown as Record<string, any[]>,
      };
    },
    saveAutopilotState: async (userId, patch) => {
      const { error } = await supabase.from("autopilot_state").upsert(
        { user_id: userId, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    createKrakenClient: async (userId) => {
      const keys = await db.fetchUserKrakenKeys(userId);
      if (!keys) throw new Error(`No Kraken keys for ${userId}`);
      const apiKey = await decryptApiKey(keys.api_key_encrypted);
      const apiSecret = await decryptApiKey(keys.api_secret_encrypted);
      return new KrakenClient(apiKey, apiSecret);
    },
  };
  return db;
}
```

**Step 2: Erstatt per-bruker inline-logikk**

I POST-handleren, erstatt den direkte `scanPortfolio → allocateCapital → computeReinvest → upsert`-sekvensen med:

```typescript
import { processAutopilotUser } from "@/lib/trading/autopilot/orchestrator";

for (const user of batch) {
  try {
    const db = createDbFromEnv();
    const result = await processAutopilotUser(db, user.user_id);
    results.push({
      user_id: user.user_id,
      ok: !result.killTriggered,
      equity_usdc: result.equityUsdc,
      error: result.error,
    });
  } catch (err) {
    results.push({
      user_id: user.user_id,
      ok: false,
      error: err instanceof Error ? err.message : "Unknown",
    });
  }
}
```

**Step 3: Oppdater eksisterende tester**

`route.test.ts` har 4 tester — oppdater mockene til å bruke orchestrator-funksjonen i stedet for inline-logikk. Legg til 2 nye tester:
- `processAutopilotUser` kalles med riktig userId
- Kill-trigger returneres korrekt i resultatet

**Step 4: Verifiser**

```bash
npx vitest run src/app/api/cron/autopilot-orchestrator/__tests__/route.test.ts  # 6/6 pass
npx tsc --noEmit  # 0 feil
git add src/app/api/cron/autopilot-orchestrator/route.ts
git commit -m "refactor: rewiring C2 cron → processAutopilotUser (C1 orchestrator)"
```

### Task 1.2: Aktiver orchestrator-cron for Tom (pg_cron)

**Objective:** Opprett pg_cron-jobben som kaller orchestrator for Tom. Kun Tom til å begynne med (ingen andre brukere har Kraken-nøkler).

**Files:**
- Modify: Supabase pg_cron (via MCP `execute_sql`)

**Step 1: Opprett cron-jobben**

```sql
SELECT cron.schedule(
  'klarpakke-autopilot-orchestrator',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.klarpakke.no/api/cron/autopilot-orchestrator',
      headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'::jsonb
    );
  $$
);
```

**Step 2: Verifiser at jobben er opprettet**

```sql
SELECT jobid, schedule, command, active FROM cron.job WHERE jobname = 'klarpakke-autopilot-orchestrator';
```

**Step 3: Første manuelle kjøring for å teste**

```bash
curl -X POST "https://www.klarpakke.no/api/cron/autopilot-orchestrator" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" | jq .
```

Forventet respons: `{ "processed": 1, "errors": 0 }` (kun Tom).

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: aktiver orchestrator-cron for Tom — pg_cron hvert 5. min"
```

### Task 1.3: Deaktiver grid-manager-cron

**Objective:** Fjern `run-grid-manager.sh` cron-jobben (Hermes-cron). Orchestrator er nå SSoT for Tom.

**Files:**
- Modify: Hermes cron (via `cronjob` tool)

**Step 1: Pause grid-manager-cron**

```bash
# Via cronjob action='pause' — job_id: 1660f585a1ab
cronjob(action='pause', job_id='1660f585a1ab')
```

**Step 2: Overvåk orchestrator-output**

Sjekk at orchestrator-cron leverer innen 10 min:
```bash
# Les autopilot_state for Tom
SELECT * FROM autopilot_state WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
```

**Step 3: Verifiser equity + grid-nivåer matches**

Sammenlign orchestrator-utdata med siste grid-manager-state:
```bash
cat .hermes/kraken-grid-state.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'grid-manager equity: {d.get(\"total_usdc\",\"?\")}')"
# vs
# orchestrator autopilot_state.current_equity_usdc
```

**Step 4: Først når bekreftet: fjern grid-manager-cron helt**

```bash
cronjob(action='remove', job_id='1660f585a1ab')
git rm scripts/kraken-grid-manager.mjs  # arkiver, ikke slett permanent
git commit -m "refactor: fjern grid-manager — orchestrator er SSoT for Tom"
```

---

## 🔴 Fase 2: E2E-autopilot (Playwright)

### Task 2.1: Autopilot E2E-test (innskudd → grid → profit)

**Objective:** Playwright-test som simulerer: (1) bruker kobler Kraken, (2) innskudd mottas, (3) autopilot starter, (4) grid opererer, (5) profit akkumuleres, (6) dashboard viser korrekt state.

**Files:**
- Create: `tests/e2e/autopilot/autopilot-flow.spec.ts`
- Modify: `playwright.allure.config.ts` (legg til autopilot test-grep)

**Step 1: Skriv test-scenario**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Autopilot E2E", () => {
  test("innskudd → autopilot-aktivering → grid i dashboard", async ({ page }) => {
    // 1. Logg inn som testbruker
    await page.goto("https://staging.klarpakke.no/no/login");
    await page.fill('[name="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // 2. Naviger til handel
    await page.goto("https://staging.klarpakke.no/no/handel");
    
    // 3. Verifiser at AutopilotDashboard IKKE vises (ingen Kraken-kobling)
    await expect(page.locator("text=Kraken Autopilot")).not.toBeVisible();
    
    // 4. Naviger til innstillinger → koble Kraken (mock API-respons)
    // Bruk page.route for å mocke connect-endepunktet
    
    // 5. Simuler innskudd (mock deposit-webhook)
    
    // 6. Vent på orchestrator-kjøring → verifiser AutopilotDashboard vises
    await page.waitForSelector("text=Kraken Autopilot", { timeout: 30000 });
    
    // 7. Verifiser equity vises
    await expect(page.locator("text=Equity")).toBeVisible();
    
    // 8. Verifiser grid-nivåer vises
    await expect(page.locator("text=Kjøpsnivåer")).toBeVisible();
  });
});
```

**Step 2: Kjør test — se den feile (RØD)**

```bash
npx playwright test tests/e2e/autopilot/autopilot-flow.spec.ts --project=chromium
```

**Step 3: Implementer mocks + infrastruktur**

Legg til `page.route()` for Kraken connect-API (mock 200 OK).
Legg til `page.route()` for autopilot-state API (mock activated=true med data).

**Step 4: Kjør test — se den passere (GRØNN)**

```bash
npx playwright test tests/e2e/autopilot/autopilot-flow.spec.ts --project=chromium
```

**Step 5: Commit**

```bash
git add tests/e2e/autopilot/ playwright.allure.config.ts
git commit -m "test: autopilot E2E — innskudd→grid→dashboard synlig"
```

---

## 🟡 Fase 3: Permanent fikser

### Task 3.1: Test connect-ruta mot ekte Kraken API

**Objective:** Verifiser at `POST /api/kraken/connect` fungerer med ekte Kraken-nøkler (ikke mock).

**Step 1: Opprett test-nøkler på Kraken**

Logg inn på Kraken → Settings → API → Generate new key. Sett:
- Query funds: ✅
- Query open orders & trades: ✅
- Modify orders: ✅
- Withdraw funds: ❌ (VIKTIG!)

**Step 2: Test connect-ruta**

```bash
curl -X POST "https://www.klarpakke.no/api/kraken/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [CRON_SECRET]" \
  -d '{"api_key":"...", "api_secret":"..."}' | jq .
```

Forventet: `{ "success": true, "message": "Kraken-tilkobling lagret" }`

**Step 3: Hvis feil: debug og fiks**

Hvis 400 "Invalid API keys": verifiser at nøklene fungerer med direkte curl mot Kraken:
```bash
cd scripts && node -e "
import {KrakenClient} from '../src/lib/exchanges/kraken/client.ts';
const c = new KrakenClient('key', 'secret');
c.getBalance().then(console.log).catch(console.error);
"
```

**Step 4: Commit eventuelle fiks**

### Task 3.2: Permanent R2-fiks (Cloudflare API Token scope)

**Objective:** Utvid `CLOUDFLARE_API_TOKEN` sitt scope til å inkludere R2 Read — da trenger vi ikke R2-patch.

**Step 1: Sjekk nåværende token-scope**

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result.policies'
```

**Step 2: Legg til R2-lese-tilgang på tokenet**

Cloudflare Dashboard → Profile → API Tokens → Rediger `CLOUDFLARE_API_TOKEN`. Legg til permission: `Account → Workers R2 Storage → Read` for resource `All accounts` eller spesifikt kontonr.

**Step 3: Reverter R2-patch i node_modules**

```bash
cd /Users/taj/klarpakke && npm install  # dette resetter node_modules til original
# Test deploy — skal fungere UTEN R2-patch
npx wrangler deploy --env "" --var "APP_VERSION:$(git rev-parse --short HEAD)"
```

**Step 4: Oppdater deploy-prosedyre**

Fjern R2-patch fra `deploy-klarpakke.sh` (klarpakke-trading-strategy skill). Tokenet har nå riktig scope.

---

## 🟡 Fase 4: Overvåkning + Kvalitet

### Task 4.1: Autopilot-overvåkning (Sentry + Cron)

**Objective:** Legg til Sentry-spor i orchestrator + cron som varsler hvis autopilot feiler 2+ ganger på rad.

**Step 1: Legg til Sentry i orchestrator**

```typescript
// I cron-rutens feilhåndtering:
import * as Sentry from "@sentry/nextjs";

catch (err) {
  Sentry.captureException(err, {
    tags: { component: "autopilot-orchestrator", user_id: user.user_id },
  });
  // Fortsett til neste bruker
}
```

**Step 2: Cron-varsling**

Lag Hermes-cron `autopilot-watchdog` (hvert 30. min) som sjekker:
```sql
SELECT user_id FROM autopilot_state 
WHERE last_run < NOW() - INTERVAL '15 minutes' 
AND activated = true;
```

Hvis noen brukere har `last_run > 15 min gammel` → varsle.

### Task 4.2: A/B-automatisering (grid-ruting 48t-måling)

**Objective:** Automatiser A/B-målingen for grid-default-ruting — daglig SQL-sjekk.

**Step 1: SQL-snippet for daglig analyse**

```sql
-- Grid-arm (nye sesjoner med strategy_id='grid', siste 48t)
SELECT 
  COUNT(*) AS total_trades,
  COUNT(*) FILTER (WHERE realized_pnl > 0) AS wins,
  SUM(realized_pnl) AS pnl,
  ROUND(SUM(realized_pnl) FILTER (WHERE realized_pnl > 0) 
    / NULLIF(ABS(SUM(realized_pnl) FILTER (WHERE realized_pnl < 0)), 0), 2) AS profit_factor
FROM trades t
JOIN trading_sessions s ON s.id = t.session_id
WHERE s.strategy_id = 'grid'
  AND t.executed_at > NOW() - INTERVAL '48 hours'
  AND t.contamination_cutoff = false;
```

**Step 2: Legg SQL i daglig-analyse-cron**

Oppdater `ada921a4e191` (Tom Kraken Live — daglig analyse) sin prompt med A/B-seksjonen.

---

## Sammendrag — alle tasks

| # | Task | Fase | Estimat |
|---|---|---|---|
| 1.1 | Rewire C2 → `processAutopilotUser` | 🔴 Fase 1 | 15 min |
| 1.2 | Aktiver pg_cron for orchestrator | 🔴 Fase 1 | 5 min |
| 1.3 | Pause → fjern grid-manager-cron | 🔴 Fase 1 | 5 min + 24t overvåkning |
| 2.1 | Autopilot E2E (Playwright) | 🔴 Fase 2 | 20 min |
| 3.1 | Test connect-ruta mot ekte Kraken | 🟡 Fase 3 | 10 min |
| 3.2 | Permanent R2-fiks (token scope) | 🟡 Fase 3 | 10 min |
| 4.1 | Autopilot-overvåkning (Sentry + Cron) | 🟡 Fase 4 | 15 min |
| 4.2 | A/B-automatisering | 🟡 Fase 4 | 10 min |

---

## Risikoer

1. **Orchestrator + grid-manager dobbelt-kjøring:** Må PAUSE grid-manager FØR orchestrator aktiveres. Rekkefølge: pause → aktivere orchestrator → verifisere → fjerne.
2. **`processAutopilotUser` plasserer ordrer:** C1's orchestrator kaller `KrakenGridTrader.runGridTick()` som faktisk plasserer kjøps-/salgsordre. Dette er riktig (det gjorde grid-manageren også), men vi MÅ verifisere at kun orchestrator kjører, ikke begge samtidig.
3. **E2E krever staging-miljø:** Staging må ha `autopilot_state`-tabellen (allerede migrert). Test-nøkler må være gyldige.
4. **R2-token-oppdatering kan brekke andre ting:** Verifiser at Workers-deploy fortsatt fungerer etter token-endring.

---

## Åpne spørsmål

1. **Skal orchestrator også håndtere paper-brukere?** Nei — orchestrator er kun for Kraken-tilkoblede. Paper-brukere fortsetter via tick-motoren.
2. **Hva med andre brukere enn Tom?** Ingen andre har Kraken-tilkobling foreløpig. Orchestrator leter etter `autopilot_state.activated=true` — ingen treff = ingen handling.
3. **Skal vi beholde grid-manager-koden for referanse?** Ja — `git rm` den fra aktiv bruk men behold i git-historikk.

---
*Plan generert 2026-08-06 — 4 faser, 8 tasks, TDD + subagenter.*

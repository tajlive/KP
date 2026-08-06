# Currency Conversion

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

> ⚠️ **Eierskap:** NOK/USDT-valuta-kontrakten (DB=NOK, Binance=USDT, DB-guard-intervaller) eies av `klarpakke-trading-strategy`. Denne filen dekker KUN frontend-visnings-feil (dobbelkonvertering i React-komponenter).


## 4. USDT→NOK dobbelkonvertering

**Symptom:** Posisjoner ~9,8× for høye.

**Rotårsak:** `coin_prices.price` er NOK. binance-24hr fallback `source=db-cache` returnerer NOK uten flagg.

**Fiks:** `useRealtimePrices` propagerer `source`. Skip USDT→NOK ved db-cache:

```tsx
const usdtPrice = source === "db-cache" ? c.price / usdtNok : c.price;
```

---


## 39. E2E-test for P&L/valuta/balanse — Playwright + Supabase RPC-verifisering (2026-08-03)

**Mønster:** E2E-tester som verifiserer at UI viser samme tall som DB (innenfor margin).

**Test-suite opprettet (2026-08-03):**

| Test-fil | Formål | Verifiserer |
|---|---|---|
| `e2e/smoke/currency-contract.spec.ts` | Valuta-kontrakt | Alle priser i NOK (ikke USDT) |
| `e2e/smoke/i18n-keys.spec.ts` | i18n-kompletthet | Ingen rå nøkler (`dashboard.xxx.yyy`) |
| `e2e/smoke/pnl-accuracy.spec.ts` | P&L-korrekthet | UI P&L = DB P&L (±1% margin) |
| `e2e/smoke/all-pages.spec.ts` | Krasj-sjekk | Alle sider laster uten error |

**P&L-accuracy-mønster (verifisert):**

```typescript
// 1. Hent P&L fra UI
const heroPill = page.getByText("Siste endring").locator("..").first();
const uiText = await heroPill.innerText();
const uiPnlPct = parseFloat(uiText.match(/[-+]?\d+\.?\d*%/)![0]);

// 2. Hent P&L fra DB via Supabase RPC
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const { data } = await supabase.rpc("get_dashboard_metrics", {
  p_user_id: userId,
  p_mode: "paper",
  p_statuses: ["active", "paused", "stopped"],
});
const dbPnl = Number(data?.[0]?.total_pnl ?? 0);

// 3. Verifiser diff <= 1% margin
const diff = Math.abs(uiPnlPct - dbPnl);
const margin = Math.max(1, Math.abs(dbPnl) * 0.01);
expect(diff).toBeLessThanOrEqual(margin);
```

**Kritiske feller:**

1. **Auth-brukere i URL = sikkerhetsissue** — `page.goto("/login?email=x&password=y")` eksponerer credentials i URL (server-logger, browser-history). Bruk alltid `page.fill()` + `page.click()`:
   ```typescript
   // FEIL — credentials i URL:
   await page.goto(`/login?email=${email}&password=${password}`);
   
   // RIKTIG — credentials i form:
   await page.goto("/login");
   await page.fill('input[type="email"]', email);
   await page.fill('input[type="password"]', password);
   await page.click('button[type="submit"]');
   ```

2. **Supabase RPC fra Playwright** — service-role key må lastes fra `.env.local` eksplisitt (Playwright gjør det ikke automatisk):
   ```typescript
   import dotenv from "dotenv";
   dotenv.config({ path: ".env.local" });
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );
   ```

3. **U+00A0 (non-breaking space) i NOK-format** — norsk locale bruker U+00A0 som tusen-separator (`64 024,69 kr`). Regex må matche `\s`, ikke ASCII space:
   ```typescript
   // FEIL — matcher ikke U+00A0:
   /\d{1,3}( \d{3})+,\d{2} kr/
   
   // RIKTIG — matcher både space og U+00A0:
   /\d{1,3}(\s\d{3})+,\d{2}\s?kr/
   ```

4. **Flaky login** — `waitForURL(/dashboard/)` kan time out ved treg nettverk. Bruk `waitForTimeout` + retry:
   ```typescript
   await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {
     // Retry med reload
     await page.reload();
     return page.waitForURL(/dashboard/, { timeout: 15000 });
   });
   ```

**Kjør full suite:**
```bash
npx playwright test e2e/smoke/all-pages.spec.ts e2e/smoke/currency-contract.spec.ts e2e/smoke/i18n-keys.spec.ts e2e/smoke/pnl-accuracy.spec.ts --project=chromium
```

**Se:** `references/e2e-fakta-verifisering-2026-08-03.md` for komplett test-suite med Allure/Lighthouse-integrasjon.

---



# Nettside Fakta-Verifisering Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Verifiser at ALLE nettsider på klarpakke.no viser korrekte data — ingen feil tall, ingen manglende i18n-nøkler, ingen valuta-bugs, ingen falske P&L-verdier.

**Architecture:** Systematisk audit av alle sider med Playwright + Supabase-verifisering. Fiks alle avvik umiddelbart.

**Tech Stack:** Playwright (E2E), Supabase (data-verifisering), TypeScript, Next.js 16

---

## 🎯 Omfanget

**Sider som MÅ verifiseres:**
1. Landing (/)
2. Trade (/trade) — alle 5 moduser
3. Dashboard (/dashboard)
4. Portefølje (/dashboard/portfolio)
5. Historikk (/dashboard/historikk)
6. Resultater (/dashboard/resultater)
7. Analyse (/dashboard/analysis)
8. Profil (/profile)
9. Priser (/priser)
10. Kurs (/kurs)
11. Om oss (/om-oss)

**Hva som MÅ verifiseres per side:**
- ✅ i18n-nøkler (ingen rå `dashboard.xxx.yyy` tekster)
- ✅ Valuta-kontrakt (alle priser i NOK, korrekt formatert)
- ✅ P&L-beregninger (stemmer med DB)
- ✅ Balanse (paper_accounts.current_balance korrekt)
- ✅ Ingen "Laster..." som henger
- ✅ Ingen console errors
- ✅ Ingen tomme seksjoner som burde ha data

---

## 📋 Kjente problemer (fra dashboard-analyse)

### 🔴 KRITISK: Balance-bug i paper_accounts
**Symptom:** Dashboard viser -30 135 NOK tap, men posisjoner er korrekte (+/- 1%).

**Rotårsak:** `paper_accounts.current_balance` ble trukket for kjøp, men posisjoner ble ikke riktig verdsatt pga. valuta-bug (orphan-adopsjon + highest_price-tracking).

**Påvirkede brukere:** ALLE som hadde aktive posisjoner under valuta-bug-perioden (2026-08-02 til 2026-08-03).

**Fiks:** Beregn korrekt balance fra `trading_sessions` (cash + posisjonsverdi) og oppdater `paper_accounts.current_balance`.

### 🔴 KRITISK: To forskjellige balanser vises
**Symptom:** Dashboard viser både 105 604 kr (hero) og 69 864 kr (portefølje) — forvirrende.

**Rotårsak:** Hero bruker `accountBalance` (fra paper_accounts), portefølje bruker `totalCapital` (fra trading_sessions).

**Fiks:** Bruk SAMME datakilde overalt — `paper_accounts.current_balance` (SSoT).

### 🟡 i18n-nøkler mangler
**Symptom:** Rå nøkler vises (`dashboard.adaptive.pilotTradeTitle`).

**Status:** ✅ FIKSET i commit `90a8f2642` (no.json).

**Verifiser:** Sjekk at ALLE andre språk (en, zh) også har nøklene.

---

## 📐 Implementation Tasks

### Task 1: Lag balance-reparasjon script

**Objective:** Fiks `paper_accounts.current_balance` for alle brukere berørt av valuta-bug.

**Files:**
- Create: `scripts/repair-paper-account-balances.ts`
- Test: `scripts/__tests__/repair-paper-account-balances.test.ts`

**Step 1: Skriv failing test**

```typescript
// scripts/__tests__/repair-paper-account-balances.test.ts
import { describe, it, expect } from "vitest";
import { calculateCorrectBalance } from "../repair-paper-account-balances";

describe("calculateCorrectBalance", () => {
  it("beregner korrekt balance fra sesjoner", () => {
    const sessions = [
      { current_capital_nok: 9000, open_position: { quantity: 0.01, entry_price: 600000 } },
      { current_capital_nok: 9500, open_position: null },
    ];
    const coinPrices = { BTCUSDT: 602000 };
    
    const result = calculateCorrectBalance(sessions, coinPrices);
    
    // 9000 cash + (0.01 * 602000) posisjonsverdi + 9500 cash = 24 520
    expect(result).toBe(24520);
  });
});
```

**Step 2: Kjør test for å verifisere failure**

```bash
npx vitest run scripts/__tests__/repair-paper-account-balances.test.ts
# Expected: FAIL — "calculateCorrectBalance is not defined"
```

**Step 3: Implementer minimal kode**

```typescript
// scripts/repair-paper-account-balances.ts
import { createClient } from "@supabase/supabase-js";

interface Session {
  current_capital_nok: number;
  open_position: { quantity: number; entry_price: number } | null;
  trading_pair: string;
}

interface CoinPrices {
  [symbol: string]: number;
}

export function calculateCorrectBalance(
  sessions: Session[],
  coinPrices: CoinPrices
): number {
  let total = 0;
  
  for (const session of sessions) {
    // Cash
    total += session.current_capital_nok;
    
    // Posisjonsverdi (hvis åpen posisjon)
    if (session.open_position) {
      const marketPrice = coinPrices[session.trading_pair] ?? session.open_position.entry_price;
      const positionValue = session.open_position.quantity * marketPrice;
      total += positionValue;
    }
  }
  
  return total;
}

export async function repairAllBalances() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Hent alle paper-brukere
  const { data: users } = await supabase
    .from("paper_accounts")
    .select("user_id, current_balance");
  
  if (!users) return;
  
  for (const user of users) {
    // Hent aktive sesjoner
    const { data: sessions } = await supabase
      .from("trading_sessions")
      .select("current_capital_nok, open_position, trading_pair")
      .eq("user_id", user.user_id)
      .eq("mode", "paper")
      .eq("status", "active");
    
    // Hent coin-priser
    const { data: prices } = await supabase
      .from("coin_prices")
      .select("symbol, price");
    
    const coinPrices: CoinPrices = {};
    prices?.forEach(p => coinPrices[p.symbol] = p.price);
    
    // Beregn korrekt balance
    const correctBalance = calculateCorrectBalance(sessions ?? [], coinPrices);
    
    // Oppdater hvis avvik > 100 NOK
    const diff = Math.abs(correctBalance - user.current_balance);
    if (diff > 100) {
      console.log(`Reparerer ${user.user_id}: ${user.current_balance} → ${correctBalance}`);
      
      await supabase
        .from("paper_accounts")
        .update({ current_balance: correctBalance })
        .eq("user_id", user.user_id);
    }
  }
}

// CLI-kjøring
if (require.main === module) {
  repairAllBalances().then(() => {
    console.log("✅ Ferdig");
    process.exit(0);
  });
}
```

**Step 4: Kjør test for å verifisere pass**

```bash
npx vitest run scripts/__tests__/repair-paper-account-balances.test.ts
# Expected: PASS
```

**Step 5: Dry-run på test-bruker**

```typescript
// Test på én bruker først
const testUserId = "test+tricky+123@klarpakke.no";
// ... kjør repairAllBalances() kun for denne brukeren
```

**Step 6: Commit**

```bash
git add scripts/repair-paper-account-balances.ts scripts/__tests__/repair-paper-account-balances.test.ts
git commit -m "fix(balance): reparer paper_accounts.current_balance fra sesjoner

Valuta-buggen (orphan-adopsjon + highest_price) førte til at
paper_accounts.current_balance ble trukket for kjøp, men posisjoner
ble ikke riktig verdsatt. Dette scriptet beregner korrekt balance
fra trading_sessions (cash + posisjonsverdi) og oppdaterer."
```

---

### Task 2: Verifiser i18n-nøkler for ALLE språk

**Objective:** Sjekk at alle språk har samme nøkler (no, en, zh).

**Files:**
- Create: `scripts/verify-i18n-completeness.ts`

**Step 1: Skriv script**

```typescript
// scripts/verify-i18n-completeness.ts
import fs from "fs";
import path from "path";

const languages = ["no", "en", "zh"];
const baseKeys = new Set<string>();

// Last base-språk (no)
const noPath = path.join(__dirname, "../messages/no.json");
const noJson = JSON.parse(fs.readFileSync(noPath, "utf-8"));

function extractKeys(obj: any, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const noKeys = extractKeys(noJson);
noKeys.forEach(k => baseKeys.add(k));

// Sjekk andre språk
for (const lang of languages.filter(l => l !== "no")) {
  const langPath = path.join(__dirname, `../messages/${lang}.json`);
  const langJson = JSON.parse(fs.readFileSync(langPath, "utf-8"));
  const langKeys = new Set(extractKeys(langJson));
  
  const missing = [...baseKeys].filter(k => !langKeys.has(k));
  
  if (missing.length > 0) {
    console.error(`❌ ${lang}.json mangler ${missing.length} nøkler:`);
    missing.forEach(k => console.error(`  - ${k}`));
  } else {
    console.log(`✅ ${lang}.json har alle nøkler`);
  }
}
```

**Step 2: Kjør script**

```bash
npx tsx scripts/verify-i18n-completeness.ts
# Expected: Liste over manglende nøkler (eller ✅ hvis alt OK)
```

**Step 3: Fiks manglende nøkler**

For hver manglende nøkkel, kopier fra `no.json` og oversett.

**Step 4: Commit**

```bash
git add messages/ scripts/verify-i18n-completeness.ts
git commit -m "fix(i18n): verifiser og fiks manglende nøkler for alle språk"
```

---

### Task 3: E2E-test for valuta-kontrakt

**Objective:** Verifiser at ALLE priser vises i NOK (ikke USDT).

**Files:**
- Create: `e2e/smoke/currency-contract.spec.ts`

**Step 1: Skriv test**

```typescript
// e2e/smoke/currency-contract.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Valuta-kontrakt — alle priser i NOK", () => {
  test("Dashboard viser NOK (ikke USDT)", async ({ page }) => {
    // Logg inn
    await page.goto("https://www.klarpakke.no/no/login");
    await page.fill('input[type="email"]', "test+tricky+123@klarpakke.no");
    await page.fill('input[type="password"]', "TestTest123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    
    // Sjekk at priser er i NOK (inneholder "kr" eller tusentall)
    const bodyText = await page.locator("body").textContent();
    
    // Verifiser at vi IKKE ser USDT-priser (f.eks. "62 000" for BTC)
    expect(bodyText).not.toContain("62 000 USDT");
    expect(bodyText).not.toContain("60000");
    
    // Verifiser at vi SER NOK-priser (f.eks. "594 633 kr" for BTC)
    expect(bodyText).toMatch(/\d{3}\s?\d{3}\s?kr/); // Format: "594 633 kr"
  });
  
  test("Portefølje viser NOK-balanse", async ({ page }) => {
    await page.goto("https://www.klarpakke.no/no/login");
    await page.fill('input[type="email"]', "test+tricky+123@klarpakke.no");
    await page.fill('input[type="password"]', "TestTest123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    
    // Gå til portefølje
    await page.click("text=Portefølje");
    await page.waitForTimeout(2000);
    
    // Sjekk at balanse vises i NOK
    const balanceText = await page.locator("text=/\\d+\\s?kr/").first().textContent();
    expect(balanceText).toMatch(/\d+\s?kr/);
  });
});
```

**Step 2: Kjør test**

```bash
npx playwright test e2e/smoke/currency-contract.spec.ts --project=chromium
# Expected: PASS (eller FAIL hvis USDT-priser vises)
```

**Step 3: Commit**

```bash
git add e2e/smoke/currency-contract.spec.ts
git commit -m "test(e2e): verifiser at alle priser vises i NOK (valuta-kontrakt)"
```

---

### Task 4: E2E-test for i18n-nøkler

**Objective:** Verifiser at INGEN sider viser rå i18n-nøkler.

**Files:**
- Create: `e2e/smoke/i18n-keys.spec.ts`

**Step 1: Skriv test**

```typescript
// e2e/smoke/i18n-keys.spec.ts
import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/trade",
  "/dashboard",
  "/dashboard/portfolio",
  "/dashboard/historikk",
  "/priser",
  "/kurs",
];

test.describe("i18n — ingen rå nøkler", () => {
  for (const path of PAGES) {
    test(`${path} viser ikke rå i18n-nøkler`, async ({ page }) => {
      await page.goto(`https://www.klarpakke.no${path}`);
      await page.waitForTimeout(2000);
      
      const bodyText = await page.locator("body").textContent();
      
      // Sjekk for rå nøkler (format: "namespace.key" eller "namespace.section.key")
      const rawKeyPattern = /\b(dashboard|trading|common|portfolio)\.[a-z]+\.[a-zA-Z]+\b/g;
      const matches = bodyText?.match(rawKeyPattern) ?? [];
      
      expect(
        matches.length,
        `Fant rå i18n-nøkler på ${path}: ${matches.join(", ")}`
      ).toBe(0);
    });
  }
});
```

**Step 2: Kjør test**

```bash
npx playwright test e2e/smoke/i18n-keys.spec.ts --project=chromium
# Expected: PASS (eller FAIL med liste over rå nøkler)
```

**Step 3: Commit**

```bash
git add e2e/smoke/i18n-keys.spec.ts
git commit -m "test(e2e): verifiser at ingen sider viser rå i18n-nøkler"
```

---

### Task 5: E2E-test for P&L-korrekthet

**Objective:** Verifiser at P&L stemmer med DB.

**Files:**
- Create: `e2e/smoke/pnl-accuracy.spec.ts`

**Step 1: Skriv test**

```typescript
// e2e/smoke/pnl-accuracy.spec.ts
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Dashboard P&L stemmer med DB", async ({ page }) => {
  // Logg inn
  await page.goto("https://www.klarpakke.no/no/login");
  await page.fill('input[type="email"]', "test+tricky+123@klarpakke.no");
  await page.fill('input[type="password"]', "TestTest123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await page.waitForTimeout(3000);
  
  // Hent P&L fra UI
  const pnlText = await page.locator("text=/[-+]?\\d+\\.?\\d*%/").first().textContent();
  const uiPnl = parseFloat(pnlText?.replace("%", "") ?? "0");
  
  // Hent P&L fra DB
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data } = await supabase.rpc("get_dashboard_metrics", {
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_mode: "paper",
    p_statuses: ["active", "paused", "stopped", "completed"],
  });
  
  const dbPnl = data?.[0]?.total_pnl ?? 0;
  
  // Verifiser at UI og DB stemmer (innenfor 1% margin)
  const diff = Math.abs(uiPnl - dbPnl);
  const margin = Math.abs(dbPnl * 0.01);
  
  expect(
    diff,
    `UI viser ${uiPnl}%, DB viser ${dbPnl}% — avvik på ${diff}%`
  ).toBeLessThanOrEqual(margin);
});
```

**Step 2: Kjør test**

```bash
npx playwright test e2e/smoke/pnl-accuracy.spec.ts --project=chromium
# Expected: PASS (eller FAIL hvis P&L ikke stemmer)
```

**Step 3: Commit**

```bash
git add e2e/smoke/pnl-accuracy.spec.ts
git commit -m "test(e2e): verifiser at P&L stemmer med DB"
```

---

### Task 6: Fiks dobbel balanse-visning

**Objective:** Bruk SAMME datakilde for balanse overalt.

**Files:**
- Modify: `src/features/dashboard/AdaptiveDashboard.tsx`
- Modify: `src/features/dashboard/DashboardContent.tsx`

**Step 1: Identifiser alle steder som viser balanse**

```bash
grep -rn "accountBalance\|totalCapital\|current_balance" src/features/dashboard/
```

**Step 2: Erstatt med SSoT (paper_accounts.current_balance)**

Alle steder skal bruke `accountBalance` (fra `getAccountBalance`).

**Step 3: Verifiser**

```bash
npx playwright test e2e/smoke/all-pages.spec.ts --project=chromium --grep "Dashboard"
# Expected: PASS — kun én balanse vises
```

**Step 4: Commit**

```bash
git add src/features/dashboard/
git commit -m "fix(dashboard): bruk samme datakilde for balanse overalt

FØR: Hero viste accountBalance, portefølje viste totalCapital.
ETTER: Alle bruker accountBalance (paper_accounts.current_balance)."
```

---

### Task 7: Kjør full verifisering

**Objective:** Verifiser at ALLE fikser fungerer.

**Step 1: Kjør alle tester**

```bash
npm run test
# Expected: 1724/1724 PASS

npm run check
# Expected: ✅ Siden live

npx playwright test e2e/smoke/all-pages.spec.ts --project=chromium
# Expected: 20/20 PASS

npx playwright test e2e/smoke/currency-contract.spec.ts
# Expected: PASS

npx playwright test e2e/smoke/i18n-keys.spec.ts
# Expected: PASS

npx playwright test e2e/smoke/pnl-accuracy.spec.ts
# Expected: PASS
```

**Step 2: Verifiser manuelt**

1. Logg inn på https://www.klarpakke.no/no/login med test-bruker
2. Sjekk dashboard — verifiser at P&L er realistisk (ikke -30%)
3. Sjekk portefølje — verifiser at balanse stemmer
4. Sjekk alle sider — verifiser ingen rå i18n-nøkler

**Step 3: Commit**

```bash
git add .
git commit -m "test(e2e): full verifisering av alle sider mot fakta"
```

---

## 🎯 Suksesskriterier

- ✅ ALLE sider laster uten krasj
- ✅ INGEN rå i18n-nøkler vises
- ✅ ALLE priser vises i NOK (korrekt formatert)
- ✅ P&L stemmer med DB (innenfor 1% margin)
- ✅ Balanse er korrekt (paper_accounts.current_balance = cash + posisjoner)
- ✅ KUN ÉN balanse vises (ikke to forskjellige)
- ✅ 1724/1724 unit-tester passerer
- ✅ 20/20 E2E-tester passerer
- ✅ Lighthouse-score > 75 performance, > 88 accessibility

---

## 🚨 Risikoer og åpne spørsmål

### Risiko 1: Balance-reparasjon kan påvirke live-brukere
**Mitigasjon:** Dry-run på test-bruker først, verifiser manuelt før full kjøring.

### Risiko 2: i18n-nøkler kan mangle på andre språk
**Mitigasjon:** Script verifiserer alle språk, kopierer fra no.json ved behov.

### Risiko 3: E2E-tester kan være flaky (nettverk, timing)
**Mitigasjon:** Bruk `waitForTimeout` og `waitForURL` eksplisitt, retry på failure.

### Åpent spørsmål: Skal gamle korrupte trades slettes?
**Anbefaling:** NEI — behold for historikk, men ekskluder fra P&L-beregning.

---

## 📚 Relaterte dokumenter

- `docs/CURRENCY-CONTRACT.md` — Valuta-kontrakt (NOK i DB, USDT kun internt)
- `docs/BALANCE-SSOT.md` — paper_accounts.current_balance som single source of truth
- `e2e/README.md` — E2E-test-guide

---

**Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?**

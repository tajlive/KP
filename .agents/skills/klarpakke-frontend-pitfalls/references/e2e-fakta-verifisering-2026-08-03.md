# E2E Fakta-Verifisering — Komplett Test-Suite (2026-08-03)

## Oversikt

Full E2E-test-suite for å verifisere at ALLE nettsider viser korrekte data. Opprettet etter «Sjekk alle nettsidene på samme måte mot fakta»-oppgave fra Tom.

## Test-filer

### 1. `e2e/smoke/all-pages.spec.ts` — Krasj-sjekk

Verifiserer at alle sider laster uten error. 20 tester, 3 skipped (auth-required).

**Kritiske sjekker:**
- Ingen `Application error` / `500` / `404 Not Found` / `Something went wrong`
- Offentlige sider: HTTP 200
- Auth-sider: HTTP 307 (redirect til login) — ikke 500

**Kjør:**
```bash
npx playwright test e2e/smoke/all-pages.spec.ts --project=chromium
```

### 2. `e2e/smoke/currency-contract.spec.ts` — Valuta-kontrakt

Verifiserer at alle priser vises i NOK (ikke USDT).

**Sjekker:**
- Dashboard: Ingen `62 000 USDT`, men `595 935,46 kr` (NOK-format)
- Portefølje: Balanse i `X kr`-format
- Ingen `USDT`-priser (unntatt i pair-navn som `BTC/USDT`)

**Kjør:**
```bash
npx playwright test e2e/smoke/currency-contract.spec.ts --project=chromium
```

### 3. `e2e/smoke/i18n-keys.spec.ts` — i18n-kompletthet

Verifiserer at INGEN sider viser rå i18n-nøkler (format: `namespace.section.key`).

**Sjekker:**
- `/`, `/trade`, `/dashboard`, `/dashboard/portfolio`, `/dashboard/historikk`, `/priser`, `/kurs`
- Pattern: `/\b(dashboard|trading|common|portfolio)\.[a-z]+\.[a-zA-Z]+\b/g`

**Kjør:**
```bash
npx playwright test e2e/smoke/i18n-keys.spec.ts --project=chromium
```

### 4. `e2e/smoke/pnl-accuracy.spec.ts` — P&L-korrekthet

Verifiserer at Dashboard P&L stemmer med Supabase DB (innenfor 1% margin).

**Sjekker:**
- Hero-P&L % (fra `Siste endring`-pillen)
- `Total avkastning`-kortet (NOK-beløp)
- DB-verdi via `get_dashboard_metrics` RPC

**Kjør:**
```bash
npx playwright test e2e/smoke/pnl-accuracy.spec.ts --project=chromium
```

### 5. `e2e/smoke/lighthouse.spec.ts` — Performance/A11y/SEO

Kjører Lighthouse-audit per side.

**Terskler:**
- Performance: ≥75
- Accessibility: ≥88
- Best Practices: ≥85
- SEO: ≥90

**Kjør:**
```bash
npx playwright test e2e/smoke/lighthouse.spec.ts --project=chromium
```

## Allure-rapportering

Generer visuell test-rapport:

```bash
# Kjør tester med Allure-reporter
npx playwright test --reporter=allure-playwright

# Generer HTML-rapport
npm run allure:generate

# Åpne rapport
npm run allure:serve
```

## Pre-commit hook

Kjører E2E smoke-test ved kritiske UI-endringer:

```bash
# .husky/pre-commit
if git diff --cached --name-only | grep -qE "src/features/(dashboard|trading)/"; then
  echo "🔍 Kjører E2E smoke-test ved UI-endring..."
  npx playwright test e2e/smoke/all-pages.spec.ts --project=chromium --reporter=list
fi
```

## Kritiske feller (verifisert 2026-08-03)

### 1. Auth-brukere i URL = sikkerhetsissue

**FEIL:**
```typescript
await page.goto(`/login?email=${email}&password=${password}`);
```

**RIKTIG:**
```typescript
await page.goto("/login");
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await page.click('button[type="submit"]');
```

### 2. Supabase RPC fra Playwright

Service-role key må lastes fra `.env.local` eksplisitt:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 3. U+00A0 (non-breaking space) i NOK-format

Norsk locale bruker U+00A0 som tusen-separator. Regex må matche `\s`:

```typescript
// FEIL:
/\d{1,3}( \d{3})+,\d{2} kr/

// RIKTIG:
/\d{1,3}(\s\d{3})+,\d{2}\s?kr/
```

### 4. Flaky login

`waitForURL(/dashboard/)` kan time out. Bruk retry:

```typescript
await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(async () => {
  await page.reload();
  return page.waitForURL(/dashboard/, { timeout: 15000 });
});
```

## Test-bruker

- **E-post:** `test+tricky+123@klarpakke.no`
- **Passord:** `TestTest123!`
- **User ID:** `782eb85b-4c6b-47e8-9d7f-ee6c471a3e1e`

## Kjør full suite

```bash
npx playwright test e2e/smoke/all-pages.spec.ts e2e/smoke/currency-contract.spec.ts e2e/smoke/i18n-keys.spec.ts e2e/smoke/pnl-accuracy.spec.ts --project=chromium
```

## Commits (2026-08-03)

- `155f64e4f` — test(e2e): verifiser at alle priser vises i NOK (valuta-kontrakt)
- `8d67af0` — test(e2e): verifiser at ingen sider viser rå i18n-nøkler
- `24de77c75` — test(e2e): verifiser at P&L stemmer med DB
- `640ae6518` — fix(dashboard): vis korrekt fortegn for negativ P&L
- `4338120cd` — fix(dashboard): bruk samme datakilde for balanse overalt
- `87a10352d` — feat(dashboard): vis [🔧 beta-justert] badge ved balance-korreksjon

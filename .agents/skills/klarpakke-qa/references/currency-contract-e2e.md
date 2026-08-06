# Valuta-kontrakt E2E — oppskrift (currency-contract.spec.ts)

Verifiserer at ALLE priser vises i NOK, aldri USDT. Regresjonsvakt: `e2e/smoke/currency-contract.spec.ts` (2 tester, PASS mot prod 2026-08-03).

## Kjernemønster

```typescript
import { test, expect } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";

const TEST_EMAIL = "test+tricky+123@klarpakke.no";
const TEST_PASSWORD = "TestTest123!";

// KRITISK: global storageState (.auth/user.json) er utløpt sesjon for annen bruker.
// Overstyr med tom state + UI-login som ønsket testbruker.
test.use({ storageState: { cookies: [], origins: [] } });

// NOK: "595 935,46 kr" / "64 221,00 kr" / "100 000 kr" — \s dekker U+00A0/U+202F
const NOK_PRICE_PATTERN = /\d{1,3}(?:\s\d{3})+(?:,\d{2})?\s?kr/;
// USDT-pris (kontraktbrudd): "62 000 USDT"
const USDT_PRICE_PATTERN = /\d{1,3}(?:[\s.]\d{3})+\s?USDT/;
```

## Pitfalls (alle møtt live 2026-08-03)

1. **U+00A0-separator:** `toLocaleString("nb-NO")` → `"64 024,69 kr"` der «mellomrommene» er U+00A0 (`a0`), inkludert tegnet FØR «kr». `[ \u00a0]` + ` ?`-quantifier feiler på siste separator. Bruk `\s` overalt i NOK-regex-er. Verifiser med `[...s].map(c => c.codePointAt(0).toString(16))`.
2. **Assert format, ikke snapshot-verdi:** «594 633 kr» (planens eksempel) var allerede 595 935,46 kr ved kjøring. Kun negative asserts på konkrete verdier («62 000 USDT» skal IKKE vises).
3. **Synlig tekst = `innerText()`, ikke `textContent()`:** RSC-payloads inneholder «Minste handelsbeløp er 10 USDT.» — `textContent()` gir false positive. Bruk `page.locator("body").innerText()`.
4. **«USDT» i par-symboler er OK:** POL/USDT, DOGE/USDT er par-navn. Assert på pris-mønster (`\d+ USDT`), ikke substring.
5. **Ticker-rad inneholder change-% etter prisen:** «Bitcoin 595 935,46 kr ±0.7%» — ikke ankre `kr$` på rad-slutt. Finn symbolet med `page.getByText("Bitcoin", { exact: true })`, gå til `locator("..")`, assert `toContainText(/[\d\s.,]+\s?kr/)`.
6. **Vent på innhold med `toContainText(pattern, { timeout })`, ikke faste sleeps:** dashboard/portefølje laster asynkront; `Laster portefølje...` → verdi.
7. **Portefølje-balanse-regex:** `Balanse[\s\S]{0,80}?\d{1,3}(?:\s\d{3})+(?:,\d{2})?\s?kr` — «Balanse»-label etterfulgt av NOK-verdi. Posisjonsverdier: `\d{1,3}(?:\s\d{3})+,\d{2}\s?kr`.

## Kjøring

```bash
npx playwright test e2e/smoke/currency-contract.spec.ts --project=chromium
# Forventet: PASS. FAIL = USDT-priser vises → fiks i koden, ikke i testen.
```

## Tilknyttet

- i18n-keys-regresjonsvakt: `e2e/smoke/i18n-keys.spec.ts` (samme innerText-regel)
- Enhetskart NOK/USDT: `usdt-nok-format-convention.md`

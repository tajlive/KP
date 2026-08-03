import { test, expect } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";

/**
 * Valuta-kontrakt: ALLE priser skal vises i NOK, aldri USDT.
 *
 * Kontekst: Etter valuta-buggen (2026-08-02 → 2026-08-03) må vi verifisere at
 * dashboards/priser aldri viser USDT-denominerte beløp. Trading-par som
 * "POL/USDT" er symboler og OK — men en PRIS skal aldri ha "USDT"-suffiks.
 *
 * NB: Prisene i tickeren er levende markedsdata ("Bitcoin 595 935,46 kr") —
 * vi assertar formatet (NNN NNN,NN kr), ikke en fastsatt snapshot-verdi
 * (planens "594 633 kr" var gyldig kun ved skrivetidspunktet).
 */

const TEST_EMAIL = "test+tricky+123@klarpakke.no";
const TEST_PASSWORD = "TestTest123!";

// Global storageState (.auth/user.json) er en utløpt sesjon for en annen bruker —
// valuta-kontrakt-testen logger inn som testbrukeren med fersk kontekst.
test.use({ storageState: { cookies: [], origins: [] } });

// NOK-pris: "595 935,46 kr", "64 221,00 kr" eller "100 000 kr".
// \s dekker BÅDE vanlig mellomrom og U+00A0/U+202F (nb-NO bruker non-breaking space).
const NOK_PRICE_PATTERN = /\d{1,3}(?:\s\d{3})+(?:,\d{2})?\s?kr/;
// USDT-pris (kontraktbrudd): "62 000 USDT", "60000 USDT" osv.
const USDT_PRICE_PATTERN = /\d{1,3}(?:[\s.]\d{3})+\s?USDT/;

test.describe("Valuta-kontrakt — alle priser i NOK", () => {
  test("Dashboard viser NOK-priser (ikke USDT)", async ({ page }) => {
    await loginWithCredentials(page, TEST_EMAIL, TEST_PASSWORD);

    // Vent til dashboard er lastet med priser — hero-balansen ("100 000 kr")
    // og tickeren ("Bitcoin 595 935,46 kr") må ha rendret.
    await expect(page.locator("body")).toContainText(NOK_PRICE_PATTERN, {
      timeout: 20_000,
    });

    // innerText = kun synlig tekst (script/RSC-payloads blokkeres ut)
    const bodyText = await page.locator("body").innerText();

    // 🔴 Kontraktbrudd hvis USDT-priser vises (planens eksempel: "62 000 USDT")
    expect(
      bodyText,
      "Dashboard må IKKE vise '62 000 USDT'-priser",
    ).not.toContain("62 000 USDT");
    expect(
      bodyText,
      "Dashboard må IKKE vise noen priser med USDT-suffiks",
    ).not.toMatch(USDT_PRICE_PATTERN);

    // ✅ NOK-priser vises — f.eks. "595 935,46 kr" (BTC-ticker) / "100 000 kr" (balanse)
    expect(
      bodyText,
      "Dashboard må vise priser i NOK-format (NNN NNN,NN kr)",
    ).toMatch(NOK_PRICE_PATTERN);

    // Ticker: Bitcoin-prisen skal ha "kr"-suffiks, aldri "USDT".
    const bitcoinSymbol = page.getByText("Bitcoin", { exact: true }).first();
    await expect(bitcoinSymbol).toBeVisible({ timeout: 20_000 });
    const bitcoinRow = bitcoinSymbol.locator("..");
    // Rada inneholder "Bitcoin 595 935,46 kr ±0.7%" — prisen må ha "kr"-suffiks
    await expect(bitcoinRow).toContainText(/[\d\s.,]+\s?kr/);
    await expect(bitcoinRow).not.toContainText("USDT");
  });

  test("Portefølje viser NOK-balanse (X kr)", async ({ page }) => {
    await loginWithCredentials(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto("/no/dashboard/portfolio");

    // Vent til balansen er lastet ("Balanse 64 221,00 kr")
    await expect(page.locator("body")).toContainText(NOK_PRICE_PATTERN, {
      timeout: 20_000,
    });

    const bodyText = await page.locator("body").innerText();

    // ✅ Balanse-seksjonen viser verdi i NOK-format ("X kr")
    expect(
      bodyText,
      "Portefølje må vise balansen i NOK-format (X kr)",
    ).toMatch(/Balanse[\s\S]{0,80}?\d{1,3}(?:\s\d{3})+(?:,\d{2})?\s?kr/);

    // 🔴 Ingen USDT-priser i porteføljen
    expect(
      bodyText,
      "Portefølje må IKKE vise priser med USDT-suffiks",
    ).not.toMatch(USDT_PRICE_PATTERN);

    // Posisjonsverdier vises også i NOK (f.eks. "8 858,63 kr")
    expect(
      bodyText,
      "Posisjonsverdier må vises i NOK-format",
    ).toMatch(/\d{1,3}(?:\s\d{3})+,\d{2}\s?kr/);
  });
});

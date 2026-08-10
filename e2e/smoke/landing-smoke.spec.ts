import { test, expect } from "@playwright/test";

test.describe("Landing smoke — post-deploy verifisering", () => {
  test("ingen MISSING_MESSAGE eller fantom-feil i console", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("MISSING_MESSAGE") ||
        text.includes("Hydration failed") ||
        text.includes("did not match")
      ) {
        errors.push(`[${msg.type()}] ${text.slice(0, 200)}`);
      }
    });

    page.on("pageerror", (err) => {
      errors.push(`[pageerror] ${err.message.slice(0, 200)}`);
    });

    await page.goto("/no", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Scroll for å trigge alle lazy-komponenter
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, 700));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(2000);

    // Sjekk at literal i18n-nøkler ikke lekker ut
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("footer.links.cookies");
    expect(bodyText).not.toContain("MISSING_MESSAGE");

    expect(errors, `Console errors: ${errors.join("; ")}`).toHaveLength(0);
  });

  test("hero rendrer med innhold", async ({ page }) => {
    await page.goto("/no", { waitUntil: "networkidle" });
    const hero = page.locator("h1");
    await expect(hero).toBeVisible();
    await expect(hero).not.toBeEmpty();
  });

  test("below-fold komponenter finnes i DOM etter scroll", async ({ page }) => {
    await page.goto("/no", { waitUntil: "networkidle" });

    // Scroll til bunn
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    // Sjekk at nøkkelseksjoner har innhold (Variant C «Beviset», 2026-08-10)
    const checks = [
      { name: "Hero", text: "Klarpakke" },
      { name: "CTA", text: "Start gratis" },
      { name: "Løfte-seksjon", text: "Dette lover vi" },
      { name: "FAQ", text: "Spørsmål og svar" },
      { name: "Footer", selector: "footer" },
    ];

    for (const c of checks) {
      if (c.selector) {
        const el = page.locator(c.selector).first();
        await expect(el, `${c.name} skal finnes`).toBeVisible();
      } else if (c.text) {
        const el = page.getByText(c.text, { exact: false }).first();
        await expect(el, `${c.name} skal finnes`).toBeVisible();
      }
    }
  });
});

import { test, expect, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Regresjon: usynlige felt/knapper (dark/mobile), wizard-CTA.
 * Krever gyldig .auth/user.json fra setup + E2E-credentials i CI.
 */
const AUTO_TRADE_NO = "/no/dashboard/auto-trade";

function isLoginUrl(url: string) {
  return url.includes("innlogging") || url.includes("/login");
}

test.describe("Critical: dashboard UX @critical", () => {
  test("auto-trade (desktop): ingen kritiske axe-brudd", async ({ page }) => {
    await page.goto(AUTO_TRADE_NO, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    test.skip(
      isLoginUrl(page.url()),
      "Krever innlogget E2E-bruker (E2E_USER_EMAIL / secrets)",
    );
    await page.waitForLoadState("networkidle").catch(() => {});

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(
      critical,
      critical.map((c) => `${c.id}: ${c.help}`).join("\n"),
    ).toHaveLength(0);
  });
});

test.describe("Critical: auto-trade wizard mobil @critical", () => {
  test("steg 2: beløp-felt synlig; steg 3: Start bot synlig", async ({
    page,
  }) => {
    const mob = devices["iPhone 13"];
    await page.setViewportSize(mob.viewport);
    await page.goto(AUTO_TRADE_NO, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    test.skip(
      isLoginUrl(page.url()),
      "Krever innlogget E2E-bruker (E2E_USER_EMAIL / secrets)",
    );

    await page.getByTestId("bot-wizard-next").click();
    const capital = page.locator("#capital-input");
    await expect(capital).toBeVisible();
    await expect(capital).toBeEditable();

    await page.getByTestId("bot-wizard-next").click();
    const start = page.getByTestId("bot-wizard-start-inline");
    await expect(start).toBeVisible();
    await expect(start).toBeEnabled();
  });
});

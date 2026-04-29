import { test, expect } from "@playwright/test";

/**
 * Critical: DashboardPro Enterprise 2026
 * Tester adaptive dashboard med nye WOW-komponenter.
 * Krever gyldig .auth/user.json fra auth.setup.ts.
 */

const DASHBOARD_NO = "/no/dashboard";

function isLoginUrl(url: string) {
  return url.includes("innlogging") || url.includes("/login");
}

/** Klikk "Se dashbordet uten å sette opp" hvis onboarding-dialog vises */
async function skipOnboardingIfPresent(page: any): Promise<void> {
  const skipButton = page.getByRole("button", {
    name: /Se dashbordet uten å sette opp/i,
  });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await expect(skipButton).not.toBeVisible({ timeout: 5000 });
  }
}

test.describe("Critical: DashboardPro @critical", () => {
  test("dashboard laster med nøkkelkomponenter", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000); // Vent på at komponenter hydrate

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget E2E-bruker (E2E_USER_EMAIL / secrets)");
      return;
    }

    await skipOnboardingIfPresent(page);

    // SimplifiedHero: balanse eller modus-label
    const heroText = page.getByText(/Øvingsmodus|Live-modus|Din portefølje/).first();
    const heroVisible = await heroText.isVisible().catch(() => false);
    expect(heroVisible).toBe(true);

    // SmartActions: minst én CTA er synlig
    const smartActions = page.locator("a[href*='dashboard']").first();
    const actionsVisible = await smartActions.isVisible().catch(() => false);
    expect(actionsVisible).toBe(true);
  });

  test("AutoTradingConfigCard er synlig og interaktiv", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    const card = page.locator("text=Auto-Trading").first();
    const cardVisible = await card.isVisible().catch(() => false);
    expect(cardVisible).toBe(true);

    // Toggle switch finnes
    const toggle = page.locator('button[role="switch"]').first();
    const toggleVisible = await toggle.isVisible().catch(() => false);
    expect(toggleVisible).toBe(true);

    // Handelsmodus-knapper
    const paperBtn = page.getByRole("button", { name: /Lekepenger/i }).first();
    const liveBtn = page.getByRole("button", { name: /Live Trading/i }).first();
    expect(await paperBtn.isVisible().catch(() => false)).toBe(true);
    expect(await liveBtn.isVisible().catch(() => false)).toBe(true);
  });

  test("GetStartedCard vises for nye brukere", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    // GetStartedCard kan være tilstede (avhengig av bruker-state)
    const getStarted = page.locator("text=Kom i gang").first();
    const isVisible = await getStarted.isVisible().catch(() => false);

    if (isVisible) {
      await expect(getStarted).toBeVisible();
      // Sjekk at dismiss-knapp finnes
      const dismissBtn = page.getByRole("button", { name: /Lukk|Dismiss/i }).first();
      expect(await dismissBtn.isVisible().catch(() => false)).toBe(true);
    } else {
      test.info().annotations.push({
        type: "skip-reason",
        description: "GetStartedCard ikke synlig (bruker kan ha fullført onboarding)",
      });
    }
  });

  test("AdvancedAnalyticsSection kan ekspanderes", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    const analyticsButton = page.getByRole("button", { name: /Avansert analyse|Advanced Analytics/i }).first();
    const exists = await analyticsButton.isVisible().catch(() => false);

    if (exists) {
      await analyticsButton.click();
      // Etter ekspandering skal Risk Metrics eller charts være synlige
      const riskMetrics = page.getByText(/Sortino|Calmar|VaR|Risk Metrics/i).first();
      expect(await riskMetrics.isVisible().catch(() => false)).toBe(true);
    } else {
      test.info().annotations.push({
        type: "skip-reason",
        description: "AdvancedAnalyticsSection ikke synlig (bruker-state)",
      });
    }
  });

  test("AIInsightCard finnes for aktive tradere", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    const aiCard = page.locator("text=AI-innsikt").or(page.locator("text=AI Insight")).first();
    const isVisible = await aiCard.isVisible().catch(() => false);

    if (isVisible) {
      await expect(aiCard).toBeVisible();
      // Kan ekspanderes
      await aiCard.click();
      const tabs = page.getByText(/Ytelse|Performance|Risk|Strategi|Strategy/i).first();
      expect(await tabs.isVisible().catch(() => false)).toBe(true);
    } else {
      test.info().annotations.push({
        type: "skip-reason",
        description: "AIInsightCard ikke synlig (bruker-state eller feature flag)",
      });
    }
  });

  test("NLQ Chat-knapp finnes for PowerUser", async ({ page }) => {
    await page.goto(DASHBOARD_NO, { timeout: 60000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});

    if (isLoginUrl(page.url())) {
      test.skip(true, "Krever innlogget bruker");
      return;
    }

    await skipOnboardingIfPresent(page);

    // NLQChat floating button
    const chatButton = page.locator("button[aria-label='Åpne chat'], button[aria-label='Open chat']").first();
    const isVisible = await chatButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      // Chat-panel skal åpne seg
      const panel = page.getByText(/Trading Assistent|Trading Assistant/i).first();
      expect(await panel.isVisible().catch(() => false)).toBe(true);
    } else {
      test.info().annotations.push({
        type: "skip-reason",
        description: "NLQChat ikke synlig (bruker-state)",
      });
    }
  });
});

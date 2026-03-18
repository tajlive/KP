import { test, expect } from "@playwright/test";

/**
 * Landing Page Conversion Tests (KLA-110)
 */

test.describe("Landing Page Conversion @critical", () => {
  test("Hero vises med norsk tekst på /no", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page
        .getByRole("link", { name: /Kom i gang gratis|Start gratis/i })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: /Se hvordan det fungerer|Se hva du lærer/i })
        .first(),
    ).toBeVisible();
  });

  test("Primær CTA klikk → lander på /no/signup", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const primaryCta = page
      .getByRole("link", { name: /Kom i gang gratis|Start gratis/i })
      .first();
    await expect(primaryCta).toBeVisible({ timeout: 15000 });
    await primaryCta.click();

    await expect(page).toHaveURL(/.*signup.*/, { timeout: 15000 });
    await expect(
      page.getByText(/Opprett konto|Registrer deg/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Kalkulator slider interaksjon → CTA dukker opp", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    // Scroll to calculator section
    const slider = page.locator('input[type="range"]').first();
    await slider.scrollIntoViewIfNeeded();
    await expect(slider).toBeVisible({ timeout: 15000 });

    await slider.fill("500");

    const ctaButton = page
      .getByRole("link", {
        name: /Start gratis|Lær hvordan|Kom i gang|Learn how/i,
      })
      .first();
    await expect(ctaButton).toBeVisible({ timeout: 10000 });

    await ctaButton.click();
    await expect(page).toHaveURL(/.*signup.*/, { timeout: 15000 });
  });

  test("Nav-lenker fungerer (Kurs, Paper Trading, Priser)", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const coursesLink = page.getByRole("link", { name: /^Kurs$/i }).first();
    await expect(coursesLink).toBeVisible({ timeout: 10000 });

    const paperTradingLink = page
      .getByRole("link", { name: /Paper Trading|Papirhandel/i })
      .first();
    await expect(paperTradingLink).toBeVisible();

    const pricingLink = page.getByRole("link", { name: /^Priser$/i }).first();
    await expect(pricingLink).toBeVisible();

    await coursesLink.click();
    await expect(page).toHaveURL(/.*kurs.*/, { timeout: 15000 });
  });

  test("/no/innlogging → skjema vises, kan fylle inn", async ({ page }) => {
    await page.goto("/no/innlogging", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Logg inn").first()).toBeVisible({
      timeout: 10000,
    });

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    await emailInput.fill("test@example.com");
    await passwordInput.fill("testpassword123");

    await expect(emailInput).toHaveValue("test@example.com");
    await expect(passwordInput).toHaveValue("testpassword123");
  });

  test("/no/signup → skjema vises", async ({ page }) => {
    await page.goto("/no/signup", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByText(/Opprett konto|Registrer deg/i).first(),
    ).toBeVisible({ timeout: 10000 });

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test("Final CTA «Start gratis nå» er synlig og fører til paper-trading", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const finalCta = page.getByRole("button", {
      name: /Start gratis nå|Start for free now/i,
    });
    await finalCta.scrollIntoViewIfNeeded();
    await expect(finalCta).toBeVisible({ timeout: 15000 });
    await finalCta.click();

    await expect(page).toHaveURL(/.*paper-trading.*/, { timeout: 15000 });
  });

  test("Testimonials CTA «Start med lekepenger» fører til paper-trading", async ({
    page,
  }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const testimonialCta = page.getByRole("link", {
      name: /Start med lekepenger|Start with paper trading/i,
    });
    await testimonialCta.scrollIntoViewIfNeeded();
    await expect(testimonialCta).toBeVisible({ timeout: 15000 });
    await testimonialCta.click();

    await expect(page).toHaveURL(/.*paper-trading.*/, { timeout: 15000 });
  });
});

test.describe("Landing Page Mobile @mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("Mobil 375px → hero synlig, CTA klikkbar", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const heroHeading = page.getByRole("heading", { level: 1 });
    await expect(heroHeading).toBeVisible({ timeout: 15000 });

    const primaryCta = page
      .getByRole("link", { name: /Kom i gang gratis|Start gratis/i })
      .first();
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toBeEnabled();

    const secondaryCta = page
      .getByRole("link", { name: /Se hvordan det fungerer|Se hva du lærer/i })
      .first();
    await expect(secondaryCta).toBeVisible();
  });

  test("Mobil: hamburger-meny fungerer", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const menuButton = page
      .locator(
        'button[aria-label*="meny"], button[aria-label*="menu"], button[aria-label*="Meny"]',
      )
      .first();

    if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuButton.click();
      await expect(
        page.getByRole("link", { name: /Kurs|Courses/i }).first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("Mobil: kalkulator slider fungerer på touch", async ({ page }) => {
    await page.goto("/no", { waitUntil: "domcontentloaded" });

    const slider = page.locator('input[type="range"]').first();
    await slider.scrollIntoViewIfNeeded();
    await expect(slider).toBeVisible({ timeout: 15000 });

    await slider.fill("300");
    await expect(slider).toHaveValue("300");
  });
});

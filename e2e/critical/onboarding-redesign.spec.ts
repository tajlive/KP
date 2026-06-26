import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth";
import {
  getUserIdByEmail,
  resetOnboardingState,
} from "../helpers/onboarding";
import { getPrimaryTestUser } from "../fixtures/test-users";

/**
 * Critical: redesigned 5-step onboarding flow
 *
 * Walks through:
 *  1. AI mapping (goal + time horizon)
 *  2. Experience level selection
 *  3. Paper trading setup
 *  4. First guided paper trade (BTC)
 *  5. Completion → dashboard
 *
 * The test user's onboarding state is reset both before and after the test so
 * the flow can be repeated safely.
 */

test.describe("Critical: redesigned onboarding flow @critical @onboarding", () => {
  test.describe.configure({ mode: "serial" });

  const testUser = getPrimaryTestUser();

  test.beforeEach(async ({ page }) => {
    const userId = await getUserIdByEmail(testUser.email);
    if (!userId) {
      throw new Error(`Test user ${testUser.email} not found in Supabase auth`);
    }
    await resetOnboardingState(userId);

    // Ensure the browser starts without stale onboarding answers.
    await page.evaluate(() => {
      localStorage.removeItem("kp-onboarding-answers");
    });
  });

  test.afterEach(async () => {
    const userId = await getUserIdByEmail(testUser.email);
    if (userId) {
      await resetOnboardingState(userId);
    }
  });

  test("walks through the 5-step onboarding flow and places the first paper trade", async ({
    page,
    browserName,
  }) => {
    // Run in one browser to avoid the same test user being reset concurrently.
    test.skip(
      browserName !== "chromium",
      "Onboarding reset uses a single shared test user; run in chromium only",
    );

    await loginAsTestUser(page, "primary");
    await page.goto("/no/onboarding", { waitUntil: "networkidle" });

    // ------------------------------------------------------------------
    // Step 1: AI mapping
    // ------------------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: /La meg bli kjent med deg/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /^Sparing$/ }).click();
    await page.getByRole("button", { name: /^Over 3 år$/ }).click();
    await page.getByRole("button", { name: /^Fortsett$/ }).click();

    // ------------------------------------------------------------------
    // Step 2: experience level
    // ------------------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: /Velg ditt nivå/i }),
    ).toBeVisible();
    await expect(page.getByText(/Anbefalt for deg/i)).toBeVisible();

    await page.getByRole("radio", { name: /Nybegynner/i }).click();
    await page.getByRole("button", { name: /^Fortsett$/ }).click();

    // ------------------------------------------------------------------
    // Step 3: paper trading setup
    // ------------------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: /Øv med lekepenger/i }),
    ).toBeVisible();
    await expect(page.getByText(/100\s*000\s*kr/)).toBeVisible();

    await page.getByRole("button", { name: /Start første trade/i }).click();

    // ------------------------------------------------------------------
    // Step 4: first guided paper trade
    // ------------------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: /Din første paper trade/i }),
    ).toBeVisible();

    // Wait for the BTC price to load before selecting an amount.
    await expect(page.locator("text=/\\$[0-9]/").first()).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /5\s*000\s*kr/i }).click();
    await page.getByRole("button", { name: /Kjøp BTC/i }).click();

    await expect(
      page.getByRole("heading", { name: /Gratulerer/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Fullfør onboarding/i }).click();

    // ------------------------------------------------------------------
    // Step 5: completion
    // ------------------------------------------------------------------
    await expect(
      page.getByRole("heading", { name: /Du er klar/i }),
    ).toBeVisible();
    await expect(page).toHaveURL(/step5-complete/);

    await page.getByRole("button", { name: /Gå til Dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });
});

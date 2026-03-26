/**
 * @critical @papertrading
 * Test: Paper Trading E2E - start/pause/resume/stopp sesjon
 */

import { test, expect } from "@playwright/test";

test.describe("Paper Trading E2E @critical", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // No auth state for isolation

  test.beforeEach(async ({ page, baseURL }) => {
    // Login before each test if credentials available
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      const base =
        baseURL || process.env.BASE_URL || "https://www.klarpakke.no";
      await page.goto(`${base}/no/innlogging`);
      await page.getByLabel(/e-post|email/i).fill(process.env.TEST_USER_EMAIL);
      await page
        .getByLabel(/passord|password/i)
        .fill(process.env.TEST_USER_PASSWORD);
      await page.getByRole("button", { name: /logg inn|sign in/i }).click();
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    }
  });

  test("user can create, pause, resume and stop paper trading session", async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || process.env.BASE_URL || "https://www.klarpakke.no";
    let sessionId: string | null = null;

    // Navigate to paper trading
    await test.step("Navigate to paper trading", async () => {
      await page.goto(`${base}/no/dashboard/trade`);
      await page.waitForLoadState("networkidle");

      // Verify page loaded
      await expect(
        page.getByText(/paper trading|saldo|start ny/i).first(),
      ).toBeVisible();
    });

    // Click "Start new session"
    await test.step("Open new session modal", async () => {
      const newSessionBtn = page.getByRole("button", {
        name: /start ny|ny sesjon|start session/i,
      });
      await expect(newSessionBtn).toBeVisible();
      await newSessionBtn.click();

      // Modal should open
      await expect(
        page.getByText(/trading par|trading pair|startkapital/i).first(),
      ).toBeVisible();
    });

    // Configure and create session
    await test.step("Configure new session", async () => {
      // Select BTC/USDT
      const pairSelect = page.locator('select, [role="combobox"]').first();
      if (await pairSelect.isVisible().catch(() => false)) {
        await pairSelect.selectOption({ label: "BTC/USDT" });
      }

      // Set start capital (default should be 10000)
      const capitalInput = page.locator('input[type="number"]').first();
      if (await capitalInput.isVisible().catch(() => false)) {
        await capitalInput.fill("10000");
      }

      // Submit
      await page.getByRole("button", { name: /start|oppret|create/i }).click();
    });

    // Verify redirect to session detail
    await test.step("Verify session created", async () => {
      // Wait for navigation to session detail
      await page.waitForURL(/\/dashboard\/trade\/[0-9a-f-]{36}/, {
        timeout: 15000,
      });

      const url = page.url();
      const match = url.match(/\/dashboard\/trade\/([0-9a-f-]{36})/);
      sessionId = match ? match[1] : null;
      expect(sessionId).toBeTruthy();

      // Verify session detail page
      await expect(
        page.getByText(/BTC|USDT|aktiv|active/i).first(),
      ).toBeVisible();
    });

    // Verify capital display
    await test.step("Verify capital display", async () => {
      await expect(page.getByText(/10\s?000|10\.?000/).first()).toBeVisible();
      await expect(page.getByText(/kr|nok/i).first()).toBeVisible();
    });

    // Pause session
    await test.step("Pause session", async () => {
      const pauseBtn = page.getByRole("button", { name: /pause|pause bot/i });
      await expect(pauseBtn).toBeVisible();
      await pauseBtn.click();

      // Wait for status update
      await page.waitForTimeout(1000);

      // Verify status changed to paused
      await expect(page.getByText(/pauset|paused/i).first()).toBeVisible();
    });

    // Resume session
    await test.step("Resume session", async () => {
      const resumeBtn = page
        .getByRole("button", { name: /fortsett|resume|start/i })
        .first();
      await expect(resumeBtn).toBeVisible();
      await resumeBtn.click();

      // Wait for status update
      await page.waitForTimeout(1000);

      // Verify status changed to active
      await expect(page.getByText(/aktiv|active/i).first()).toBeVisible();
    });

    // Stop session
    await test.step("Stop session", async () => {
      const stopBtn = page.getByRole("button", { name: /stopp|stop/i });
      await expect(stopBtn).toBeVisible();
      await stopBtn.click();

      // Wait for redirect
      await page.waitForURL(/\/dashboard\/trade\/?$/, { timeout: 10000 });
    });

    // Verify session in list
    await test.step("Verify stopped session in list", async () => {
      await expect(page).toHaveURL(/\/dashboard\/trade/);

      // Should see the stopped session
      await expect(
        page.getByText(/stoppet|stopped|BTC\/USDT/i).first(),
      ).toBeVisible();
    });

    console.log(`✅ Paper trading test completed, session: ${sessionId}`);
  });

  test("session detail shows correct initial values", async ({
    page,
    baseURL,
  }) => {
    const base = baseURL || process.env.BASE_URL || "https://www.klarpakke.no";

    await page.goto(`${base}/no/dashboard/trade`);
    await page.waitForLoadState("networkidle");

    // Create quick session
    await page.getByRole("button", { name: /start ny|ny sesjon/i }).click();
    await page.waitForTimeout(500);

    // Submit with defaults
    await page.getByRole("button", { name: /start|oppret/i }).click();
    await page.waitForURL(/\/paper-trading\/[0-9a-f-]{36}/, { timeout: 15000 });

    // Verify initial stats
    await test.step("Verify initial stats", async () => {
      // Win rate should be 0%
      await expect(page.getByText(/0\s?%/).first()).toBeVisible();

      // Trades count should be 0
      await expect(
        page.getByText(/0\s*\/\s*0|ingen trades/i).first(),
      ).toBeVisible();

      // P&L should be 0 or starting capital
      const pnlText = await page
        .getByText(/0\s?kr|\+?0\.0\s?%/i)
        .first()
        .textContent();
      expect(pnlText).toMatch(/0|10\s?000/);
    });
  });
});

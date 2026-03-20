import { test, expect } from "@playwright/test";

/**
 * Smoke tests - Critical health checks
 * These tests must pass for any deploy to proceed
 * Fast, reliable, no auth required
 */

test.describe("Smoke: Health Checks @smoke", () => {
  test("health endpoint returns 200", async ({ request }) => {
    // Retry logic for dev server cold start
    let response;
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        response = await request.get("/api/health", { timeout: 30000 });
        if (response.status() === 200) break;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!response) throw lastError;
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test("homepage loads without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Set Norwegian locale to avoid redirect (or use explicit /en)
    // This ensures consistent test behavior regardless of browser locale
    await page
      .goto("/no", { waitUntil: "domcontentloaded" })
      .catch(async () => {
        // Fallback: go to root and accept any locale redirect
        await page.goto("/", { waitUntil: "domcontentloaded" });
      });

    // Page should load on klarpakke domain with or without locale prefix
    const url = page.url();
    expect(url).toMatch(/klarpakke\.no(\/(no|en|th|zh)?)?|localhost/);

    // No critical console errors
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("Source map") &&
        !e.includes("Manifest") &&
        !e.includes("analytics") &&
        // Ignore blocked third-party analytics scripts in strict CSP environments
        !e.includes("https://plausible.io/js/script.js") &&
        !e.includes("https://static.cloudflareinsights.com/beacon.min.js") &&
        // Ignore Playwright dev-server WebSocket CSP warnings
        !e.includes("ws://127.0.0.1") &&
        !e.includes(
          "connect-src 'self' https://vuxbjlykgmzskxbclquf.supabase.co wss://vuxbjlykgmzskxbclquf.supabase.co https://api.binance.com wss://stream.binance.com:9443 https://vercel.live https://o4509555622608896.ingest.de.sentry.io",
        ),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("login page is accessible", async ({ page }) => {
    // Eksplisitt locale + lang timeout: unngår flakiness ved kald dev-server og parallel workers
    await page.goto("/no/innlogging", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page.getByTestId("login-page")).toBeVisible({
      timeout: 25_000,
    });
  });

  test("leaderboard page loads", async ({ page }) => {
    await page.goto("/leaderboard", { waitUntil: "domcontentloaded" });

    // Check for leaderboard page with data-testid
    const leaderboardPage = page.locator('[data-testid="leaderboard-page"]');
    const isVisible = await leaderboardPage
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      // Verify table structure
      const table = page.locator('[data-testid="leaderboard-table"]');
      await expect(table).toBeVisible();
      console.log("✅ Leaderboard loaded with data-testid");
    } else {
      // May be redirected to login if protected
      const url = page.url();
      expect(url).toMatch(/leaderboard|innlogging|login/);
      console.log("⚠️ Leaderboard redirected to:", url);
    }
  });

  test("static assets are served", async ({ request }) => {
    // Check that main JS and CSS bundles exist
    const response = await request.get("/");
    const html = await response.text();

    // Should have Next.js scripts
    expect(html).toMatch(/_next\/static/);

    // Should not have 500 error
    expect(response.status()).toBe(200);
  });
});

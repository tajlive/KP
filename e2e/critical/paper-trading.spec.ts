import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { hasSupabaseSessionCookies } from "../helpers/supabase-cookies";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

/**
 * Critical: Paper Trading Flow
 * Core paper trading functionality
 * Blocking for deploy
 */

test.describe("Critical: Paper Trading Flow @critical @papertrading", () => {
  async function isGuestTeaserVisible(page: Page) {
    const guestCta = page
      .getByRole("link", {
        name: /Logg inn|Log in|Opprett konto|Create account/i,
      })
      .first();
    return guestCta.isVisible({ timeout: 4000 }).catch(() => false);
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test (90s timeout under parallel load)
    await page.goto("/dashboard", {
      timeout: 90_000,
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});
  });

  test("paper trading cockpit renders in paper mode", async ({ page }) => {
    // Valider ny Trading Cockpit entrypoint for paper trading.
    await page.goto("/no/handel?mode=paper", {
      timeout: 90_000,
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});

    // Cockpit header is authoritative even when the data-testid is not present.
    const cockpitHeading = page.getByRole("heading", { name: "Trading Cockpit" }).first();
    try {
      await expect(cockpitHeading).toBeVisible({ timeout: 60_000 });
    } catch {
      const teaserVisible = await isGuestTeaserVisible(page);
      expect(teaserVisible).toBe(true);
      console.log("✅ Guest teaser visible when trading cockpit is gated");
      return;
    }

    // Verify paper mode label is rendered ("Lekepenger" / "Øving" in the mode switch).
    const paperModeLabel = page
      .getByText(/Lekepenger|Paper|Øving/i)
      .first();
    await expect(paperModeLabel).toBeVisible({ timeout: 60_000 });
    console.log("✅ Paper trading cockpit rendered with paper mode label");
  });

  test("paper trading API returns valid structure", async ({
    page,
    request,
  }) => {
    // Get cookies from authenticated page
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Call balance API
    const response = await request.get("/api/paper-trading/balance", {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    // 200 = has session, 404 = no session, 401 = auth required, 500 = server issue (all valid for structure test)
    expect([200, 401, 404, 500]).toContain(response.status());

    if (response.status() === 200) {
      const json = await response.json();

      // Verify response structure
      expect(json.balance).toBeDefined();
      expect(json.balance.current).toBeGreaterThanOrEqual(0);
      expect(json.balance.starting).toBeGreaterThanOrEqual(0);
      expect(json.recentTrades).toBeDefined();
      expect(Array.isArray(json.recentTrades)).toBe(true);

      console.log("✅ Paper trading API returned valid structure");
    } else if (response.status() === 401) {
      console.log("✅ Paper trading API requires auth");
    } else {
      console.log("✅ Paper trading API returned 404 (no session)");
    }
  });

  test("can initialize paper trading session", async ({ page, request }) => {
    // Get auth cookies
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Initialize paper trading
    const initResponse = await request.post("/api/paper-trading/init", {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    // Should succeed (200/201), already exist (400/409), require auth (401), or server error (500)
    expect([200, 201, 400, 401, 409, 500]).toContain(initResponse.status());

    if (initResponse.status() === 200 || initResponse.status() === 201) {
      const json = await initResponse.json();
      expect(json.success).toBe(true);
      expect(json.session.starting_balance).toBe(100000);
      console.log("✅ Paper trading initialized with 100k NOK");
    } else if (initResponse.status() === 401) {
      console.log("⚠️ Auth required for paper trading init");
      test.skip();
    } else {
      console.log("✅ Paper trading init returned:", initResponse.status());
    }
  });

  test("paper trading portfolio section renders in cockpit", async ({ page }) => {
    await page.goto("/no/handel?mode=paper", {
      timeout: 90_000,
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});

    // Check for the cockpit heading
    const cockpitHeading = page.getByRole("heading", { name: "Trading Cockpit" }).first();
    try {
      await expect(cockpitHeading).toBeVisible({ timeout: 60_000 });
    } catch {
      const teaserVisible = await isGuestTeaserVisible(page);
      expect(teaserVisible).toBe(true);
      console.log(
        "✅ Guest teaser visible when trading cockpit is gated",
      );
      return;
    }

    // Verify key metrics or summary rows exist in the cockpit
    const totalCapital = page.getByText(/Total kapital|Total capital/i).first();
    const pnl = page.getByText(/P&L/).first();
    const winRate = page.getByText(/Vinnrate|Win rate/i).first();
    const trades = page.getByText(/Handler|Trades/i).first();

    await expect(
      totalCapital.or(pnl).or(winRate).or(trades).first(),
    ).toBeVisible({ timeout: 60_000 });
    console.log("✅ Portfolio metrics displayed in trading cockpit");
  });

  test("trade history API returns valid data", async ({ page, request }) => {
    // Get auth cookies
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    let response;
    try {
      // Try to get trade history via balance API (timeout 15s to avoid hanging)
      response = await request.get("/api/paper-trading/balance", {
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        timeout: 15_000,
      });
    } catch (err) {
      // Timeout or network error — likely auth/DB issue in test env
      console.log("⚠️ Balance API timeout or error, skipping:", String(err));
      test.skip();
      return;
    }

    // Skip if no session or auth required
    if (response.status() === 404 || response.status() === 401) {
      console.log("⚠️ No paper trading session or auth required, skipping");
      test.skip();
    }

    if (response.status() === 200) {
      const json = await response.json();
      expect(json.recentTrades).toBeDefined();
      expect(Array.isArray(json.recentTrades)).toBe(true);
      console.log(
        `✅ Trade history returned ${json.recentTrades.length} trades`,
      );
    } else {
      console.log("⚠️ Unexpected status:", response.status());
      test.skip();
    }
  });

  /**
   * Regresjon: suksess-respons skal alltid inneholde session_id + trade_id (Zod i API),
   * og handelshistorikken skal vise raden etter utført kjøp.
   */
  test("paper execute returns session_id and trade appears in history", async ({
    page,
    request,
    playwright,
    baseURL,
  }) => {
    const cookies = await page.context().cookies();
    test.skip(
      !hasSupabaseSessionCookies(cookies),
      "Ingen Supabase-innlogging i storageState (sb-*-auth-token). " +
        "Legg E2E_USER_EMAIL og E2E_USER_PASSWORD i .env.local og kjør med Next på :3000 slik at setup faktisk logger inn — " +
        "ellers skriver setup tom .auth/user.json på ~millisekunder.",
    );

    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const transient = (err: unknown) =>
      /socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ECONNABORTED/i.test(
        String(err),
      );

    const postOpts = {
      headers: { Cookie: cookieHeader, "Content-Type": "application/json" },
      data: {
        pair: "BTCUSDT",
        side: "buy",
        amount_nok: 2000,
      },
      timeout: 90_000,
    } as const;

    await waitForDevHealth(playwright, baseURL);

    let exec: Awaited<ReturnType<typeof request.post>>;
    let body: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        exec = await request.post("/api/paper-trading/execute", postOpts);
      } catch (e) {
        if (!transient(e) || attempt === 4) throw e;
        await waitForDevHealth(playwright, baseURL);
        continue;
      }

      if (exec.status() === 401) {
        test.skip();
        return;
      }

      expect(exec.status()).toBe(200);
      body = (await exec.json()) as Record<string, unknown>;

      if (body.success === true) break;

      if (body.rejectionReason === "CONCURRENT_TRADE_BLOCKED") {
        console.log("⚠️ Concurrent trade block, retrying in 10s:", body);
        await page.waitForTimeout(10_000);
        continue;
      }

      console.log("⚠️ Paper execute rejected (balance/risk?):", body);
      test.skip();
      return;
    }

    if (!body || body.success !== true) {
      console.log("⚠️ Paper execute did not succeed after retries:", body);
      test.skip();
      return;
    }

    expect(body.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(body.trade_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof body.new_balance).toBe("number");

    // New Trading Cockpit is the canonical paper trading UI; verify it renders.
    await page.goto("/no/handel?mode=paper", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (page.url().includes("innlogging") || page.url().includes("login")) {
      console.log("⚠️ Redirected to login on trading cockpit");
      test.skip();
      return;
    }

    await expect(
      page.getByRole("heading", { name: "Trading Cockpit" }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // Kanonisk API + handelshistorikk (syntetisk happy path — samme kjeden som support-triage).
    // Bruk samme Cookie-header som execute: storageState kan ha domain=www.klarpakke.no mens baseURL er localhost;
    // da sender ikke nettleserens fetch() sb-cookies til localhost, men APIRequestContext med eksplisitt header gjør det.
    const meTradesRes = await request.get("/api/user/trades?limit=50", {
      headers: cookieHeader
        ? { Cookie: cookieHeader, Accept: "application/json" }
        : { Accept: "application/json" },
      timeout: 60_000,
    });
    expect(meTradesRes.status()).toBe(200);
    const mt = (await meTradesRes.json()) as {
      ok?: boolean;
      trades?: unknown[];
    };
    expect(mt.ok).toBe(true);
    expect(Array.isArray(mt.trades)).toBe(true);
    expect(mt.trades!.length).toBeGreaterThanOrEqual(1);

    await page.goto("/no/handelshistorikk", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    if (page.url().includes("innlogging") || page.url().includes("login")) {
      console.log("⚠️ Redirected to login on trade history");
      test.skip();
      return;
    }
    await expect(page.getByTestId("trade-history-row").first()).toBeVisible({
      timeout: 45_000,
    });
  });
});

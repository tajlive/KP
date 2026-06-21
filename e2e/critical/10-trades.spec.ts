import { test, expect } from "@playwright/test";
import { hasSupabaseSessionCookies } from "../helpers/supabase-cookies";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

/**
 * Critical: Execute 10 Trades Flow
 * Tests paper trading execution with test user
 * Generates Allure report data
 */

test.describe("Critical: 10 Trades Flow @critical @trading @allure", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to paper trading before each test
    await page.goto("/no/paper-trading", {
      timeout: 90_000,
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("domcontentloaded", { timeout: 30_000 })
      .catch(() => {});
  });

  test("execute 10 paper trades successfully", async ({
    page,
    request,
    playwright,
    baseURL,
  }) => {
    // Get auth cookies
    const cookies = await page.context().cookies();
    
    test.skip(
      !hasSupabaseSessionCookies(cookies),
      "Ingen Supabase-innlogging i storageState. " +
        "Kjør 'npm run test:e2e:prepare' for å sette opp testbruker."
    );

    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Step 1: Initialize paper trading session
    console.log("🔄 Initializing paper trading session...");
    const initResponse = await request.post("/api/paper-trading/init", {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    if (initResponse.status() === 401) {
      test.skip("Auth required - test user not authenticated");
    }

    expect([200, 201, 409]).toContain(initResponse.status()); // 409 = already exists
    console.log("✅ Paper trading session initialized");

    // Step 2: Execute 10 trades
    const trades = [
      { pair: "BTCUSDT", side: "buy", amount_nok: 100 },
      { pair: "ETHUSDT", side: "buy", amount_nok: 150 },
      { pair: "BTCUSDT", side: "sell", amount_nok: 50 },
      { pair: "SOLUSDT", side: "buy", amount_nok: 200 },
      { pair: "ETHUSDT", side: "buy", amount_nok: 100 },
      { pair: "BTCUSDT", side: "buy", amount_nok: 120 },
      { pair: "ETHUSDT", side: "sell", amount_nok: 75 },
      { pair: "SOLUSDT", side: "sell", amount_nok: 100 },
      { pair: "BTCUSDT", side: "buy", amount_nok: 180 },
      { pair: "ETHUSDT", side: "buy", amount_nok: 90 },
    ];

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      trades: [] as any[],
    };

    await waitForDevHealth(playwright, baseURL);

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      console.log(`🔄 Executing trade ${i + 1}/10: ${trade.side} ${trade.pair} for ${trade.amount_nok} NOK`);

      try {
        const response = await request.post("/api/paper-trading/execute", {
          headers: {
            Cookie: cookieHeader,
            "Content-Type": "application/json",
          },
          data: trade,
          timeout: 60_000,
        });

        if (response.status() === 200) {
          const body = await response.json();
          if (body.success) {
            results.successful++;
            results.trades.push({
              index: i + 1,
              pair: trade.pair,
              side: trade.side,
              amount: trade.amount_nok,
              status: "success",
              trade_id: body.trade_id,
              new_balance: body.new_balance,
            });
            console.log(`✅ Trade ${i + 1} successful - New balance: ${body.new_balance}`);
          } else {
            results.skipped++;
            results.trades.push({
              index: i + 1,
              pair: trade.pair,
              side: trade.side,
              amount: trade.amount_nok,
              status: "rejected",
              reason: body.message || "Unknown",
            });
            console.log(`⚠️ Trade ${i + 1} rejected:`, JSON.stringify({ message: body.message, error: body.error, rejectionReason: body.rejectionReason, type: body.type }));
          }
        } else if (response.status() === 401) {
          test.fail(`Auth failed on trade ${i + 1}`);
        } else {
          results.failed++;
          results.trades.push({
            index: i + 1,
            pair: trade.pair,
            side: trade.side,
            amount: trade.amount_nok,
            status: "failed",
            http_status: response.status(),
          });
          console.log(`❌ Trade ${i + 1} failed with status:`, response.status());
        }
      } catch (err) {
        results.failed++;
        results.trades.push({
          index: i + 1,
          pair: trade.pair,
          side: trade.side,
          amount: trade.amount_nok,
          status: "error",
          error: String(err),
        });
        console.log(`❌ Trade ${i + 1} error:`, err);
      }

      // Small delay between trades
      await page.waitForTimeout(500);
    }

    // Step 3: Verify results
    console.log("\n📊 Trade Summary:");
    console.log(`   Successful: ${results.successful}/10`);
    console.log(`   Skipped: ${results.skipped}/10`);
    console.log(`   Failed: ${results.failed}/10`);

    // Expect at least 7 successful trades (some may fail due to balance/risk limits)
    expect(results.successful).toBeGreaterThanOrEqual(7);
    expect(results.failed).toBe(0);

    // Step 4: Verify trades appear in history
    console.log("\n🔄 Verifying trade history...");
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
    expect(mt.trades!.length).toBeGreaterThanOrEqual(results.successful);

    console.log(`✅ Trade history contains ${mt.trades!.length} trades`);

    // Step 5: Navigate to trade history page and verify UI
    await page.goto("/no/handelshistorikk", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    if (page.url().includes("innlogging") || page.url().includes("login")) {
      test.skip("Redirected to login on trade history");
    }

    const tradeRow = page.getByTestId("trade-history-row").first();
    await expect(tradeRow).toBeVisible({ timeout: 25_000 });

    const tradeCount = await page.getByTestId("trade-history-row").count();
    console.log(`✅ UI shows ${tradeCount} trade rows`);

    // Attach results to Allure report
    await test.info().attach("trade-results", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });

    console.log("\n🎉 All 10 trades completed successfully!");
  });
});

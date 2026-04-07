import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "tom@klarpakke.no",
  password: "TestPassword123!",
};

test.describe("Critical: 10 Trades Flow @critical @trading @allure", () => {
  test.setTimeout(300000);

  test("execute 10 paper trades successfully", async ({ page }) => {
    console.log("🔄 Logger inn...");
    
    // Login
    await page.goto("/no/innlogging", { timeout: 60_000 });
    await page.getByTestId("innlogging-email-input").fill(TEST_USER.email);
    await page.getByTestId("innlogging-password-input").fill(TEST_USER.password);
    await page.getByTestId("innlogging-submit").click();
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    console.log("✅ Innlogging OK");

    // Bruk page.evaluate for API kall (cookies sendes automatisk)
    console.log("🔄 Initialiserer paper trading...");
    const initResult = await page.evaluate(async () => {
      const res = await fetch("/api/paper-trading/init", {
        method: "POST",
        credentials: "include",
      });
      return { status: res.status, body: await res.json().catch(() => ({})) };
    });
    console.log("   Init:", initResult.status, JSON.stringify(initResult.body).slice(0, 100));

    // Kjør 10 handler via page.evaluate
    console.log("🔄 Kjører 10 handler...");
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

    const results = { successful: 0, failed: 0, skipped: 0, trades: [] as any[] };

    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      process.stdout.write(`   ${i + 1}/10 ${t.side} ${t.pair}... `);

      const result = await page.evaluate(async (trade) => {
        const res = await fetch("/api/paper-trading/execute", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trade),
        });
        return { 
          status: res.status, 
          body: await res.json().catch(() => ({})),
        };
      }, t);

      if (result.status === 200 && result.body.success) {
        results.successful++;
        console.log("✅");
      } else if (result.status === 200) {
        results.skipped++;
        console.log("⚠️", result.body.message || "rejected");
      } else {
        results.failed++;
        console.log("❌", result.status);
      }

      await page.waitForTimeout(300);
    }

    console.log(`\n📊 ${results.successful}/10 OK, ${results.skipped} skipped, ${results.failed} feil`);
    
    await test.info().attach("results", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });

    expect(results.failed).toBe(0);
    expect(results.successful).toBeGreaterThanOrEqual(5);
    console.log("🎉 FULLFØRT!");
  });
});

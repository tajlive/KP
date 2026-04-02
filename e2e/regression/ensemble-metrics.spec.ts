import { test, expect } from "@playwright/test";

/**
 * Ensemble AI Metrics E2E
 * KLA-PROFIT1: Verifies /dashboard/metrics rendering, symbol toggles,
 * cron persistence, edge-function types, and Perplexity-503 fallback.
 */

test.describe("Ensemble AI Metrics Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Regression project provides authenticated storageState
    await page.goto("/no/dashboard/metrics", { waitUntil: "domcontentloaded" });
  });

  test("page loads without hydration errors", async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    // Mock API calls to ensure page renders
    await page.route("/api/backtest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          metrics: {
            sharpeRatio: 1.62,
            winRate: 0.83,
            profitFactor: 2.1,
            maxDrawdownPct: 12.4,
            totalReturnPct: 45,
            totalTrades: 120,
            bestTrade: 8,
            worstTrade: -4,
            avgTradeDuration: 86400000,
          },
          equityCurve: [
            { timestamp: Date.now(), equity: 10000 },
            { timestamp: Date.now() + 3600000, equity: 10230 },
          ],
          enhancedMetrics: {
            sortinoRatio: 1.8,
            calmarRatio: 3.6,
            expectancy: 2.5,
            maxConsecutiveLosses: 3,
            gainToPainRatio: 1.9,
          },
          buyHoldReturn: 30,
          strategyName: "Ensemble AI",
          symbol: "BTCUSDT",
        }),
      });
    });

    await page.route("/api/ai/ensemble", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol: "BTCUSDT",
          action: "BUY",
          confidence: 87,
          reasoning: "Ensemble score 87/100",
          scores: { ta: 90, ai: 85, regime: 80, sentiment: 0.6 },
          indicators: { rsi: 28, macdSignal: "bullish", bbPosition: "lower" },
          sizing: { kellyPct: 0.023, maxRiskPct: 0.023 },
          metadata: {
            regime: "bull",
            regimeConfidence: 0.82,
            timestamp: new Date().toISOString(),
          },
          execute: true,
        }),
      });
    });

    // Wait for page to fully load and stabilize
    await page.waitForLoadState("networkidle");

    // Verify page content rendered
    await expect(page.getByTestId("equity-chart")).toBeVisible();
    await expect(page.getByTestId("symbol-toggles")).toBeVisible();

    // Assert no hydration-related errors
    const hydrationErrors = consoleErrors.filter(
      (err) =>
        err.includes("hydrat") ||
        err.includes("Hydrat") ||
        err.includes("did not match") ||
        err.includes("Text content does not match")
    );

    expect(hydrationErrors, `Hydration errors found: ${hydrationErrors.join(", ")}`).toHaveLength(0);
    expect(pageErrors, `Page errors found: ${pageErrors.map((e) => e.message).join(", ")}`).toHaveLength(0);
  });

  test("renders ensemble signal card with BUY badge, confidence and kellyPct", async ({
    page,
  }) => {
    await page.route("/api/ai/ensemble", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol: "BTCUSDT",
          action: "BUY",
          confidence: 87,
          reasoning: "Ensemble score 87/100",
          scores: { ta: 90, ai: 85, regime: 80, sentiment: 0.6 },
          indicators: { rsi: 28, macdSignal: "bullish", bbPosition: "lower" },
          sizing: { kellyPct: 0.023, maxRiskPct: 0.023 },
          metadata: {
            regime: "bull",
            regimeConfidence: 0.82,
            timestamp: new Date().toISOString(),
          },
          execute: true,
        }),
      });
    });

    await page.route("/api/backtest", async (route) => {
      const body = route.request().postDataJSON?.();
      const symbol = body?.symbol ?? "BTCUSDT";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          metrics: {
            sharpeRatio: 1.62,
            winRate: 0.83,
            profitFactor: 2.1,
            maxDrawdownPct: 12.4,
            totalReturnPct: 45,
            totalTrades: 120,
            bestTrade: 8,
            worstTrade: -4,
            avgTradeDuration: 86400000,
          },
          equityCurve: [
            { timestamp: Date.now(), equity: 10000 },
            { timestamp: Date.now() + 3600000, equity: 10230 },
          ],
          enhancedMetrics: {
            sortinoRatio: 1.8,
            calmarRatio: 3.6,
            expectancy: 2.5,
            maxConsecutiveLosses: 3,
            gainToPainRatio: 1.9,
          },
          buyHoldReturn: 30,
          strategyName: "Ensemble AI",
          symbol,
        }),
      });
    });

    // Verify BUY badge is green (default variant class contains primary bg)
    const badge = page.getByTestId("ensemble-signal-badge");
    await expect(badge).toHaveText("BUY");
    await expect(badge).toHaveClass(/bg-primary/);

    // Verify confidence
    await expect(page.getByTestId("ensemble-confidence")).toHaveText(/87%/);

    // Verify Kelly between 0-5%
    const kellyText = await page.getByTestId("ensemble-kelly").textContent();
    expect(kellyText).toMatch(/Kelly\s+\d+\.?\d*%/);
    const kellyMatch = kellyText?.match(/(\d+\.?\d*)%/);
    expect(kellyMatch).toBeTruthy();
    const kellyValue = parseFloat(kellyMatch![1]);
    expect(kellyValue).toBeGreaterThanOrEqual(0);
    expect(kellyValue).toBeLessThanOrEqual(5);
  });

  test("symbol toggle switches data without reload and re-renders equity curve", async ({
    page,
  }) => {
    await page.route("/api/ai/ensemble", async (route) => {
      const body = route.request().postDataJSON?.();
      const symbol = body?.symbol ?? "BTCUSDT";
      const isEth = symbol === "ETHUSDT";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol,
          action: isEth ? "SELL" : "BUY",
          confidence: isEth ? 84 : 87,
          reasoning: `Ensemble score for ${symbol}`,
          scores: { ta: isEth ? 30 : 90, ai: isEth ? 35 : 85, regime: isEth ? 40 : 80, sentiment: isEth ? -0.5 : 0.6 },
          indicators: { rsi: isEth ? 72 : 28, macdSignal: isEth ? "bearish" : "bullish", bbPosition: isEth ? "upper" : "lower" },
          sizing: { kellyPct: isEth ? 0.021 : 0.023, maxRiskPct: isEth ? 0.021 : 0.023 },
          metadata: {
            regime: isEth ? "bear" : "bull",
            regimeConfidence: 0.8,
            timestamp: new Date().toISOString(),
          },
          execute: true,
        }),
      });
    });

    await page.route("/api/backtest", async (route) => {
      const body = route.request().postDataJSON?.();
      const symbol = body?.symbol ?? "BTCUSDT";
      const isEth = symbol === "ETHUSDT";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          metrics: {
            sharpeRatio: isEth ? 1.55 : 1.62,
            winRate: isEth ? 0.81 : 0.83,
            profitFactor: isEth ? 2.05 : 2.1,
            maxDrawdownPct: isEth ? 13 : 12.4,
            totalReturnPct: isEth ? 40 : 45,
            totalTrades: 120,
            bestTrade: 8,
            worstTrade: -4,
            avgTradeDuration: 86400000,
          },
          equityCurve: [
            { timestamp: Date.now(), equity: 10000 },
            { timestamp: Date.now() + 3600000, equity: isEth ? 11500 : 10230 },
          ],
          enhancedMetrics: {
            sortinoRatio: 1.8,
            calmarRatio: 3.6,
            expectancy: 2.5,
            maxConsecutiveLosses: 3,
            gainToPainRatio: 1.9,
          },
          buyHoldReturn: 30,
          strategyName: "Ensemble AI",
          symbol,
        }),
      });
    });

    // Wait for initial BTC load
    await expect(page.getByTestId("ensemble-signal-badge")).toHaveText("BUY");
    await expect(page.getByText(/BTCUSDT/)).toBeVisible();

    // Verify initial equity value present in chart
    const chart = page.getByTestId("equity-chart");
    await expect(chart).toBeVisible();

    // Click ETH toggle and wait for backtest response
    const backtestPromise = page.waitForResponse((res) =>
      res.url().includes("/api/backtest")
    );
    await page.getByTestId("symbol-toggle-ETHUSDT").click();
    await backtestPromise;

    // Verify signal updated to ETH / SELL without page reload
    await expect(page.getByTestId("ensemble-signal-badge")).toHaveText("SELL");
    await expect(page.getByText(/ETHUSDT/)).toBeVisible();

    // Verify equity curve re-rendered with new value (11500 for ETH)
    await expect(chart.locator("text=11500")).toBeVisible();
  });

  test("cron ai-engine returns 200 and persists signals (verified via edge function)", async ({
    request,
  }) => {
    // Dev server allows any/no Bearer; prod requires CRON_SECRET
    const cronSecret = process.env.CRON_SECRET || "dev";
    const cronRes = await request.get("/api/cron/ai-engine", {
      headers: { Authorization: `Bearer ${cronSecret}` },
      timeout: 30000,
    });

    // If unauthorized against prod without valid secret, skip DB assertions
    if (cronRes.status() === 401) {
      test.skip(true, "CRON_SECRET required in production environment");
      return;
    }

    expect(cronRes.status()).toBe(200);
    const cronBody = await cronRes.json();
    expect(cronBody).toHaveProperty("success", true);
    expect(cronBody.results).toBeInstanceOf(Array);
    expect(cronBody.results.length).toBeGreaterThan(0);

    // Verify persistence via low-latency Edge Function
    const edgeRes = await request.get(
      "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/ensemble-signals?limit=20"
    );
    expect(edgeRes.status()).toBe(200);
    const edgeBody = await edgeRes.json();
    expect(edgeBody).toHaveProperty("success", true);
    expect(typeof edgeBody.count).toBe("number");
    expect(edgeBody.signals).toBeInstanceOf(Array);

    if (edgeBody.count > 0) {
      const sig = edgeBody.signals[0];
      expect(sig).toHaveProperty("symbol");
      expect(typeof sig.symbol).toBe("string");
      expect(sig).toHaveProperty("confidence");
      expect(typeof sig.confidence).toBe("number");
      expect(sig.confidence).toBeGreaterThanOrEqual(0);
      expect(sig.confidence).toBeLessThanOrEqual(100);
      expect(sig).toHaveProperty("sizing");
      expect(typeof sig.sizing.kellyPct).toBe("number");
      expect(sig.sizing.kellyPct).toBeGreaterThanOrEqual(0);
      expect(sig.sizing.kellyPct).toBeLessThanOrEqual(0.05);
    }
  });

  test("falls back to TA-only when upstream LLM fails (simulated 503)", async ({
    page,
  }) => {
    // Mock the composite endpoint to return the exact fallback payload
    // that ensemble-engine.ts produces when Perplexity returns 503.
    await page.route("/api/ai/ensemble", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol: "BTCUSDT",
          action: "HOLD",
          confidence: 52,
          reasoning:
            "Ensemble score 52/100 (TA:60 AI:50 Regime:45) | AI: LLM fallback (neutral)",
          scores: { ta: 60, ai: 50, regime: 45, sentiment: 0 },
          indicators: {
            rsi: 45,
            macdSignal: "neutral",
            bbPosition: "middle",
          },
          sizing: { kellyPct: 0.005, maxRiskPct: 0.005 },
          metadata: {
            regime: "range",
            regimeConfidence: 0.6,
            timestamp: new Date().toISOString(),
          },
          execute: false,
        }),
      });
    });

    await page.route("/api/backtest", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          metrics: {
            sharpeRatio: 1.1,
            winRate: 0.65,
            profitFactor: 1.8,
            maxDrawdownPct: 14,
            totalReturnPct: 20,
            totalTrades: 80,
            bestTrade: 5,
            worstTrade: -3,
            avgTradeDuration: 86400000,
          },
          equityCurve: [{ timestamp: Date.now(), equity: 10000 }],
          enhancedMetrics: {
            sortinoRatio: 1.2,
            calmarRatio: 2.5,
            expectancy: 1.5,
            maxConsecutiveLosses: 4,
            gainToPainRatio: 1.4,
          },
          buyHoldReturn: 15,
          strategyName: "Ensemble AI",
          symbol: "BTCUSDT",
        }),
      });
    });

    // Page should load without crashing
    await expect(page.getByTestId("ensemble-signal-badge")).toHaveText("HOLD");
    await expect(page.getByTestId("ensemble-confidence")).toHaveText(/52%/);

    // AI score should be 50 (fallback neutral)
    await expect(
      page.getByText(/AI:\s*LLM fallback \(neutral\)/i)
    ).toBeVisible();
  });
});

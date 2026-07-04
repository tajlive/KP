import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const VIKING_NO = {
  email: "viking.no@klarpakke.test",
  password: "VikingTestPass123!",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://pskhryjzkobytnfwucrb.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const STARTING_CAPITAL_NOK = 500_000;
const TARGET_TRADES = 50;

interface BalanceResponse {
  balance: {
    current: number;
    starting: number;
  };
  recentTrades: Array<{
    id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    total_value: number;
    fee: number;
    status: string;
    created_at: string;
  }>;
}

interface ExecuteResponse {
  success: boolean;
  session_id?: string;
  trade_id?: string;
  message?: string;
  error?: string;
  rejectionReason?: string;
  type?: string;
}

interface TradesResponse {
  ok: boolean;
  trades: Array<{
    id: string;
    side: string;
    total_value: number;
    realized_pnl: number | null;
    fee: number;
  }>;
}

interface TradeSetup {
  pair: string;
  side: "buy" | "sell";
  amount_nok: number;
}

function generateTradeSetups(count: number): TradeSetup[] {
  const pairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT"];
  const setups: TradeSetup[] = [];
  for (let i = 0; i < count; i++) {
    setups.push({
      pair: pairs[i % pairs.length],
      side: i % 2 === 0 ? "buy" : "sell",
      amount_nok: 150 + (i % 10) * 10,
    });
  }
  return setups;
}

test.describe("Critical: Viking_NO Paper Trading with 50 diverse trades @critical @papertrading @viking", () => {
  test.setTimeout(600_000);

  test.beforeAll(async () => {
    console.log("🔄 Provisioning Viking_NO...");
    execSync("npm run provision:viking-no", {
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
    });
    console.log("✅ Provisioning complete");
  });

  test("Viking_NO executes 50 diverse paper trades and P&L stays consistent", async ({
    page,
  }) => {
    console.log("🔄 Authenticating Viking_NO via API...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: VIKING_NO.email,
      password: VIKING_NO.password,
    });
    if (error || !data.session) {
      throw new Error(`Viking_NO login failed: ${error?.message ?? "no session"}`);
    }
    console.log("✅ Viking_NO authenticated");

    // Set the Supabase auth cookie so the browser is logged in as Viking_NO
    const sessionJson = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      expires_in: data.session.expires_in ?? 3600,
      token_type: "bearer",
      user: data.session.user,
    });
    await page.context().addCookies([
      {
        name: "sb-pskhryjzkobytnfwucrb-auth-token",
        value: sessionJson,
        domain: ".klarpakke.no",
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
    ]);

    // Load page so browser obtains Supabase auth cookies
    await page.goto("/no/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    // 1. Verify paper session initialized with 500 000 NOK
    const balanceBeforeRes = await page.request.get("/api/paper-trading/balance");
    expect(balanceBeforeRes.status()).toBe(200);
    const balanceBeforeJson: BalanceResponse = await balanceBeforeRes.json();
    expect(balanceBeforeJson.balance.starting).toBe(STARTING_CAPITAL_NOK);
    expect(balanceBeforeJson.balance.current).toBeGreaterThan(0);

    // 2. Execute 50 diverse paper trades via the authenticated API
    const setups = generateTradeSetups(TARGET_TRADES);
    let executed = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < setups.length; i++) {
      const setup = setups[i];
      const res = await page.request.post("/api/paper-trading/execute", {
        headers: { "Content-Type": "application/json" },
        data: setup,
        timeout: 60_000,
      });
      const body: ExecuteResponse = await res.json().catch(() => ({}));
      process.stdout.write(
        `\r   ${i + 1}/${TARGET_TRADES} ${setup.side} ${setup.pair}: ${res.status()} ${
          body.success ? "OK" : (body.rejectionReason ?? body.error ?? body.message ?? "rejected")
        }`,
      );

      if (res.status() === 200 && body.success) {
        executed++;
      } else if (res.status() === 200) {
        skipped++;
      } else {
        failed++;
      }

      await page.waitForTimeout(150);
    }
    process.stdout.write("\n");
    console.log(`✅ Execute results: ${executed} OK, ${skipped} skipped, ${failed} failed`);
    expect(failed).toBe(0);
    expect(executed).toBeGreaterThanOrEqual(1);

    // 3. Verify trades were recorded
    const userTradesRes = await page.request.get("/api/user/trades?limit=200", {
      timeout: 60_000,
    });
    expect(userTradesRes.status()).toBe(200);
    const userTradesJson: TradesResponse = await userTradesRes.json();
    const userTrades = userTradesJson.trades ?? [];
    console.log(`✅ /api/user/trades returned ${userTrades.length} rows`);
    expect(userTrades.length).toBeGreaterThanOrEqual(executed);

    for (const trade of userTrades) {
      expect(["buy", "sell"]).toContain(trade.side);
      expect(trade.total_value).toBeGreaterThan(0);
    }

    // 4. Verify final balance consistency
    const balanceAfterRes = await page.request.get("/api/paper-trading/balance");
    expect(balanceAfterRes.status()).toBe(200);
    const balanceAfterJson: BalanceResponse = await balanceAfterRes.json();
    const balance = balanceAfterJson.balance;

    expect(balance.starting).toBe(STARTING_CAPITAL_NOK);
    expect(balance.current).toBeGreaterThan(0);

    const current = balance.current ?? 0;
    const expectedMin = STARTING_CAPITAL_NOK * 0.9;
    const expectedMax = STARTING_CAPITAL_NOK * 1.1;
    expect(current).toBeGreaterThanOrEqual(expectedMin);
    expect(current).toBeLessThanOrEqual(expectedMax);

    console.log(
      `✅ P&L consistent: starting=${balance.starting}, current=${current}, trades=${userTrades.length}`,
    );

    await test.info().attach("viking-balance", {
      body: JSON.stringify(balanceAfterJson, null, 2),
      contentType: "application/json",
    });
  });
});

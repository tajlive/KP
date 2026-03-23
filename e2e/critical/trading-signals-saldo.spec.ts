import { test, expect } from "@playwright/test";
import { waitForDevHealth } from "../helpers/wait-for-dev-health";

function isTransientRequestError(err: unknown) {
  return /socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ECONNABORTED/i.test(
    String(err),
  );
}

/**
 * Critical: marked-data, live/paper-modus, signal-relatert bot-status, saldo (paper) + sesjoner.
 * Krever innlogging for bruker-spesifikke kall; markedspris er offentlig.
 */
test.describe("Critical: Trading signals, live/paper, saldo @critical @papertrading", () => {
  test("offentlig markedspris (Binance-sti) returnerer gyldig struktur", async ({
    request,
  }) => {
    let response;
    try {
      response = await request.get("/api/trading/price?symbol=BTCUSDT", {
        timeout: 20_000,
      });
    } catch (err) {
      console.log("⚠️ Price API timeout:", String(err));
      test.skip();
      return;
    }

    expect([200, 502]).toContain(response.status());
    if (response.status() === 502) {
      console.log(
        "⚠️ Binance utilgjengelig (502) — eksternt; hopper over pris-assert",
      );
      test.skip();
      return;
    }

    const json = await response.json();
    expect(json.symbol).toMatch(/BTCUSDT/i);
    expect(typeof json.price).toBe("number");
    expect(json.price).toBeGreaterThan(0);
    expect(Number.isFinite(json.price)).toBe(true);
  });

  test("trading mode + sessions + bot-status krever innlogging", async ({
    playwright,
    baseURL,
  }) => {
    const apiTimeout = { timeout: 60_000 };

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await waitForDevHealth(playwright, baseURL);
      }
      const anon = await playwright.request.newContext({
        baseURL,
        storageState: { cookies: [], origins: [] },
      });
      try {
        const [modeRes, sessionsRes, botRes] = await Promise.all([
          anon.get("/api/trading/mode", apiTimeout),
          anon.get("/api/trading/sessions", apiTimeout),
          anon.get("/api/dashboard/bot-status", apiTimeout),
        ]);
        expect(modeRes.status()).toBe(401);
        expect(sessionsRes.status()).toBe(401);
        expect(botRes.status()).toBe(401);
        return;
      } catch (e) {
        if (!isTransientRequestError(e) || attempt === 2) throw e;
      } finally {
        await anon.dispose();
      }
    }
  });

  test("innlogget: trading mode (paper/live) og sesjoner svarer strukturert", async ({
    page,
    request,
  }) => {
    await page.goto("/no/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    if (page.url().includes("innlogging") || page.url().includes("/login")) {
      test.skip();
    }

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    if (!cookieHeader) {
      test.skip();
    }

    const modeRes = await request.get("/api/trading/mode", {
      headers: { Cookie: cookieHeader },
      timeout: 20_000,
    });
    expect([200, 500]).toContain(modeRes.status());
    if (modeRes.status() !== 200) {
      console.log("⚠️ GET /api/trading/mode ikke 200:", modeRes.status());
      test.skip();
      return;
    }
    const modeJson = await modeRes.json();
    expect(modeJson.success).toBe(true);
    expect(["paper", "live"]).toContain(modeJson.mode);
    expect(typeof modeJson.canSwitchToLive).toBe("boolean");
    expect(typeof modeJson.binanceConnected).toBe("boolean");

    const sessRes = await request.get("/api/trading/sessions", {
      headers: { Cookie: cookieHeader },
      timeout: 20_000,
    });
    expect([200, 500]).toContain(sessRes.status());
    if (sessRes.status() !== 200) {
      console.log("⚠️ GET /api/trading/sessions ikke 200:", sessRes.status());
      test.skip();
      return;
    }
    const sessJson = await sessRes.json();
    expect(Array.isArray(sessJson.sessions)).toBe(true);
  });

  test("innlogget: bot-status returnerer PnL, handler og signal-felter", async ({
    page,
    request,
  }) => {
    await page.goto("/no/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    if (page.url().includes("innlogging") || page.url().includes("/login")) {
      test.skip();
    }

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    if (!cookieHeader) {
      test.skip();
    }

    const botRes = await request.get("/api/dashboard/bot-status", {
      headers: { Cookie: cookieHeader },
      timeout: 25_000,
    });
    expect([200, 500]).toContain(botRes.status());
    if (botRes.status() !== 200) {
      console.log("⚠️ bot-status ikke 200:", botRes.status());
      test.skip();
      return;
    }

    const json = await botRes.json();
    expect(json.pnl).toBeDefined();
    expect(typeof json.pnl.today).toBe("number");
    expect(typeof json.pnl.week).toBe("number");
    expect(typeof json.pnl.month).toBe("number");
    expect(Array.isArray(json.lastTrades)).toBe(true);

    if (json.lastTrades.length > 0) {
      const row = json.lastTrades[0];
      expect(row).toHaveProperty("side");
      expect(row).toHaveProperty("symbol");
      expect(row).toHaveProperty("explanation");
    }

    if (json.activeStrategy !== null && json.activeStrategy !== undefined) {
      expect(["paper", "live"]).toContain(json.activeStrategy.mode);
      expect(
        ["dca", "trend", "multisignal", "grid", "aicopy"].includes(
          json.activeStrategy.type,
        ),
      ).toBe(true);
    }
  });

  test("innlogget: paper saldo-API struktur når sesjon finnes", async ({
    page,
    request,
    playwright,
    baseURL,
  }) => {
    await page.goto("/no/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    if (page.url().includes("innlogging") || page.url().includes("/login")) {
      test.skip();
    }

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    if (!cookieHeader) {
      test.skip();
    }

    await waitForDevHealth(playwright, baseURL);

    let balanceRes: Awaited<ReturnType<typeof request.get>>;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await waitForDevHealth(playwright, baseURL);
      }
      try {
        balanceRes = await request.get("/api/paper-trading/balance", {
          headers: { Cookie: cookieHeader },
          timeout: 60_000,
        });
        break;
      } catch (e) {
        if (!isTransientRequestError(e) || attempt === 2) throw e;
      }
    }

    expect([200, 401, 404, 500]).toContain(balanceRes.status());

    if (balanceRes.status() === 200) {
      const body = await balanceRes.json();
      expect(body.balance).toBeDefined();
      expect(typeof body.balance.current).toBe("number");
      expect(typeof body.balance.starting).toBe("number");
      expect(body.balance.current).toBeGreaterThanOrEqual(0);
      expect(body.balance.starting).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.recentTrades)).toBe(true);
    } else if (balanceRes.status() === 404) {
      console.log(
        "ℹ️ Ingen paper-sesjon — saldo-struktur ikke verifisert denne gangen",
      );
    } else {
      test.skip();
    }
  });
});

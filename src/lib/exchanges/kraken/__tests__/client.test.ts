import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  KrakenClient,
  KrakenLockoutError,
} from "@/lib/exchanges/kraken/client";
import {
  toKrakenSymbol,
  fromKrakenSymbol,
} from "@/lib/exchanges/kraken/symbols";

// Mock fetch
global.fetch = vi.fn();

describe("KrakenClient", () => {
  let client: KrakenClient;

  beforeEach(() => {
    client = new KrakenClient("test-key", "dGVzdC1zZWNyZXQ="); // base64 test-secret
    vi.clearAllMocks();
  });

  it("should fetch balance", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: [],
        result: { USDT: "1000.00", ZEUR: "500.00" },
      }),
    });

    const balance = await client.getBalance();
    expect(balance.USDT).toBe("1000.00");
    expect(balance.ZEUR).toBe("500.00");
  });

  it("should place market buy order", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: [],
        result: {
          txid: ["ORDER123"],
          descr: { order: "buy 0.001 XBTUSDT @ market" },
        },
      }),
    });

    const order = await client.marketBuy("XBTUSDT", "0.001");
    expect(order.txid[0]).toBe("ORDER123");
  });

  it("should handle API errors", async () => {
    // Mock 3 failed attempts (retries = 3)
    (global.fetch as any)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: ["EAPI:Invalid key"],
          result: null,
        }),
      });

    await expect(client.getBalance()).rejects.toThrow("EAPI:Invalid key");
  });

  it("should fetch tickers for multiple pairs", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: [],
        result: {
          XBTUSDC: { c: ["62143.2", "0.001"] },
          ETHUSDC: { c: ["1859.7", "0.01"] },
          SOLUSDC: { c: ["71.9", "0.1"] },
        },
      }),
    });

    const tickers = await client.getTickers(["XBTUSDC", "ETHUSDC", "SOLUSDC"]);
    expect(tickers.XBTUSDC.c[0]).toBe("62143.2");
    expect(tickers.ETHUSDC.c[0]).toBe("1859.7");
    expect(tickers.SOLUSDC.c[0]).toBe("71.9");
    // Hvert par er en egen nøkkel — IKKE slått opp med komma-separert streng
    expect(tickers["XBTUSDC,ETHUSDC,SOLUSDC"]).toBeUndefined();
  });

  it("should classify Temporary lockout as KrakenLockoutError", async () => {
    const fastClient = new KrakenClient("test-key", "dGVzdC1zZWNyZXQ=", {
      lockoutBackoffMs: [0, 0, 0],
    });
    // Retry-logikk = 3 forsøk — alle må svare lockout
    for (let i = 0; i < 3; i++) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: ["EGeneral:Temporary lockout"],
          result: null,
        }),
      });
    }

    await expect(fastClient.getBalance()).rejects.toThrow(KrakenLockoutError);
  });

  it("should classify EService:Unavailable as KrakenLockoutError", async () => {
    const fastClient = new KrakenClient("test-key", "dGVzdC1zZWNyZXQ=", {
      lockoutBackoffMs: [0, 0, 0],
    });
    for (let i = 0; i < 3; i++) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: ["EService:Unavailable"],
          result: null,
        }),
      });
    }

    await expect(fastClient.getBalance()).rejects.toThrow(KrakenLockoutError);
  });

  it("should NOT classify EOrder:Insufficient funds as lockout", async () => {
    const fastClient = new KrakenClient("test-key", "dGVzdC1zZWNyZXQ=", {
      lockoutBackoffMs: [0, 0, 0],
    });
    for (let i = 0; i < 3; i++) {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: ["EOrder:Insufficient funds"],
          result: null,
        }),
      });
    }

    const err = await fastClient.getBalance().catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(KrakenLockoutError);
    expect(err instanceof Error ? err.message : String(err)).toContain(
      "Insufficient funds",
    );
  });

  it("should pace private calls (min spacing)", async () => {
    // Testen måler pacing på SUCCESS-path: to raske kall bak hverandre spres.
    const pacedClient = new KrakenClient("test-key", "dGVzdC1zZWNyZXQ=", {
      privateSpacingMs: 200,
    });
    const t0 = Date.now();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ error: [], result: {} }),
    });
    await pacedClient.getBalance();
    await pacedClient.getBalance();
    const elapsed = Date.now() - t0;
    // Allow small timing variance (~5ms buffer)
    expect(elapsed).toBeGreaterThanOrEqual(195);
  });
});

describe("Symbol mapping", () => {
  it("should map BTCUSDT to XBTUSDT", () => {
    expect(toKrakenSymbol("BTCUSDT")).toBe("XBTUSDT");
  });

  it("should map ETHUSDT to ETHUSDT", () => {
    expect(toKrakenSymbol("ETHUSDT")).toBe("ETHUSDT");
  });

  it("should reverse map XBTUSDT to BTCUSDT", () => {
    expect(fromKrakenSymbol("XBTUSDT")).toBe("BTCUSDT");
  });

  it("should map USD to ZUSD", () => {
    expect(toKrakenSymbol("USD")).toBe("ZUSD");
  });

  it("should map EUR to ZEUR", () => {
    expect(toKrakenSymbol("EUR")).toBe("ZEUR");
  });
});

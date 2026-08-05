import { describe, it, expect, vi, beforeEach } from "vitest";
import { KrakenClient } from "@/lib/exchanges/kraken/client";
import { toKrakenSymbol, fromKrakenSymbol } from "@/lib/exchanges/kraken/symbols";

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
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: ["EAPI:Invalid key"],
        result: null,
      }),
    });

    await expect(client.getBalance()).rejects.toThrow("EAPI:Invalid key");
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

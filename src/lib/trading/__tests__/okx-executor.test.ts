/**
 * Tester for OkxExecutor — OrderExecutor-adapter for OKX.
 *
 * Speil av KrakenExecutor-testene (kontrakt-parity):
 * - fromUser: leser user_okx_keys, dekrypterer (inkl. passphrase), null uten nøkler
 * - executeOrder: market/limit, brokerCode-tag, fill fra fills, feilhåndtering
 * - getBalance: USDT-kvote, locked = 0 (kontrakt-parity med PaperExecutor)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OkxExecutor } from "../okx-executor";
import { OkxLockoutError } from "@/lib/exchanges/okx/client";

function okResponse(data: unknown, code = "0") {
  return { ok: true, json: async () => ({ code, msg: "", data }) };
}

function makeExecutor(overrides: Record<string, unknown> = {}) {
  return new OkxExecutor({
    apiKey: "test-key",
    apiSecret: "test-secret",
    passphrase: "test-passphrase",
    ...overrides,
  });
}

describe("OkxExecutor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("symbol-mapping", () => {
    it("mapper BTCUSDT → BTC-USDT i ordre-kallet", async () => {
      const executor = makeExecutor();
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse([{ ordId: "ord-1", sCode: "0" }]));
      vi.stubGlobal("fetch", mockFetch);

      await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        orderType: "market",
      });

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.instId).toBe("BTC-USDT");
      expect(body.tdMode).toBe("cash");
      expect(body.ordType).toBe("market");
    });

    it("sender brokerCode som tag", async () => {
      const executor = makeExecutor({ brokerCode: "KLARPAKKE123" });
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse([{ ordId: "ord-1", sCode: "0" }]));
      vi.stubGlobal("fetch", mockFetch);

      await executor.executeOrder({
        symbol: "ETHUSDT",
        side: "sell",
        quantity: 1,
        orderType: "market",
      });

      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body).tag).toBe("KLARPAKKE123");
    });

    it("kaster ikke for ukjent symbol — fallback til rå symbol (OKX-konvensjon)", async () => {
      const executor = makeExecutor();
      const mockFetch = vi
        .fn()
        .mockResolvedValue(okResponse([{ ordId: "ord-1", sCode: "0" }]));
      vi.stubGlobal("fetch", mockFetch);

      const result = await executor.executeOrder({
        symbol: "XRPUSDT",
        side: "buy",
        quantity: 10,
        orderType: "market",
      });

      expect(result.success).toBe(true);
      const [, init] = mockFetch.mock.calls[0];
      expect(JSON.parse(init.body).instId).toBe("XRP-USDT");
    });
  });

  describe("executeOrder", () => {
    it("returnerer OrderResult med fill fra /trade/fills", async () => {
      const executor = makeExecutor();
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse([{ ordId: "ord-1", sCode: "0", sMsg: "" }]),
        )
        .mockResolvedValueOnce(
          okResponse([
            {
              ordId: "ord-1",
              fillPx: "64820.5",
              fillSz: "0.001",
              fillFee: "0.648205",
              ts: String(Date.now()),
            },
          ]),
        );
      vi.stubGlobal("fetch", mockFetch);

      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        orderType: "market",
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("ord-1");
      expect(result.executedPrice).toBe(64820.5);
      expect(result.executedQuantity).toBe(0.001);
      expect(result.fee).toBeCloseTo(0.648205, 6);
    });

    it("returnerer feil ved ugyldig kvantum", async () => {
      const executor = makeExecutor();
      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0,
        orderType: "market",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid quantity");
    });

    it("returnerer feil ved limit-ordre uten pris", async () => {
      const executor = makeExecutor();
      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 1,
        orderType: "limit",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Limit price required for limit order");
    });

    it("returnerer feil ved OkxLockoutError med permanent:false", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 429 }),
      );

      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        orderType: "market",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("rate limited");
      expect(result.permanent).toBe(false);
    });

    it("returnerer feil ved OKX ordre-avvisning (sCode != 0)", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse([], "51000")),
      );

      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        orderType: "market",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("51000");
    });
  });

  describe("getBalance", () => {
    it("returnerer USDT-saldo som available, locked=0 (kontrakt-parity)", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          okResponse([
            {
              details: [
                { ccy: "USDT", eq: "153.68" },
                { ccy: "BTC", eq: "0.001" },
              ],
            },
          ]),
        ),
      );

      const balance = await executor.getBalance();
      expect(balance).toEqual({ available: 153.68, locked: 0, total: 153.68 });
    });

    it("returnerer 0 ved API-feil (ingen kast)", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );

      const balance = await executor.getBalance();
      expect(balance).toEqual({ available: 0, locked: 0, total: 0 });
    });
  });

  describe("validateApiKeys", () => {
    it("returnerer true ved gyldig saldo-kall", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(okResponse([{ details: [] }])),
      );

      expect(await executor.validateApiKeys()).toBe(true);
    });

    it("returnerer false ved feil", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401 }),
      );

      expect(await executor.validateApiKeys()).toBe(false);
    });
  });

  describe("getMarketPrice / fetchOrderBook / getPosition", () => {
    it("getMarketPrice returnerer ticker-last", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse([{ last: "64820.5", askPx: "64821", bidPx: "64820" }]),
          ),
      );

      expect(await executor.getMarketPrice("BTCUSDT")).toBe(64820.5);
    });

    it("fetchOrderBook returnerer best-bid/ask", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse([{ last: "3000", askPx: "3001", bidPx: "2999" }]),
          ),
      );

      const book = await executor.fetchOrderBook("ETHUSDT");
      expect(book.bids).toEqual([{ price: 2999, quantity: 0 }]);
      expect(book.asks).toEqual([{ price: 3001, quantity: 0 }]);
    });

    it("getPosition returnerer posisjon fra saldo", async () => {
      const executor = makeExecutor();
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          okResponse([
            {
              details: [
                { ccy: "USDT", eq: "100" },
                { ccy: "BTC", eq: "0.005" },
              ],
            },
          ]),
        )
        .mockResolvedValueOnce(
          okResponse([{ last: "64820.5", askPx: "64821", bidPx: "64820" }]),
        );
      vi.stubGlobal("fetch", mockFetch);

      const position = await executor.getPosition("BTCUSDT");
      expect(position).not.toBeNull();
      expect(position?.quantity).toBe(0.005);
      expect(position?.symbol).toBe("BTCUSDT");
    });

    it("getPosition returnerer null uten saldo", async () => {
      const executor = makeExecutor();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            okResponse([{ details: [{ ccy: "USDT", eq: "100" }] }]),
          ),
      );

      expect(await executor.getPosition("BTCUSDT")).toBeNull();
    });
  });
});

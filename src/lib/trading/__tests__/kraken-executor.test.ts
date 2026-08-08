/**
 * Test: kraken-executor.ts — OrderExecutor-adapter for Kraken (EU/EØS live).
 *
 * Dekker: symbol-mapping (USDC-kvote, matcher priskilden), market-ordrer,
 * fill-pris fra TradesHistory, USDC-balanse, API-key-validering.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { KrakenExecutor } from "../kraken-executor";
import { KrakenClient } from "@/lib/exchanges/kraken/client";

// Mock KrakenClient — vi trenger ikke ekte signaturer
vi.mock("@/lib/exchanges/kraken/client", () => {
  const KrakenLockoutError = class extends Error {};
  class MockKrakenClient {
    marketBuy = vi.fn();
    marketSell = vi.fn();
    limitBuy = vi.fn();
    limitSell = vi.fn();
    getTradeHistory = vi.fn();
    getTicker = vi.fn();
    getBalance = vi.fn();
  }
  return { KrakenClient: MockKrakenClient, KrakenLockoutError };
});

describe("KrakenExecutor", () => {
  let client: InstanceType<typeof KrakenClient>;
  let executor: KrakenExecutor;

  beforeEach(() => {
    client = new KrakenClient("k", "s") as InstanceType<typeof KrakenClient>;
    executor = new KrakenExecutor(client as never);
    vi.clearAllMocks();
  });

  describe("executeOrder (market)", () => {
    it("kjøper med USDC-kvote-par (BTCUSDT → XBTUSDC) og henter fill fra TradesHistory", async () => {
      vi.mocked(client.marketBuy).mockResolvedValue({
        txid: ["TX-1"],
        descr: { pair: "XBTUSDC", type: "buy", ordertype: "market" },
      } as never);
      vi.mocked(client.getTradeHistory).mockResolvedValue({
        trades: {
          T1: {
            ordertxid: "TX-1",
            price: "50000.5",
            vol: "0.002",
            fee: "0.1",
            time: Date.now() / 1000,
          },
        },
      } as never);

      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.002,
        orderType: "market",
      });

      expect(client.marketBuy).toHaveBeenCalledWith("XBTUSDC", "0.00200000");
      expect(result.success).toBe(true);
      expect(result.orderId).toBe("TX-1");
      expect(result.executedPrice).toBe(50000.5);
      expect(result.executedQuantity).toBe(0.002);
      expect(result.fee).toBe(0.1);
    });

    it("selger med riktig par og volum", async () => {
      vi.mocked(client.marketSell).mockResolvedValue({
        txid: ["TX-2"],
        descr: { pair: "SOLUSDC", type: "sell", ordertype: "market" },
      } as never);
      vi.mocked(client.getTradeHistory).mockResolvedValue({ trades: {} } as never);
      vi.mocked(client.getTicker).mockResolvedValue({ c: ["180.5"] } as never);

      const result = await executor.executeOrder({
        symbol: "SOLUSDT",
        side: "sell",
        quantity: 1,
        orderType: "market",
      });

      expect(client.marketSell).toHaveBeenCalledWith("SOLUSDC", "1.00000000");
      expect(result.success).toBe(true);
      // Fallback til ticker når TradesHistory ikke har fill ennå
      expect(result.executedPrice).toBe(180.5);
    });

    it("feiler trygt når Kraken avviser (lockout og vanlig feil)", async () => {
      vi.mocked(client.marketBuy).mockRejectedValue(
        new Error("EOrder:Insufficient funds"),
      );
      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.002,
        orderType: "market",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient funds");
    });

    it("returnerer feil på ugyldig kvantum uten å kalle Kraken", async () => {
      const result = await executor.executeOrder({
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0,
        orderType: "market",
      });
      expect(result.success).toBe(false);
      expect(client.marketBuy).not.toHaveBeenCalled();
    });
  });

  describe("symbol-mapping", () => {
    it("mapper alle støttede par til USDC-kvote (matcher priskilden)", async () => {
      vi.mocked(client.marketBuy).mockResolvedValue({
        txid: ["TX"],
        descr: { pair: "", type: "buy", ordertype: "market" },
      } as never);
      vi.mocked(client.getTradeHistory).mockResolvedValue({ trades: {} } as never);
      vi.mocked(client.getTicker).mockResolvedValue({ c: ["1"] } as never);

      const cases: Array<[string, string]> = [
        ["BTCUSDT", "XBTUSDC"],
        ["ETHUSDT", "ETHUSDC"],
        ["SOLUSDT", "SOLUSDC"],
        ["AVAXUSDT", "AVAXUSDC"],
        ["DOGEUSDT", "XDGUSDC"],
        ["LINKUSDT", "LINKUSDC"],
        ["ADAUSDT", "ADAUSDC"],
        ["DOTUSDT", "DOTUSDC"],
        ["POLUSDT", "POLUSD"],
      ];

      for (const [internal, kraken] of cases) {
        await executor.executeOrder({
          symbol: internal,
          side: "buy",
          quantity: 1,
          orderType: "market",
        });
        expect(client.marketBuy).toHaveBeenCalledWith(kraken, expect.any(String));
      }
    });
  });

  describe("getBalance", () => {
    it("returnerer USDC-balanse (live-kapital-kontrakt)", async () => {
      vi.mocked(client.getBalance).mockResolvedValue({
        USDC: "153.70",
        USDT: "999.99", // USDT må IKKE brukes
      } as never);
      const balance = await executor.getBalance();
      expect(balance.available).toBe(153.7);
    });
  });

  describe("validateApiKeys", () => {
    it("bekrefter gyldige nøkler via getBalance", async () => {
      vi.mocked(client.getBalance).mockResolvedValue({ USDC: "10" } as never);
      expect(await executor.validateApiKeys()).toBe(true);
    });

    it("avviser ugyldige nøkler", async () => {
      vi.mocked(client.getBalance).mockRejectedValue(
        new Error("EGeneral:Invalid key"),
      );
      expect(await executor.validateApiKeys()).toBe(false);
    });
  });

  describe("getMarketPrice", () => {
    it("henter siste-pris fra Kraken-ticker", async () => {
      vi.mocked(client.getTicker).mockResolvedValue({ c: ["618956.34"] } as never);
      expect(await executor.getMarketPrice("BTCUSDT")).toBe(618956.34);
    });
  });
});

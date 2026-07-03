import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { BinanceProxyExecutor } from "../binance-proxy-executor";

describe("BinanceProxyExecutor", () => {
  const supabaseUrl = "https://test-project.supabase.co";
  const serviceRoleKey = "test-service-role-key";
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes order and returns OrderResult shape", async () => {
    const executor = new BinanceProxyExecutor(
      createClient(supabaseUrl, "anon"),
      "user-id",
      "api-key",
      "api-secret",
      false,
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 200,
        data: {
          orderId: 123456,
          clientOrderId: "abc",
          transactTime: 1700000000000,
          price: "0.00",
          origQty: "0.10",
          executedQty: "0.10",
          cummulativeQuoteQty: "5000.00",
          status: "FILLED",
          type: "MARKET",
          side: "BUY",
          fills: [
            { price: "50000.00", qty: "0.10", commission: "5.00", commissionAsset: "USDT" },
          ],
        },
      }),
    } as Response);

    const result = await executor.executeOrder({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      orderType: "market",
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBe("123456");
    expect(result.executedQuantity).toBe(0.1);
    expect(result.executedPrice).toBe(50000);
    expect(result.fee).toBe(5);
    expect(result.timestamp).toEqual(new Date(1700000000000));

    expect(mockFetch).toHaveBeenCalledWith(
      `${supabaseUrl}/functions/v1/binance-proxy`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining('"action":"order"'),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.params.symbol).toBe("BTCUSDT");
    expect(body.params.side).toBe("BUY");
    expect(body.params.type).toBe("MARKET");
    expect(body.params.quantity).toBeGreaterThan(0);
  });

  it("returns failure result on proxy error", async () => {
    const executor = new BinanceProxyExecutor(
      createClient(supabaseUrl, "anon"),
      "user-id",
      "api-key",
      "api-secret",
      false,
    );

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({
        ok: false,
        error: "All endpoints failed",
        status: 502,
        endpointUsed: "https://api.binance.com",
      }),
    } as Response);

    const result = await executor.executeOrder({
      symbol: "BTCUSDT",
      side: "buy",
      quantity: 0.1,
      orderType: "market",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("All endpoints failed");
  });
});

import { describe, expect, it } from "vitest";
import {
  meTradesSuccessSchema,
  meTradeRowSchema,
  tradingDiagnosticsSuccessSchema,
} from "@/lib/trading/me-trades-api";

describe("meTradeRowSchema", () => {
  it("parses a minimal valid row", () => {
    const row = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      trading_pair: "BTCUSDT",
      side: "buy",
      quantity: 0.01,
      price: 500000,
      total_value: 5000,
      realized_pnl: null,
      mode: "paper",
      status: "filled",
      created_at: "2026-01-01T12:00:00.000Z",
      executed_at: "2026-01-01T12:00:01.000Z",
      strategy_signal: null,
    };
    expect(meTradeRowSchema.parse(row)).toMatchObject({ id: row.id });
  });

  it("coerces numeric strings from JSON", () => {
    const row = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      trading_pair: "ETHUSDT",
      side: "sell",
      quantity: "1.5",
      price: "3000",
      total_value: "4500",
      realized_pnl: null,
      mode: null,
      status: "filled",
      created_at: "2026-01-01T12:00:00.000Z",
      executed_at: null,
      strategy_signal: { x: 1 },
    };
    const p = meTradeRowSchema.parse(row);
    expect(p.quantity).toBe(1.5);
    expect(p.price).toBe(3000);
  });
});

describe("meTradesSuccessSchema", () => {
  it("parses API success envelope", () => {
    const body = {
      ok: true as const,
      diagnostic_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      limit: 200,
      trades: [],
    };
    expect(meTradesSuccessSchema.parse(body)).toEqual(body);
  });
});

describe("tradingDiagnosticsSuccessSchema", () => {
  it("parses diagnostics payload", () => {
    const body = {
      ok: true as const,
      diagnostic_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      build_version: "abc123def456",
      trades_visible_count: 3,
      last_trade_created_at: "2026-01-01T00:00:00.000Z",
      paper_trade_count: 2,
      live_trade_count: 1,
      active_sessions_count: 1,
    };
    expect(tradingDiagnosticsSuccessSchema.parse(body)).toEqual(body);
  });
});

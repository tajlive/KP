import { z } from "zod";

/** Én rad som returneres fra GET /api/user/trades (matches handelshistorikk-kolonner). */
export const meTradeRowSchema = z.object({
  id: z.string().uuid(),
  trading_pair: z.string(),
  side: z.string(),
  quantity: z.coerce.number(),
  price: z.coerce.number(),
  total_value: z.coerce.number(),
  realized_pnl: z.union([z.number(), z.null()]),
  mode: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string(),
  executed_at: z.string().nullable(),
  strategy_signal: z.unknown().nullable(),
  session_id: z.string().uuid().nullable().optional(),
  fee: z.coerce.number().nullable().optional(),
  order_type: z.string().nullable().optional(),
});

export const mePositionSchema = z.object({
  pair: z.string(),
  quantity: z.number(),
  avg_entry_price: z.number(),
  cost_basis_nok: z.number(),
  oldest_entry_at: z.string(),
  current_price_nok: z.number().nullable(),
  market_value_nok: z.number().nullable(),
  unrealized_pnl_nok: z.number().nullable(),
  unrealized_pnl_pct: z.number().nullable(),
});

export type MePosition = z.infer<typeof mePositionSchema>;

export const meTradesSuccessSchema = z.object({
  ok: z.literal(true),
  diagnostic_id: z.string().uuid(),
  trades: z.array(meTradeRowSchema),
  positions: z.array(mePositionSchema).optional(),
  limit: z.number().int().positive(),
});

export const meTradesErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  diagnostic_id: z.string().uuid(),
});

export type MeTradeRow = z.infer<typeof meTradeRowSchema>;

export const tradingDiagnosticsSuccessSchema = z.object({
  ok: z.literal(true),
  diagnostic_id: z.string().uuid(),
  build_version: z.string(),
  trades_visible_count: z.number().int().nonnegative(),
  last_trade_created_at: z.string().nullable(),
  paper_trade_count: z.number().int().nonnegative(),
  live_trade_count: z.number().int().nonnegative(),
  active_sessions_count: z.number().int().nonnegative(),
});

export type TradingDiagnosticsPayload = z.infer<
  typeof tradingDiagnosticsSuccessSchema
>;

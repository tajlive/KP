/**
 * Canonical fill/fee/slippage constants for all trading modes.
 *
 * Én sannhetskilde (single source of truth) for:
 * - Paper trading (PaperExecutor)
 * - Pre-trade estimation (execute-trade)
 * - Backtest engine (backtestEngine / lib/backtest/engine)
 *
 * Prosjektbeslutning: marketSlippageRate = 0.002 (0,2 %) — realistisk slippage for retail.
 */
export const FILL_CONSTANTS = {
  feeRate: 0.001, // 0,1 % — Binance taker fee
  marketSlippageRate: 0.002, // 0,2 % — realistisk slippage for retail
  minOrderValue: 10, // USDT — minimum ordreverdi
} as const;

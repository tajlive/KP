/**
 * Canonical fill/fee/slippage constants for all trading modes.
 *
 * Én sannhetskilde (single source of truth) for:
 * - Paper trading (PaperExecutor)
 * - Pre-trade estimation (execute-trade)
 * - Backtest engine (backtestEngine / lib/backtest/engine)
 *
 * EU/EØS-fakta (2026): Kraken er eneste børs (MiCA).
 * Kraken er MiCA-regulert og Klarpakkes eneste sanne børs. Paper må simulere
 * Kraken-kostnader — ellers lyver lekepenger-P&L.
 *
 * Fee-kilde: Kraken cross-platform fee tiers (support.kraken.com, juli 2026):
 *   Tier 1 ($0+):           taker 0.80 % | maker 0.40 %
 *   Tier 3 ($10K+/20k AoP): taker 0.38 % | maker 0.22 %
 * Vi bruker Tier 1 taker (0.8 %) som konservativ standard — de fleste
 * Klarpakke-brukere starter under $10K 30-dagers volum. Live-utførelse henter
 * EKTE fee fra Kraken TradesHistory (KrakenExecutor), så live er alltid sann.
 *
 * OKX (børs #2, EEA Regular-tier per okx.com/fees, juli 2026):
 *   taker 0.10 % | maker 0.08 % — klart billigere enn Kraken Tier 1.
 * Samme prinsipp: paper simulerer OKX-fees, live henter EKTE fee fra fills.
 */
export const FILL_CONSTANTS = {
  feeRate: 0.008, // 0,8 % — Kraken spot taker fee, Tier 1 (juli 2026)
  marketSlippageRate: 0.002, // 0,2 % — realistisk slippage for retail
  minOrderValue: 10, // USDT — minimum ordreverdi
} as const;

/** OKX-fee-konfigurasjon (EEA Regular-tier, juli 2026 — okx.com/fees). */
export const OKX_FEE_CONFIG = {
  maker: 0.0008, // 0,08 %
  taker: 0.001, // 0,10 %
} as const;

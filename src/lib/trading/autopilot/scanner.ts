/**
 * Portfolio Scanner (Task B1, autopilot-plan 2026-08-06).
 *
 * Ren funksjon: henter Kraken Balance + Ticker og beregner total equity,
 * fri USDC og per-par posisjoner. Ingen side-effekter utover client-kallene.
 *
 * Asset-mapping (lærdommen): Kraken-balansen bruker legacy-prefiks for
 * eldre assets — XXBT (BTC), XETH (ETH) — mens nyere assets står uten
 * (SOL, ADA, DOT, USDC). PAIR_CFG i kraken-grid-config.mjs er SSoT for
 * asset-feltet. bal["XBT"] er ALLTID undefined — les bal[cfg.asset].
 */

import { PAIR_CFG } from "../kraken-grid-config.mjs";
import type { KrakenBalance, KrakenTicker } from "@/lib/exchanges/kraken/client";

/** PAIR_CFG er JS (.mjs) med infererte literale nøkler — indekser via Record. */
const PAIR_CFG_LOOKUP = PAIR_CFG as unknown as Record<
  string,
  { asset: string } | undefined
>;

/** Minimalt client-grensesnitt scanneren trenger (dekkende for KrakenClient). */
export interface ScannerClient {
  getBalance(): Promise<KrakenBalance>;
  getTicker(pair: string): Promise<KrakenTicker>;
}

export interface PortfolioPosition {
  pair: string;
  qty: number;
  priceUsdc: number;
  valueUsdc: number;
}

export interface Portfolio {
  equityUsdc: number;
  freeUsdc: number;
  positions: PortfolioPosition[];
}

/**
 * Scanner en portefølje: balanse (USDC + assets) + ticker-priser for `pairs`.
 *
 * - `freeUsdc` = USDC-saldo (idle kapital).
 * - `positions` = kun par med qty > 0, priset til siste pris (ticker.c[0]).
 * - `equityUsdc` = freeUsdc + sum av posisjonsverdier.
 * - Par uten PAIR_CFG-entry hoppes over.
 * - Kaster hvis ticker mangler for et par med balanse (fail-safe: aldri
 *   undervurder equity stille).
 */
export async function scanPortfolio(
  client: ScannerClient,
  pairs: string[],
): Promise<Portfolio> {
  const balance = await client.getBalance();

  const freeUsdc = parseFloat(balance.USDC ?? "0") || 0;
  let equityUsdc = freeUsdc;
  const positions: PortfolioPosition[] = [];

  for (const pair of pairs) {
    const asset = PAIR_CFG_LOOKUP[pair]?.asset;
    if (!asset) continue; // ukjent par — ikke i PAIR_CFG

    const qty = parseFloat(balance[asset] ?? "0") || 0;
    if (qty <= 0) continue; // ingen balanse å prise

    const ticker = await client.getTicker(pair);
    if (!ticker) {
      throw new Error(`Ticker mangler for ${pair}`);
    }

    const priceUsdc = parseFloat(ticker.c[0] ?? "0") || 0;
    const valueUsdc = qty * priceUsdc;
    equityUsdc += valueUsdc;

    positions.push({ pair, qty, priceUsdc, valueUsdc });
  }

  return { equityUsdc, freeUsdc, positions };
}

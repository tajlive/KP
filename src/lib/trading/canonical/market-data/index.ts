/**
 * Kanonisk markedsdata-provider — entry point.
 *
 * Eksporterer typer og fabrikker for å lage Binance- og Kraken-baserte providere.
 */

export * from "./types";
export { BinanceMarketDataProvider } from "./binance-provider";
export { KrakenMarketDataProvider } from "./kraken-provider";

import { BinanceMarketDataProvider } from "./binance-provider";
import { KrakenMarketDataProvider } from "./kraken-provider";
import type { MarketDataProvider } from "./types";

/** Fabrikk for å opprette standard Binance markedsdata-provider. */
export function createBinanceMarketDataProvider(): MarketDataProvider {
  return new BinanceMarketDataProvider();
}

/** Fabrikk for å opprette Kraken markedsdata-provider (public REST, USDC-kvoter). */
export function createKrakenMarketDataProvider(): MarketDataProvider {
  return new KrakenMarketDataProvider();
}

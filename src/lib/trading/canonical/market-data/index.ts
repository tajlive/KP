/**
 * Kanonisk markedsdata-provider — entry point.
 *
 * Eksporterer typer og en fabrikk for å lage en Binance-basert provider.
 */

export * from "./types";
export { BinanceMarketDataProvider } from "./binance-provider";

import { BinanceMarketDataProvider } from "./binance-provider";
import type { MarketDataProvider } from "./types";

/** Fabrikk for å opprette standard Binance markedsdata-provider. */
export function createBinanceMarketDataProvider(): MarketDataProvider {
  return new BinanceMarketDataProvider();
}

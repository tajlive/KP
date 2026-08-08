/**
 * Kanonisk markedsdata-provider — entry point.
 *
 * EU/EØS (2026): Kun Kraken (MiCA-regulert). Binance er geo-blokkert for
 * norske brukere og er fjernet — ingen binance-provider finnes lenger.
 * Eksporterer typer og fabrikk for Kraken-baserte providere.
 */

export * from "./types";
export { KrakenMarketDataProvider } from "./kraken-provider";

import { KrakenMarketDataProvider } from "./kraken-provider";
import type { MarketDataProvider } from "./types";

/** Fabrikk for å opprette Kraken markedsdata-provider (public REST, USDC-kvoter). */
export function createKrakenMarketDataProvider(): MarketDataProvider {
  return new KrakenMarketDataProvider();
}

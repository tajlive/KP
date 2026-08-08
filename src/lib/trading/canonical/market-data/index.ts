/**
 * Kanonisk markedsdata-provider — entry point.
 *
 * EU/EØS (2026): Kraken er primær (MiCA-regulert), OKX er børs #2
 * (MiCA via Malta, lavere fees). Begge implementerer MarketDataProvider.
 * Eksporterer typer og fabrikker.
 */

export * from "./types";
export { KrakenMarketDataProvider } from "./kraken-provider";
export { OkxMarketDataProvider, OkxApiError } from "./okx-provider";

import { KrakenMarketDataProvider } from "./kraken-provider";
import { OkxMarketDataProvider } from "./okx-provider";
import type { MarketDataProvider } from "./types";

/** Fabrikk for å opprette Kraken markedsdata-provider (public REST, USDC-kvoter). */
export function createKrakenMarketDataProvider(): MarketDataProvider {
  return new KrakenMarketDataProvider();
}

/** Fabrikk for å opprette OKX markedsdata-provider (public REST, USDT-kvoter). */
export function createOkxMarketDataProvider(): MarketDataProvider {
  return new OkxMarketDataProvider();
}

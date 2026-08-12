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
export { FailoverMarketDataProvider } from "./failover-provider";

import { KrakenMarketDataProvider } from "./kraken-provider";
import { OkxMarketDataProvider } from "./okx-provider";
import { FailoverMarketDataProvider } from "./failover-provider";
import type { MarketDataProvider } from "./types";

/** Fabrikk for å opprette markedsdata-provider med failover (Kraken → OKX).
 * 2026-08-12 (KLA-305): Kraken public REST verifisert fungerende; ved feil
 * faller alle kall tilbake til OKX. Navnet beholdes for bakoverkompatibilitet
 * (16+ kallesteder endres ikke). */
export function createKrakenMarketDataProvider(): MarketDataProvider {
  return new FailoverMarketDataProvider(
    new KrakenMarketDataProvider(),
    new OkxMarketDataProvider(),
  );
}

/** Fabrikk for å opprette OKX markedsdata-provider (public REST, USDT-kvoter). */
export function createOkxMarketDataProvider(): MarketDataProvider {
  return new OkxMarketDataProvider();
}

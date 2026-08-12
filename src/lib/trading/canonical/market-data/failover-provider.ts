/**
 * Failover markedsdata-provider — prøver primær, faller tilbake til sekundær.
 *
 * 2026-08-12 (KLA-305): Kraken public REST fungerer (verifisert), men for
 * robusthet faller alle markedskall tilbake til OKX ved nettverks-/API-feil.
 * Bakoverkompatibel: createKrakenMarketDataProvider() beholder navnet,
 * men returnerer nå en failover-wrapper (Kraken → OKX).
 */

import type {
  MarketDataProvider,
  Market24hSnapshot,
  OrderBookSnapshot,
  Kline,
} from "./types";

export class FailoverMarketDataProvider implements MarketDataProvider {
  constructor(
    private readonly primary: MarketDataProvider,
    private readonly fallback: MarketDataProvider,
  ) {}

  /** Kjør primary; ved feil → fallback. Logger kun ved faktisk failover. */
  private async withFailover<T>(
    fn: (p: MarketDataProvider) => Promise<T>,
    op: string,
  ): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (err) {
      console.warn(
        `[market-data] ${op}: primary failed (${(err as Error).message}), using fallback`,
      );
      return fn(this.fallback);
    }
  }

  getPrice(symbol: string): Promise<number> {
    return this.withFailover((p) => p.getPrice(symbol), "getPrice");
  }

  getDepth(symbol: string, limit?: number): Promise<OrderBookSnapshot> {
    return this.withFailover((p) => p.getDepth(symbol, limit), "getDepth");
  }

  getKlines(
    symbol: string,
    interval: string,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Kline[]> {
    return this.withFailover(
      (p) => p.getKlines(symbol, interval, limit, startTime, endTime),
      "getKlines",
    );
  }

  get24hChange(symbol: string): Promise<number> {
    return this.withFailover((p) => p.get24hChange(symbol), "get24hChange");
  }

  get24hSnapshot(symbol: string): Promise<Market24hSnapshot> {
    return this.withFailover((p) => p.get24hSnapshot(symbol), "get24hSnapshot");
  }
}

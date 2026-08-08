/**
 * Kanonisk markedsdata-provider interface.
 *
 * Dette er kontrakten som alle markedsdata-konsumenter skal bruke.
 * Implementasjoner kan byttes ut (Kraken, mock, test, etc.) uten å endre consumers.
 */

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}

export interface Kline {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Full 24h-markedssnapshot for ett symbol (Kraken Ticker). */
export interface Market24hSnapshot {
  price: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface MarketDataProvider {
  /**
   * Hent siste pris for et symbol.
   * @param symbol - Handelssymbol, f.eks. "BTCUSDT"
   * @returns Pris som number
   */
  getPrice(symbol: string): Promise<number>;

  /**
   * Hent order book depth for et symbol.
   * @param symbol - Handelssymbol, f.eks. "BTCUSDT"
   * @param limit - Optional antall nivåer per side (default 20)
   * @returns OrderBookSnapshot
   */
  getDepth(symbol: string, limit?: number): Promise<OrderBookSnapshot>;

  /**
   * Hent OHLCV-lys for et symbol.
   * @param symbol - Handelssymbol, f.eks. "BTCUSDT"
   * @param interval - intervall, f.eks. "1d", "1h"
   * @param limit - Maksimalt antall lys
   * @param startTime - Optional start-tidspunkt i millisekunder siden epoch
   * @param endTime - Optional slutt-tidspunkt i millisekunder siden epoch
   * @returns Array av Kline
   */
  getKlines(
    symbol: string,
    interval: string,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<Kline[]>;

  /**
   * Hent 24-timers prisendring for et symbol.
   * @param symbol - Handelssymbol, f.eks. "BTCUSDT"
   * @returns 24-timers prosentendring som number
   */
  get24hChange(symbol: string): Promise<number>;

  /**
   * Hent full 24h-markedssnapshot (pris, endring, high, low, volum).
   * Implementert av Kraken-provideren (ett Ticker-kall).
   */
  get24hSnapshot(symbol: string): Promise<Market24hSnapshot>;
}

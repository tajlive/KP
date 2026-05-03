/**
 * FREE Market Data Provider
 * Uses CoinLore API (100% gratis, ranked #1, 14,000+ coins)
 * + Binance WebSocket for real-time prices (gratis, unlimited)
 */

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  price_usd: string;
  percent_change_24h: string;
  percent_change_7d: string;
  percent_change_1h: string;
  market_cap_usd: string;
  volume24: string;
  volume24a: string;
  rank: number;
  supply: string;
  csupply: string;
  tsupply: string;
  msupply: string;
}

export interface MarketSentiment {
  fearGreedIndex: number; // 0-100
  marketTrend: 'bull' | 'bear' | 'sideways';
  topGainers: CoinData[];
  topLosers: CoinData[];
  avgVolume24h: number;
  totalMarketCap: number;
}

// Cache for market data
let marketDataCache: CoinData[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Hent market data fra CoinLore (100% gratis, ranked #1)
 * https://www.coinlore.com/cryptocurrency-data-api
 */
export async function getMarketData(symbols: string[]): Promise<CoinData[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_TTL && marketDataCache.length > 0) {
      return marketDataCache.filter((coin: CoinData) =>
        symbols.includes(coin.symbol.toUpperCase())
      );
    }

    // CoinLore API: Gratis, unlimited requests
    const response = await fetch('https://api.coinlore.net/api/tickers/?start=0&limit=100', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 }
    });

    if (!response.ok) throw new Error(`CoinLore API error: ${response.status}`);

    const data = await response.json();
    marketDataCache = data.data;
    cacheTimestamp = now;

    // Filter til kun våre symbols
    return data.data.filter((coin: CoinData) =>
      symbols.includes(coin.symbol.toUpperCase())
    );
  } catch (error) {
    console.error('Failed to fetch market data from CoinLore:', error);
    // Return cached data if available
    return marketDataCache.filter((coin: CoinData) =>
      symbols.includes(coin.symbol.toUpperCase())
    );
  }
}

/**
 * Hent spesifikk coin data
 */
export async function getCoinData(symbol: string): Promise<CoinData | null> {
  const coins = await getMarketData([symbol]);
  return coins[0] || null;
}

/**
 * Beregn market sentiment basert på top 100 coins
 * Fear & Greed Index beregnet fra price action
 */
export async function getMarketSentiment(): Promise<MarketSentiment> {
  try {
    const response = await fetch('https://api.coinlore.net/api/tickers/?start=0&limit=100', {
      next: { revalidate: 60 }
    });

    if (!response.ok) throw new Error('CoinLore API failed');

    const data = await response.json();
    const coins: CoinData[] = data.data;

    // Beregn metrics
    const avgChange24h = coins.reduce((sum, coin) =>
      sum + parseFloat(coin.percent_change_24h || '0'), 0
    ) / coins.length;

    const avgChange1h = coins.reduce((sum, coin) =>
      sum + parseFloat(coin.percent_change_1h || '0'), 0
    ) / coins.length;

    const totalMarketCap = coins.reduce((sum, coin) =>
      sum + parseFloat(coin.market_cap_usd || '0'), 0
    );

    const avgVolume24h = coins.reduce((sum, coin) =>
      sum + parseFloat(coin.volume24 || '0'), 0
    ) / coins.length;

    // Fear & Greed Index (0-100) basert på multiple factors
    // 0 = Extreme Fear, 100 = Extreme Greed
    let fearGreedScore = 50; // Neutral base

    // Price change component (40% weight)
    fearGreedScore += avgChange24h * 2;

    // Momentum component (30% weight) - 1h trend
    fearGreedScore += avgChange1h * 3;

    // Volume component (20% weight) - higher volume can indicate greed
    const volumeRatio = avgVolume24h / 1000000000; // Normalize to billions
    fearGreedScore += (volumeRatio - 1) * 5;

    // Clamp to 0-100
    fearGreedScore = Math.max(0, Math.min(100, fearGreedScore));

    // Market trend
    const marketTrend: 'bull' | 'bear' | 'sideways' =
      avgChange24h > 3 ? 'bull' :
      avgChange24h < -3 ? 'bear' : 'sideways';

    // Top gainers/losers
    const sorted = [...coins].sort((a, b) =>
      parseFloat(b.percent_change_24h || '0') - parseFloat(a.percent_change_24h || '0')
    );

    return {
      fearGreedIndex: Math.round(fearGreedScore),
      marketTrend,
      topGainers: sorted.slice(0, 10),
      topLosers: sorted.slice(-10).reverse(),
      avgVolume24h,
      totalMarketCap
    };
  } catch (error) {
    console.error('Failed to get market sentiment:', error);
    return {
      fearGreedIndex: 50,
      marketTrend: 'sideways',
      topGainers: [],
      topLosers: [],
      avgVolume24h: 0,
      totalMarketCap: 0
    };
  }
}

/**
 * Real-time price updates via Binance WebSocket (gratis, unlimited)
 * https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
 */
export function subscribeToPriceUpdates(
  symbol: string,
  callback: (price: number) => void
): WebSocket {
  const wsSymbol = symbol.replace('USDT', '').toLowerCase();
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${wsSymbol}usdt@trade`
  );

  ws.onopen = () => {
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const price = parseFloat(data.p); // Price
      if (!isNaN(price)) {
        callback(price);
      }
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
  };

  return ws;
}

/**
 * Hent historiske priser (gratis via CoinLore)
 */
export async function getHistoricalPrices(_symbol: string, _days: number = 7): Promise<number[]> {
  // CoinLore API does not provide hourly historical price data.
  // Returning empty array allows callers to fall back to WebSocket prices.
  return [];
}

/**
 * Beregn tekniske indikatorer (gratis, client-side)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Beregn Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Beregn Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

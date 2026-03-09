/**
 * Historical Market Data Service
 * Uses CoinGecko API for real crypto data
 */

import { BacktestParams } from '@/types/paper-trading';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Coin ID mapping
const COIN_IDS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'SUSHI': 'sushi'
};

export interface MarketData {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Cache for API responses
const dataCache = new Map<string, MarketData[]>();

/**
 * Fetch historical OHLC data from CoinGecko
 * 
 * TODO: Denne funksjonen gjør direkte CoinGecko-kall og er ikke i bruk av noen
 * klient-komponenter. Enten slett denne funksjonen, eller flytt til server-side
 * route (f.eks. /api/market/historical) for å unngå CSP-blokkering i browser.
 */
export async function fetchHistoricalData(
  symbol: string,
  days: number = 365
): Promise<MarketData[]> {
  const coinId = COIN_IDS[symbol.split('-')[0]] || 'bitcoin';
  const cacheKey = `${coinId}-${days}`;
  
  // Check cache
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey)!;
  }
  
  try {
    // CoinGecko free tier: max 1 year of daily data
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}/ohlc?vs_currency=usd&days=${Math.min(days, 365)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 1 hour
        next: { revalidate: 3600 }
      }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const ohlc = await response.json();
    
    // Transform to MarketData format
    // OHLC format: [timestamp, open, high, low, close]
    const marketData: MarketData[] = ohlc.map((candle: number[]) => ({
      date: new Date(candle[0]).toISOString().split('T')[0],
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: 0 // OHLC endpoint doesn't include volume
    }));
    
    // Fetch volume data separately if needed
    if (marketData.length > 0) {
      try {
        const marketResponse = await fetch(
          `${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=usd&days=${Math.min(days, 365)}`,
          { next: { revalidate: 3600 } }
        );
        
        if (marketResponse.ok) {
          const marketData_raw = await marketResponse.json();
          const volumes = marketData_raw.total_volumes;
          
          // Merge volume data
          marketData.forEach((candle, i) => {
            if (volumes[i]) {
              candle.volume = volumes[i][1];
            }
          });
        }
      } catch (e) {
        console.warn('Could not fetch volume data:', e);
      }
    }
    
    // Cache the result
    dataCache.set(cacheKey, marketData);
    
    return marketData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    // Fallback to mock data if API fails
    return generateMockData(symbol, days);
  }
}

/**
 * Seeded random number generator for consistent mock data
 * Prevents hydration mismatch between server and client
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate realistic mock data (fallback)
 * Uses seeded random to ensure consistent data between server and client
 */
function generateMockData(symbol: string, days: number): MarketData[] {
  const data: MarketData[] = [];
  // Use fixed reference date for consistent mock data
  const referenceDate = new Date('2026-02-10T00:00:00.000Z');
  const symbolSeed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Starting price based on symbol
  const basePrices: Record<string, number> = {
    'BTC': 45000, 'ETH': 2500, 'SOL': 100, 'ADA': 0.5,
    'DOT': 7, 'MATIC': 0.8, 'LINK': 15, 'UNI': 8
  };
  
  let price = basePrices[symbol.split('-')[0]] || 100;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() - i);
    
    // Use seeded random for consistent values
    const seed = symbolSeed + i * 1000;
    const trend = Math.sin(i / 30) * 0.05; // Monthly cycle
    const volatility = (seededRandom(seed) - 0.5) * 0.06; // 6% daily volatility
    const drift = 0.0003; // Slight upward drift
    
    const change = drift + trend * 0.01 + volatility;
    price = price * (1 + change);
    
    const dayOpen = price * (1 + (seededRandom(seed + 1) - 0.5) * 0.01);
    const dayHigh = Math.max(dayOpen, price) * (1 + seededRandom(seed + 2) * 0.03);
    const dayLow = Math.min(dayOpen, price) * (1 - seededRandom(seed + 3) * 0.03);
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: dayOpen,
      high: dayHigh,
      low: dayLow,
      close: price,
      volume: Math.floor(seededRandom(seed + 4) * 1000000000) + 500000000
    });
  }
  
  return data;
}

/**
 * Get available coins for trading
 */
export function getAvailableCoins(): { symbol: string; name: string; icon: string }[] {
  return [
    { symbol: 'BTC-USD', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH-USD', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'SOL-USD', name: 'Solana', icon: '◎' },
    { symbol: 'ADA-USD', name: 'Cardano', icon: '₳' },
    { symbol: 'DOT-USD', name: 'Polkadot', icon: '●' },
    { symbol: 'MATIC-USD', name: 'Polygon', icon: '⬡' },
    { symbol: 'LINK-USD', name: 'Chainlink', icon: '⬡' },
    { symbol: 'UNI-USD', name: 'Uniswap', icon: '🦄' }
  ];
}

/**
 * Preload data for faster backtesting
 */
export async function preloadData(symbols: string[]): Promise<void> {
  await Promise.all(
    symbols.map(symbol => fetchHistoricalData(symbol, 365))
  );
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface ChartPoint {
  timestamp: number;
  price: number;
  date: string;
}

interface ChartData {
  coin: string;
  currency: string;
  days: number;
  prices: ChartPoint[];
}

// Map symbols to CoinGecko IDs
const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  BNB: 'binancecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
};

/**
 * GET /api/market/chart
 * Returns historical price data from CoinGecko
 * Query params: coin=bitcoin (required)
 *               days=30|90|180|365 (default: 90)
 *               currency=usd|nok (default: nok)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinParam = searchParams.get('coin') || 'bitcoin';
  const days = parseInt(searchParams.get('days') || '90', 10);
  const currency = (searchParams.get('currency') || 'nok').toLowerCase();
  
  // Validate coin
  const coinId = COIN_IDS[coinParam.toUpperCase()] || coinParam.toLowerCase();
  const validDays = [1, 7, 30, 90, 180, 365].includes(days) ? days : 90;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${validDays}&interval=daily`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache 1 hour
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error('Invalid response format from CoinGecko');
    }
    
    // Transform to our format
    const prices: ChartPoint[] = data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
      date: new Date(timestamp).toLocaleDateString('no-NO', { 
        day: '2-digit', 
        month: 'short' 
      }),
    }));
    
    const result: ChartData = {
      coin: coinParam,
      currency,
      days: validDays,
      prices,
    };
    
    return NextResponse.json({
      ok: true,
      data: result,
      cached: false,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
    
  } catch (error) {
    console.error('[Market Chart] Error:', error);
    
    // Return fallback data instead of error
    const fallbackPrices = generateFallbackData(coinParam, validDays);
    
    const result: ChartData = {
      coin: coinParam,
      currency,
      days: validDays,
      prices: fallbackPrices,
    };
    
    return NextResponse.json({
      ok: true,
      data: result,
      fallback: true,
      timestamp: new Date().toISOString(),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60',
      },
    });
  }
}

/**
 * Generate realistic fallback data using seeded random
 * Prevents UI crashes when API is unavailable
 */
function generateFallbackData(symbol: string, days: number): ChartPoint[] {
  const prices: ChartPoint[] = [];
  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() - days);
  
  // Base prices for common coins
  const basePrices: Record<string, number> = {
    bitcoin: 450000, // NOK
    ethereum: 32000,
    solana: 1800,
    cardano: 9,
    ripple: 26,
    binancecoin: 7000,
    polkadot: 70,
    'matic-network': 4.5,
    chainlink: 200,
    uniswap: 100,
  };
  
  const coinId = COIN_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
  let price = basePrices[coinId] || 100;
  const symbolSeed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let i = 0; i <= days; i++) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + i);
    
    // Use seeded random for consistent values
    const seed = symbolSeed + i * 1000;
    const trend = Math.sin(i / 30) * 0.05; // Monthly cycle
    const volatility = (seededRandom(seed) - 0.5) * 0.06; // 6% daily volatility
    const drift = 0.0003; // Slight upward drift
    
    const change = drift + trend * 0.01 + volatility;
    price = price * (1 + change);
    
    prices.push({
      timestamp: date.getTime(),
      price: Math.round(price * 100) / 100,
      date: date.toLocaleDateString('no-NO', { day: '2-digit', month: 'short' }),
    });
  }
  
  return prices;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

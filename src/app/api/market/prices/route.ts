import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 30; // 30 seconds cache

interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
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
 * GET /api/market/prices
 * Returns cached crypto prices from CoinGecko
 * Query params: coins=BTC,ETH,SOL (default: BTC,ETH,SOL)
 *               currency=usd|nok (default: usd)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinsParam = searchParams.get('coins') || 'BTC,ETH,SOL';
  const currency = (searchParams.get('currency') || 'usd').toLowerCase();
  
  const symbols = coinsParam.split(',').map(s => s.trim().toUpperCase());
  const ids = symbols.map(s => COIN_IDS[s] || s.toLowerCase()).join(',');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: CACHE_TTL },
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform to our format
    const prices: PriceData[] = symbols.map(symbol => {
      const id = COIN_IDS[symbol] || symbol.toLowerCase();
      const coinData = data[id];
      return {
        symbol,
        name: getCoinName(symbol),
        price: coinData?.[currency] || 0,
        change24h: coinData?.[`${currency}_24h_change`] || 0,
      };
    });
    
    return NextResponse.json({
      ok: true,
      data: prices,
      cached: false,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
    
  } catch (error) {
    console.error('[Market Prices] Error:', error);
    
    // Return fallback data instead of error
    const fallbackPrices: PriceData[] = symbols.map(symbol => ({
      symbol,
      name: getCoinName(symbol),
      price: getFallbackPrice(symbol),
      change24h: 0,
    }));
    
    return NextResponse.json({
      ok: true, // Return ok to prevent UI crashes
      data: fallbackPrices,
      fallback: true,
      timestamp: new Date().toISOString(),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10',
      },
    });
  }
}

function getCoinName(symbol: string): string {
  const names: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    ADA: 'Cardano',
    XRP: 'XRP',
    BNB: 'BNB',
    DOT: 'Polkadot',
    MATIC: 'Polygon',
    LINK: 'Chainlink',
    UNI: 'Uniswap',
  };
  return names[symbol] || symbol;
}

function getFallbackPrice(symbol: string): number {
  const prices: Record<string, number> = {
    BTC: 98500,
    ETH: 3450,
    SOL: 175,
    ADA: 0.85,
    XRP: 2.45,
    BNB: 650,
    DOT: 6.50,
    MATIC: 0.45,
    LINK: 18.50,
    UNI: 9.20,
  };
  return prices[symbol] || 100;
}

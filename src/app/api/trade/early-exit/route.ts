/**
 * GET /api/trade/early-exit
 *
 * Check early exit conditions for an open position.
 * Returns exit recommendations based on Kelly + Early Exit System.
 *
 * DISCLAIMER:
 * - This endpoint returns ANALYSIS only. No trades are executed.
 * - Users must manually act on recommendations.
 * - Historical performance does not guarantee future results.
 */

import { NextResponse } from 'next/server';
import { checkEarlyExit } from '@/lib/trading/optimal';

export const dynamic = 'force-dynamic';

interface EarlyExitRequest {
  entryPrice: number;
  currentPrice: number;
  stopPrice: number;
  side: 'LONG' | 'SHORT';
  symbol: string;
  atr: number;
  atrAvg14: number;
  fundingTime: number; // milliseconds until funding
  fundingRate: number;
}

function validateParams(searchParams: URLSearchParams): EarlyExitRequest | null {
  const entryPrice = parseFloat(searchParams.get('entryPrice') || '');
  const currentPrice = parseFloat(searchParams.get('currentPrice') || '');
  const stopPrice = parseFloat(searchParams.get('stopPrice') || '');
  const side = searchParams.get('side') as 'LONG' | 'SHORT';
  const symbol = searchParams.get('symbol') || '';
  const atr = parseFloat(searchParams.get('atr') || '');
  const atrAvg14 = parseFloat(searchParams.get('atrAvg14') || '');
  const fundingTime = parseInt(searchParams.get('fundingTime') || '', 10);
  const fundingRate = parseFloat(searchParams.get('fundingRate') || '');

  if (
    isNaN(entryPrice) ||
    isNaN(currentPrice) ||
    isNaN(stopPrice) ||
    !['LONG', 'SHORT'].includes(side) ||
    !symbol ||
    isNaN(atr) ||
    isNaN(atrAvg14) ||
    isNaN(fundingTime) ||
    isNaN(fundingRate)
  ) {
    return null;
  }

  return {
    entryPrice,
    currentPrice,
    stopPrice,
    side,
    symbol,
    atr,
    atrAvg14,
    fundingTime,
    fundingRate,
  };
}

/**
 * GET handler for early exit analysis.
 *
 * Query params:
 * - entryPrice: Position entry price
 * - currentPrice: Current market price
 * - stopPrice: Initial stop loss price
 * - side: 'LONG' or 'SHORT'
 * - symbol: Trading pair (e.g., 'BTCUSDT')
 * - atr: Current ATR value
 * - atrAvg14: 14-period average ATR
 * - fundingTime: Milliseconds until next funding
 * - fundingRate: Expected funding rate
 *
 * @returns Exit recommendation with signal and reasoning
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const params = validateParams(url.searchParams);

    if (!params) {
      return NextResponse.json(
        {
          error: 'Missing or invalid parameters',
          required: [
            'entryPrice (number)',
            'currentPrice (number)',
            'stopPrice (number)',
            'side (LONG|SHORT)',
            'symbol (string)',
            'atr (number)',
            'atrAvg14 (number)',
            'fundingTime (number, ms)',
            'fundingRate (number)',
          ],
          example:
            '/api/trade/early-exit?entryPrice=84000&currentPrice=86000&stopPrice=82000&side=LONG&symbol=BTCUSDT&atr=450&atrAvg14=380&fundingTime=3600000&fundingRate=0.0001',
        },
        { status: 400 }
      );
    }

    const recommendation = await checkEarlyExit(params);

    return NextResponse.json(
      {
        ...recommendation,
        timestamp: new Date().toISOString(),
        disclaimers: [
          'This is analysis only. No trades are executed automatically.',
          'Users must manually act on recommendations.',
          'Exit signals are based on historical patterns, not guarantees.',
        ],
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[early-exit] Error:', error);
    return NextResponse.json(
      { error: 'Unable to process early exit check' },
      { status: 500 }
    );
  }
}

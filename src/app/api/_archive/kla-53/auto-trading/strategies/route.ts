/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STRATEGIES API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Returns available trading strategies with descriptions
 * 
 * Endpoint: GET /api/auto-trading/strategies
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { NextRequest, NextResponse } from 'next/server';

interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  minTier: string;
  params: Record<string, { type: string; default: number; min?: number; max?: number; description: string }>;
}

const STRATEGIES: Strategy[] = [
  {
    id: 'dca',
    name: 'Dollar Cost Averaging (DCA)',
    description: 'Kjøper regelmessig for å jevne ut prissvingninger over tid',
    riskLevel: 'low',
    minTier: 'free',
    params: {
      amount: { type: 'number', default: 100, min: 10, description: 'Beløp per kjøp (NOK)' },
      frequency: { type: 'number', default: 24, min: 1, description: 'Timer mellom hvert kjøp' },
    },
  },
  {
    id: 'trend_follow',
    name: 'Trend Following',
    description: 'Følger markedstrender basert på tekniske indikatorer',
    riskLevel: 'medium',
    minTier: 'student',
    params: {
      smaFast: { type: 'number', default: 10, min: 5, max: 50, description: 'Rask SMA periode' },
      smaSlow: { type: 'number', default: 30, min: 10, max: 100, description: 'Langsom SMA periode' },
      positionSize: { type: 'number', default: 10, min: 1, max: 100, description: 'Posisjonsstørrelse %' },
    },
  },
  {
    id: 'multi_signal',
    name: 'Multi Signal',
    description: 'Kombinerer RSI, MACD og Bollinger Bands for presise signaler',
    riskLevel: 'medium',
    minTier: 'master',
    params: {
      rsiPeriod: { type: 'number', default: 14, min: 5, max: 30, description: 'RSI periode' },
      rsiOverbought: { type: 'number', default: 70, min: 60, max: 90, description: 'RSI overkjøpt nivå' },
      rsiOversold: { type: 'number', default: 30, min: 10, max: 40, description: 'RSI oversolgt nivå' },
    },
  },
  {
    id: 'grid',
    name: 'Grid Trading',
    description: 'Plasserer kjøps- og salgsordrer på faste prisnivåer',
    riskLevel: 'high',
    minTier: 'phd',
    params: {
      gridLevels: { type: 'number', default: 10, min: 5, max: 50, description: 'Antall grid-nivåer' },
      gridSpacing: { type: 'number', default: 2, min: 0.5, max: 10, description: 'Avstand mellom nivåer %' },
      totalAllocation: { type: 'number', default: 50, min: 10, max: 100, description: 'Total allokering %' },
    },
  },
];

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      strategies: STRATEGIES,
      totalCount: STRATEGIES.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in strategies endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

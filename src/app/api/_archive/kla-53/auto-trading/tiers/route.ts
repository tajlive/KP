/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TIERS API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Returns subscription tiers and their features
 * 
 * Endpoint: GET /api/auto-trading/tiers
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { NextRequest, NextResponse } from 'next/server';

interface Tier {
  id: string;
  name: string;
  priceNok: number;
  features: string[];
  limits: {
    maxSessions: number;
    maxTradingPairs: number;
    paperBalance: number;
    liveTrading: boolean;
    copyTrading: boolean;
    canBeLeader: boolean;
  };
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    priceNok: 0,
    features: [
      '1 aktiv trading session',
      'Paper trading only',
      'DCA strategi',
      'Grunnleggende analytics',
    ],
    limits: {
      maxSessions: 1,
      maxTradingPairs: 1,
      paperBalance: 10000,
      liveTrading: false,
      copyTrading: false,
      canBeLeader: false,
    },
  },
  {
    id: 'student',
    name: 'Student',
    priceNok: 99,
    features: [
      '3 aktive trading sessions',
      'Paper trading only',
      'DCA + Trend Following',
      'Avansert analytics',
      'E-post varsler',
    ],
    limits: {
      maxSessions: 3,
      maxTradingPairs: 3,
      paperBalance: 50000,
      liveTrading: false,
      copyTrading: false,
      canBeLeader: false,
    },
  },
  {
    id: 'master',
    name: 'Master',
    priceNok: 299,
    features: [
      '10 aktive trading sessions',
      'Paper trading only',
      'Alle strategier',
      'Prioritetssupport',
      'API tilgang',
    ],
    limits: {
      maxSessions: 10,
      maxTradingPairs: 10,
      paperBalance: 100000,
      liveTrading: false,
      copyTrading: true,
      canBeLeader: false,
    },
  },
  {
    id: 'phd',
    name: 'PhD',
    priceNok: 599,
    features: [
      'Ubegrensede sessions',
      'LIVE trading aktivert!',
      'Alle strategier',
      'Copy trading (følg andre)',
      'Kan bli leader',
      'Prioritetssupport',
    ],
    limits: {
      maxSessions: 999,
      maxTradingPairs: 999,
      paperBalance: 1000000,
      liveTrading: true,
      copyTrading: true,
      canBeLeader: true,
    },
  },
  {
    id: 'professor',
    name: 'Professor',
    priceNok: 1299,
    features: [
      'Alt i PhD',
      'White-glove onboarding',
      'Custom strategier',
      'Dedikert support',
      'Early access til nye features',
    ],
    limits: {
      maxSessions: 999,
      maxTradingPairs: 999,
      paperBalance: 10000000,
      liveTrading: true,
      copyTrading: true,
      canBeLeader: true,
    },
  },
];

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      tiers: TIERS,
      totalCount: TIERS.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in tiers endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

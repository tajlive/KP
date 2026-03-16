import { NextResponse } from 'next/server';
import {
  getFundingRateSnapshot,
  getFundingRateHistory,
} from '@/lib/futures/funding-rates';

export const runtime = 'edge';
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const action = searchParams.get('action');

    if (action === 'history' && symbol) {
      const limit = parseInt(searchParams.get('limit') ?? '30', 10);
      const history = await getFundingRateHistory(symbol, limit);
      return NextResponse.json({ ok: true, data: history });
    }

    const symbols = symbol ? [symbol.toUpperCase()] : undefined;
    const snapshot = await getFundingRateSnapshot(symbols);

    return NextResponse.json({ ok: true, data: snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

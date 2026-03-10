import { type NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // KLA-108: Prod-guard for dev-rute
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const headers: Record<string, string | null> = {};
  const relevantHeaders = [
    'host',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-for',
    'x-cloud-trace-context',
    'referer',
    'origin',
  ];
  
  relevantHeaders.forEach(h => {
    headers[h] = request.headers.get(h);
  });

  const requestUrl = new URL(request.url);
  
  return NextResponse.json({
    request: {
      url: request.url,
      origin: requestUrl.origin,
    },
    headers,
    getAppUrl: getAppUrl(),
    nodeEnv: process.env.NODE_ENV,
  });
}

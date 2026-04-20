/**
 * GET /api/cron/health-check
 *
 * Cron-triggered health check for production monitoring.
 * Runs every 15 minutes via Vercel Cron or Supabase pg_cron.
 *
 * Environment:
 * - CRON_SECRET: Required for authorization
 * - SLACK_WEBHOOK: Optional for alerts
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HealthResult {
  name: string;
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

async function checkEndpoint(
  name: string,
  url: string,
  validate?: (data: unknown) => boolean
): Promise<HealthResult> {
  const start = Date.now();
  
  try {
    const res = await fetch(url, { cache: 'no-store' });
    
    if (!res.ok) {
      return {
        name,
        status: 'error',
        latency: Date.now() - start,
        error: `HTTP ${res.status}`,
      };
    }
    
    const data = await res.json();
    
    if (validate && !validate(data)) {
      return {
        name,
        status: 'error',
        latency: Date.now() - start,
        error: 'Validation failed',
      };
    }
    
    return {
      name,
      status: 'ok',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  // Verify cron secret
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://klarpakke.no';
  
  const results = await Promise.all([
    checkEndpoint('health', `${baseUrl}/api/health`, (d) => (d as { status: string }).status === 'healthy'),
    checkEndpoint('funding-arb', `${baseUrl}/api/funding-arb`, (d) => Array.isArray((d as { disclaimers: unknown[] }).disclaimers)),
    checkEndpoint(
      'early-exit',
      `${baseUrl}/api/trade/early-exit?entryPrice=84000&currentPrice=86000&stopPrice=82000&side=LONG&symbol=BTCUSDT&atr=450&atrAvg14=380&fundingTime=3600000&fundingRate=0.0001`,
      (d) => typeof (d as { signal: string }).signal === 'string'
    ),
  ]);
  
  const allOk = results.every((r) => r.status === 'ok');
  
  // Send Slack alert if configured and any check failed
  if (!allOk && process.env.SLACK_WEBHOOK) {
    const failed = results.filter((r) => r.status === 'error');
    try {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ Klarpakke health check failed:\n${failed.map((f) => `- ${f.name}: ${f.error}`).join('\n')}`,
        }),
      });
    } catch {
      // Ignore Slack errors
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: allOk ? 'healthy' : 'degraded',
    checks: results,
  });
}

// Also support POST for pg_cron triggering
export const POST = GET;

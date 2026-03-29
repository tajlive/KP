/**
 * Analytics API - Main endpoint for client-side tracking
 * Proxies to /api/analytics/event for consistency
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to the event endpoint
    const response = await fetch(new URL('/api/analytics/event', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json().catch(() => ({}));
    
    return NextResponse.json(data, { status: response.status });
  } catch {
    // Fail silently - analytics should never block UI
    return NextResponse.json({ received: true });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

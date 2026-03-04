import { NextResponse } from 'next/server';
import { getCallbackUrl, isProduction, SUPPORTED_PROVIDERS } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    node_env: process.env.NODE_ENV,
    is_production: isProduction,
    app_url_configured: !!process.env.NEXT_PUBLIC_APP_URL,
    supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key_configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    callback_url_no: getCallbackUrl('no'),
    callback_url_en: getCallbackUrl('en'),
    supported_providers: Object.keys(SUPPORTED_PROVIDERS),
    debug: { test: true, message: 'Hello from debug' },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    status: 'healthy',
    checks,
  });
}

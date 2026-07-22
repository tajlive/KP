/**
 * API Error Wrapper — fanger ALLE 500-feil og logger til Supabase
 * 
 * Slik bruker du:
 *   export const GET = withErrorHandler(async (req) => { ... })
 * 
 * Hver 500 sendes til bot_health → health-endepunkt fanger → AI Auto-Healing
 */
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ApiHandler = (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>;

export function withErrorHandler(handler: ApiHandler, route?: string): ApiHandler {
  return async (request: NextRequest, ...args: unknown[]) => {
    const start = Date.now();
    const path = route || request.nextUrl.pathname;

    try {
      const response = await handler(request, ...args);
      
      // Logg 500-feil
      if (response.status >= 500) {
        await logError(path, response.status, Date.now() - start, 'route-500');
      }
      
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - start;
      
      // Logg alle unhandled errors
      await logError(path, 500, duration, error instanceof Error ? error.message : 'unknown');

      return NextResponse.json(
        { error: 'Intern serverfeil. Feilen er logget og vil bli fikset automatisk.' },
        { status: 500 }
      );
    }
  };
}

async function logError(path: string, status: number, durationMs: number, message: string) {
  if (!supabaseUrl || !serviceKey) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    await fetch(`${supabaseUrl}/rest/v1/bot_health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        component: `api-${path}`,
        status: 'error',
        message: `${status}: ${message}`,
        last_checked: new Date().toISOString(),
        details: JSON.stringify({ path, status, duration_ms: durationMs }),
      }),
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timeout);
  } catch (_) {
    // Fire-and-forget — aldri blokker requesten
  }
}

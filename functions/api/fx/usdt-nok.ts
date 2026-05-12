/**
 * Cloudflare Pages Function — USDT/NOK exchange rate
 * Replaces: src/app/api/fx/usdt-nok/route.ts
 */

import { createClient } from '@supabase/supabase-js';

export const onRequest: PagesFunction = async ({ request, env }) => {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('global_settings')
      .select('usdt_nok_rate,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rate = Number(data?.usdt_nok_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing USDT/NOK rate' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        rate,
        updatedAt: data?.updated_at ?? null,
        source: 'global_settings',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

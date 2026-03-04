import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Status = 'operational' | 'degraded' | 'down';

export async function GET() {
  const health: { supabase: Status; binance: Status; email: Status } = {
    supabase: 'operational',
    binance: 'operational',
    email: 'operational',
  };

  // Check Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('profiles').select('count').limit(1);
  } catch (error) {
    health.supabase = 'down';
  }

  // Check Binance API
  try {
    const res = await fetch('https://api.binance.com/api/v3/ping');
    if (!res.ok) health.binance = 'down';
  } catch (error) {
    health.binance = 'down';
  }

  return NextResponse.json(health);
}

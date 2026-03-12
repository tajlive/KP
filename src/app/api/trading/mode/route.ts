/**
 * Trading Mode API
 * GET: Hent nåværende trading mode og Binance-tilkobling
 * POST: Bytt mellom paper og live trading
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET: Hent trading mode status
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase: any = (await createClient()) as unknown;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Hent brukerprofil med trading info
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('trading_mode, binance_api_key_encrypted, paper_trades_count, exchange_connected')
      .eq('id', user.id)
      .single() as any;

    if (error) {
      console.error('Error fetching trading mode:', error);
      return NextResponse.json(
        { error: 'Kunne ikke hente trading mode' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: profile?.trading_mode || 'paper',
      canSwitchToLive: !!profile?.binance_api_key_encrypted,
      binanceConnected: !!profile?.binance_api_key_encrypted,
      paperTradesCount: profile?.paper_trades_count || 0,
    });

  } catch (error) {
    console.error('Error in GET /api/trading/mode:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

/**
 * POST: Bytt trading mode
 */
export async function POST(request: NextRequest) {
  try {
    const supabase: any = (await createClient()) as unknown;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode } = body;

    // Valider mode
    if (!mode || !['paper', 'live'].includes(mode)) {
      return NextResponse.json(
        { error: 'Ugyldig trading mode. Må være "paper" eller "live"', code: 'INVALID_MODE' },
        { status: 400 }
      );
    }

    // Hvis bytte til live, sjekk at Binance er koblet til
    if (mode === 'live') {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('binance_api_key_encrypted')
        .eq('id', user.id)
        .single() as any;

      if (!profile?.binance_api_key_encrypted) {
        return NextResponse.json(
          { 
            error: 'Binance API ikke tilkoblet. Koble til Binance først.',
            code: 'BINANCE_NOT_CONNECTED'
          },
          { status: 400 }
        );
      }

      // Sjekk tier-tilgang for live trading
      const { data: entitlements } = await supabase.rpc('get_user_entitlements', {
        p_user_id: user.id,
      });

      if (!entitlements?.[0]?.auto_trade_allow_live) {
        return NextResponse.json(
          { 
            error: 'Live trading krever Bachelor-tier eller høyere',
            code: 'TIER_LIMIT',
            required: 'bachelor',
            current: entitlements?.[0]?.subscription_tier || 'student'
          },
          { status: 403 }
        );
      }
    }

    // Oppdater trading mode
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        trading_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating trading mode:', error);
      return NextResponse.json(
        { error: 'Kunne ikke oppdatere trading mode' },
        { status: 500 }
      );
    }

    // Logg hendelsen
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'TRADING_MODE_CHANGED',
      details: { new_mode: mode },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Byttet til ${mode} trading`,
      mode,
    });

  } catch (error) {
    console.error('Error in POST /api/trading/mode:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

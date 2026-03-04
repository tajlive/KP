/**
 * Auto-Trading Settings API
 * GET: Hent auto-trading innstillinger
 * POST: Oppdater auto-trading innstillinger
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET: Hent auto-trading innstillinger
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Hent auto-trading innstillinger
    const { data: settings, error } = await supabase
      .from('auto_trading_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching auto-trading settings:', error);
      return NextResponse.json(
        { error: 'Kunne ikke hente innstillinger' },
        { status: 500 }
      );
    }

    // Hvis ingen settings finnes, returner defaults
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: {
          enabled: false,
          trading_mode: 'paper',
          max_position_size_usdt: 100,
          max_daily_loss_usdt: 50,
          allowed_symbols: ['BTCUSDT', 'ETHUSDT'],
          risk_level: 'conservative',
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });

  } catch (error) {
    console.error('Error in GET /api/auto-trading/settings:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

/**
 * POST: Oppdater auto-trading innstillinger
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      enabled,
      trading_mode,
      max_position_size_usdt,
      max_daily_loss_usdt,
      allowed_symbols,
      risk_level,
    } = body;

    // Validering
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled må være boolean', code: 'INVALID_VALUE' },
        { status: 400 }
      );
    }

    if (trading_mode && !['paper', 'live'].includes(trading_mode)) {
      return NextResponse.json(
        { error: 'trading_mode må være "paper" eller "live"', code: 'INVALID_VALUE' },
        { status: 400 }
      );
    }

    if (risk_level && !['conservative', 'moderate', 'aggressive'].includes(risk_level)) {
      return NextResponse.json(
        { error: 'risk_level må være "conservative", "moderate" eller "aggressive"', code: 'INVALID_VALUE' },
        { status: 400 }
      );
    }

    // Hvis aktiverer live mode, sjekk at Binance er koblet til
    if (enabled && trading_mode === 'live') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('binance_api_key_encrypted')
        .eq('id', user.id)
        .single();

      if (!profile?.binance_api_key_encrypted) {
        return NextResponse.json(
          { 
            error: 'Binance API ikke tilkoblet. Koble til Binance først.',
            code: 'BINANCE_NOT_CONNECTED'
          },
          { status: 400 }
        );
      }

      // Sjekk tier-tilgang
      const { data: entitlements } = await supabase.rpc('get_user_entitlements', {
        p_user_id: user.id,
      });

      if (!entitlements?.[0]?.auto_trade_allow_live) {
        return NextResponse.json(
          { 
            error: 'Live auto-trading krever Bachelor-tier eller høyere',
            code: 'TIER_LIMIT',
            required: 'bachelor',
            current: entitlements?.[0]?.subscription_tier || 'student'
          },
          { status: 403 }
        );
      }
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('auto_trading_settings')
      .upsert({
        user_id: user.id,
        enabled: enabled ?? false,
        trading_mode: trading_mode || 'paper',
        max_position_size_usdt: max_position_size_usdt ?? 100,
        max_daily_loss_usdt: max_daily_loss_usdt ?? 50,
        allowed_symbols: allowed_symbols || ['BTCUSDT', 'ETHUSDT'],
        risk_level: risk_level || 'conservative',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating auto-trading settings:', error);
      return NextResponse.json(
        { error: 'Kunne ikke oppdatere innstillinger' },
        { status: 500 }
      );
    }

    // Logg hendelsen
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: enabled ? 'AUTO_TRADING_ENABLED' : 'AUTO_TRADING_DISABLED',
      details: { 
        enabled, 
        trading_mode: trading_mode || 'paper',
        risk_level: risk_level || 'conservative',
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: enabled ? 'Auto-trading aktivert' : 'Auto-traving deaktivert',
      settings: data,
    });

  } catch (error) {
    console.error('Error in POST /api/auto-trading/settings:', error);
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

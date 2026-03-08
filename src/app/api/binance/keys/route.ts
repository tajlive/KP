/**
 * Binance API Key Management API
 * POST: Lagre nye API-nøkler (kryptert)
 * GET: Sjekk om bruker har konfigurerte nøkler (uten å returnere selve nøklene)
 * DELETE: Slett API-nøkler
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getErrorMessage } from '@/lib/utils/error';

// Binance API base URLs
const BINANCE_API_BASE = 'https://api.binance.com';
const BINANCE_TESTNET_API_BASE = 'https://testnet.binance.vision';

/**
 * Validerer Binance API-nøkler ved å gjøre et test-kall
 */
async function validateBinanceKeys(
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean
): Promise<{ valid: boolean; error?: string }> {
  try {
    const baseUrl = isTestnet ? BINANCE_TESTNET_API_BASE : BINANCE_API_BASE;
    
    // Hent server-tid for signatur
    const timeRes = await fetch(`${baseUrl}/api/v3/time`);
    if (!timeRes.ok) {
      return { valid: false, error: 'Kunne ikke koble til Binance API' };
    }
    
    const { serverTime } = await timeRes.json();
    
    // Generer signatur (i produksjon bør dette gjøres i Edge Function)
    const queryString = `timestamp=${serverTime}`;
    // MERK: Vi kan ikke generere HMAC i frontend, så vi gjør et enkelt kall
    // som sjekker om nøkkelen er gyldig
    
    const response = await fetch(`${baseUrl}/api/v3/account?${queryString}`, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    });
    
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Ugyldige API-nøkler' };
    }
    
    if (response.status === 418) {
      return { valid: false, error: 'IP-adresse er ikke whitelistet hos Binance' };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { valid: false, error: errorData.msg || 'Ukjent feil fra Binance' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Binance validation error:', getErrorMessage(error));
    return { valid: false, error: 'Kunne ikke validere nøkler' };
  }
}

/**
 * POST: Lagre nye Binance API-nøkler
 * Nøklene krypteres av Supabase Edge Function (binance-connect)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { apiKey, apiSecret, isTestnet = true } = body;

    // Validering
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Mangler API-nøkler', code: 'MISSING_KEYS' },
        { status: 400 }
      );
    }

    if (apiKey.length < 10 || apiSecret.length < 10) {
      return NextResponse.json(
        { error: 'Ugyldig format på API-nøkler', code: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    // Sjekk brukerens tier for live trading-tilgang
    if (!isTestnet) {
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

    // Kall Supabase Edge Function for å kryptere og lagre nøkler
    // (vi sender til binance-connect som håndterer kryptering)
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/binance-connector`;
    
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        api_key: apiKey,
        api_secret: apiSecret,
        is_testnet: isTestnet,
      }),
    });

    if (!edgeResponse.ok) {
      const errorData = await edgeResponse.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: errorData.error || 'Kunne ikke lagre nøkler', 
          code: 'STORAGE_ERROR' 
        },
        { status: 500 }
      );
    }

    // Logg hendelse
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'BINANCE_KEYS_ADDED',
      details: { is_testnet: isTestnet },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: isTestnet 
        ? 'Testnet-nøkler lagret' 
        : 'Live trading-nøkler lagret',
      mode: isTestnet ? 'testnet' : 'live',
    });

  } catch (error) {
    console.error('Error storing Binance keys:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Intern serverfeil', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET: Sjekk om bruker har konfigurerte Binance-nøkler
 * Returnerer IKKE selve nøklene - kun status
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Hent nøkkel-status (uten selve nøklene)
    const { data: keys, error } = await supabase
      .from('user_binance_keys')
      .select('is_testnet, is_active, last_validated_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching key status:', getErrorMessage(error));
      return NextResponse.json(
        { error: 'Kunne ikke hente nøkkel-status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      has_keys: !!keys,
      keys: keys ? {
        mode: keys.is_testnet ? 'testnet' : 'live',
        is_active: keys.is_active,
        last_validated_at: keys.last_validated_at,
        created_at: keys.created_at,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching Binance key status:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Slett Binance API-nøkler
 */
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Slett nøkler
    const { error } = await supabase
      .from('user_binance_keys')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting keys:', getErrorMessage(error));
      return NextResponse.json(
        { error: 'Kunne ikke slette nøkler' },
        { status: 500 }
      );
    }

    // Logg hendelse
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'BINANCE_KEYS_DELETED',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'API-nøkler slettet',
    });

  } catch (error) {
    console.error('Error deleting Binance keys:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Intern serverfeil' },
      { status: 500 }
    );
  }
}

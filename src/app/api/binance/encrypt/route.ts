/**
 * Binance API Key Encryption API
 * POST: Krypterer API-nøkler før lagring
 * 
 * Bruker server-side kryptering med AES-256-GCM
 * Krypteringsnøkkel hentes fra BINANCE_ENCRYPTION_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

/**
 * POST: Krypter API-nøkler
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(request, response);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Uautorisert', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { apiKey, apiSecret } = body;

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

    // Hent krypteringssecret fra env
    const encryptionSecret = process.env.BINANCE_ENCRYPTION_SECRET;
    if (!encryptionSecret) {
      console.error('BINANCE_ENCRYPTION_SECRET ikke konfigurert');
      return NextResponse.json(
        { error: 'Krypteringsfeil', code: 'ENCRYPTION_ERROR' },
        { status: 500 }
      );
    }

    // Krypter nøklene
    const encryptedKey = encrypt(apiKey, encryptionSecret);
    const encryptedSecret = encrypt(apiSecret, encryptionSecret);

    // Returner krypterte verdier (ikke logg noe!)
    return NextResponse.json({
      success: true,
      encryptedKey,
      encryptedSecret,
    });

  } catch (error) {
    console.error('Error encrypting Binance keys:', error);
    return NextResponse.json(
      { error: 'Krypteringsfeil', code: 'ENCRYPTION_ERROR' },
      { status: 500 }
    );
  }
}



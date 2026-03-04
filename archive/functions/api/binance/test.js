import { createClient } from '@supabase/supabase-js';

// Hjelpefunksjon for å generere HMAC signature
async function generateSignature(secret, queryString) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Test API-nøkler
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Verifiser autentisering
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Uautorisert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Parse body
    const body = await request.json();
    const { apiKey, apiSecret } = body;
    
    // Initialize Supabase
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Verifiser token og hent bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Hvis API-nøkler er oppgitt i body, test disse
    // Ellers, hent lagrede nøkler
    let keysToTest = { apiKey, apiSecret };
    
    if (!apiKey || !apiSecret) {
      const { data: storedKeys, error: keysError } = await supabase
        .from('trading_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('exchange', 'binance')
        .eq('is_active', true)
        .single();
      
      if (keysError || !storedKeys) {
        return new Response(
          JSON.stringify({ 
            error: 'NO_KEYS_FOUND',
            message: 'Ingen API-nøkler funnet. Koble til Binance først.'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      keysToTest = {
        apiKey: storedKeys.api_key_encrypted,
        apiSecret: storedKeys.api_secret_encrypted
      };
    }
    
    // Test API-tilkobling
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await generateSignature(keysToTest.apiSecret, queryString);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': keysToTest.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      
      // Oppdater is_valid status hvis vi brukte lagrede nøkler
      if (!apiKey) {
        await supabase
          .from('trading_api_keys')
          .update({ 
            is_valid: false,
            last_validated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('exchange', 'binance');
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'API_TEST_FAILED',
          message: error.msg || 'Kunne ikke koble til Binance',
          code: error.code
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const accountInfo = await response.json();
    
    // Oppdater is_valid status hvis vi brukte lagrede nøkler
    if (!apiKey) {
      await supabase
        .from('trading_api_keys')
        .update({ 
          is_valid: true,
          last_validated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('exchange', 'binance');
    }
    
    // Sjekk tillatelser
    const permissions = accountInfo.permissions || [];
    const hasSpot = permissions.includes('SPOT');
    const hasMargin = permissions.includes('MARGIN');
    
    // Hent saldo-info
    const balances = accountInfo.balances
      ?.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      ?.sort((a, b) => {
        const valueA = parseFloat(a.free) + parseFloat(a.locked);
        const valueB = parseFloat(b.free) + parseFloat(b.locked);
        return valueB - valueA;
      })
      ?.slice(0, 5)
      ?.map(b => ({
        asset: b.asset,
        free: parseFloat(b.free).toFixed(4),
        locked: parseFloat(b.locked).toFixed(4)
      })) || [];
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'API-tilkobling vellykket',
        data: {
          connected: true,
          permissions: permissions,
          hasSpotTrading: hasSpot,
          hasMarginTrading: hasMargin,
          accountType: accountInfo.accountType,
          balances: balances,
          totalBalances: accountInfo.balances?.length || 0
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Binance test error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Hent porteføljeinfo
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    
    // Verifiser autentisering
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Uautorisert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Initialize Supabase
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Verifiser token og hent bruker
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Hent lagrede API-nøkler
    const { data: storedKeys, error: keysError } = await supabase
      .from('trading_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('exchange', 'binance')
      .eq('is_active', true)
      .single();
    
    if (keysError || !storedKeys) {
      return new Response(
        JSON.stringify({ 
          error: 'NO_KEYS_FOUND',
          message: 'Ingen API-nøkler funnet'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Hent portefølje fra Binance
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await generateSignature(storedKeys.api_secret_encrypted, queryString);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': storedKeys.api_key_encrypted,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'API_ERROR',
          message: 'Kunne ikke hente portefølje fra Binance'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const accountInfo = await response.json();
    
    // Prosesser balanser
    const balances = accountInfo.balances
      ?.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      ?.map(b => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      })) || [];
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          balances,
          permissions: accountInfo.permissions,
          canTrade: accountInfo.permissions?.includes('SPOT')
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Get portfolio error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

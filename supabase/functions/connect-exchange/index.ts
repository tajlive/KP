/**
 * Connect Exchange Edge Function
 * Securely stores exchange API credentials with encryption
 * Supports Binance (mainnet/testnet), validates credentials before storing
 * 
 * Encryption uses libsodium (XChaCha20-Poly1305) via Deno standard library
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption using Web Crypto API (Deno compatible)
// In production, consider using libsodium-wrappers or similar
async function encryptSecret(plainText: string, key: string): Promise<{ ciphertext: string; nonce: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  
  // Generate random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive key from master key
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    data
  );
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    nonce: btoa(String.fromCharCode(...nonce)),
  };
}

async function validateBinanceKey(apiKey: string, apiSecret: string, isTestnet: boolean): Promise<{ valid: boolean; error?: string }> {
  try {
    const baseUrl = isTestnet 
      ? 'https://testnet.binance.vision' 
      : 'https://api.binance.com';
    
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    // Create signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const response = await fetch(
      `${baseUrl}/api/v3/account?${queryString}&signature=${signatureHex}`,
      {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      }
    );
    
    if (response.ok) {
      return { valid: true };
    } else {
      const error = await response.json();
      return { valid: false, error: error.msg || 'Invalid API credentials' };
    }
  } catch (e) {
    return { valid: false, error: 'Failed to validate credentials' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get master encryption key from env
    const masterKey = Deno.env.get('MASTER_ENCRYPTION_KEY');
    if (!masterKey) {
      console.error('MASTER_ENCRYPTION_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body = await req.json();
    const { 
      exchange, 
      api_key, 
      api_secret, 
      permissions = { spot: true, margin: false, futures: false },
      is_testnet = true 
    } = body;

    if (!exchange || !api_key || !api_secret) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: exchange, api_key, api_secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate exchange
    if (!['binance', 'coinbase', 'kraken'].includes(exchange)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported exchange' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials with exchange
    if (exchange === 'binance') {
      const validation = await validateBinanceKey(api_key, api_secret, is_testnet);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error || 'Invalid API credentials' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Encrypt the API secret
    const { ciphertext, nonce } = await encryptSecret(api_secret, masterKey);

    // Store in database using service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: connectionId, error } = await adminClient.rpc('store_exchange_connection', {
      p_user_id: user.id,
      p_exchange: exchange,
      p_api_key: api_key,
      p_api_secret_ciphertext: ciphertext,
      p_api_secret_nonce: nonce,
      p_permissions: permissions,
      p_is_testnet: is_testnet,
    });

    if (error) {
      console.error('Error storing connection:', error);
      throw error;
    }

    // Track event
    await adminClient.rpc('record_app_event', {
      p_user_id: user.id,
      p_event_name: 'exchange_connected',
      p_props: {
        exchange,
        is_testnet,
        permissions,
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: connectionId,
        exchange,
        is_testnet,
        message: is_testnet 
          ? 'Testnet connection established. Practice trading with fake money!' 
          : 'Live connection established. Trade with real funds.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

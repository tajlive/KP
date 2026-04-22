/**
 * Test Trade Sync Function
 * 
 * Brukes for å:
 * 1. Teste at auto-sync fungerer for en spesifikk bruker
 * 2. Verifisere at API-nøkler er korrekte
 * 3. Se hvilke trades som ville blitt synkronisert
 * 
 * Endpoint: POST /functions/v1/test-trade-sync
 * Body: { "user_id": "optional-user-id" }  // Hvis ikke oppgitt, brukes innlogget bruker
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Get request body (optional target user for admin)
    let targetUserId = userId;
    const body = await req.json().catch(() => ({}));
    
    // Check if user is admin and wants to test another user
    if (body.user_id && body.user_id !== userId) {
      const { data: adminCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (adminCheck?.role === 'admin') {
        targetUserId = body.user_id;
      }
    }

    // 1. Check if user has API keys
    const { data: apiKeys, error: keysError } = await supabase
      .from('trading_api_keys')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('exchange', 'binance')
      .single();

    if (keysError || !apiKeys) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No Binance API keys found',
          step: 'api_keys_check',
          userId: targetUserId,
          recommendation: 'Connect Binance API in /konto settings',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Try to decrypt API keys
    const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET') || 'klarpakke-secret-key';
    
    try {
      const decryptedKey = await decryptApiKey(
        apiKeys.api_key_encrypted,
        apiKeys.api_key_iv,
        encryptionSecret
      );
      
      // Don't decrypt secret for security, just check it exists
      if (!apiKeys.api_secret_encrypted) {
        throw new Error('API secret missing');
      }

      // 3. Check last sync
      const { data: lastSync } = await supabase
        .from('trade_sync_log')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 4. Get current trade count
      const { count: tradeCount } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId);

      // 5. Get symbols traded
      const { data: symbols } = await supabase
        .from('trades')
        .select('trading_pair')
        .eq('user_id', targetUserId)
        .order('executed_at', { ascending: false })
        .limit(100);

      const uniqueSymbols = [...new Set(symbols?.map(s => s.trading_pair) || [])];

      return new Response(
        JSON.stringify({
          success: true,
          step: 'verification_complete',
          userId: targetUserId,
          apiKeys: {
            exists: true,
            canDecrypt: true,
            exchange: apiKeys.exchange,
            createdAt: apiKeys.created_at,
          },
          lastSync: lastSync ? {
            status: lastSync.status,
            message: lastSync.message,
            tradesFetched: lastSync.trades_fetched,
            tradesSaved: lastSync.trades_saved,
            completedAt: lastSync.completed_at,
          } : null,
          currentStats: {
            totalTrades: tradeCount || 0,
            uniqueSymbols: uniqueSymbols,
            symbolsList: uniqueSymbols.slice(0, 10),
          },
          recommendations: getRecommendations(lastSync, tradeCount),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (decryptError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to decrypt API keys',
          step: 'decryption',
          details: decryptError instanceof Error ? decryptError.message : 'Unknown error',
          recommendation: 'Remove and reconnect Binance API keys',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function decryptApiKey(encrypted: string, iv: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("klarpakke-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const encryptedData = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const ivData = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivData },
    key,
    encryptedData
  );

  return decoder.decode(decrypted);
}

function getRecommendations(lastSync: any, tradeCount: number): string[] {
  const recommendations: string[] = [];

  if (!lastSync) {
    recommendations.push('No previous sync found. First sync will fetch all historical trades.');
  } else if (lastSync.status === 'error') {
    recommendations.push('Last sync failed. Check API keys and try again.');
  }

  if (tradeCount === 0) {
    recommendations.push('No trades in database. Ensure you have completed trades on Binance.');
  }

  if (!lastSync || new Date(lastSync.completed_at).getTime() < Date.now() - 3600000) {
    recommendations.push('Sync is overdue. Manual sync recommended or wait for auto-sync (every 15 min).');
  }

  return recommendations;
}

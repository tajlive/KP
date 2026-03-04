import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, listenKey } = await req.json()
    
    if (!userId || !listenKey) {
      return new Response(
        JSON.stringify({ error: 'userId and listenKey required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: apiKeys } = await supabase
      .from('trading_api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('exchange', 'binance')
      .single()

    if (!apiKeys) {
      return new Response(
        JSON.stringify({ error: 'No API keys found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET') || 'klarpakke-secret-key'
    const decryptedKey = await decryptApiKey(apiKeys.api_key_encrypted, apiKeys.api_key_iv, encryptionSecret)

    await fetch(`https://api.binance.com/api/v3/userDataStream?listenKey=${listenKey}`, {
      method: 'PUT',
      headers: {
        'X-MBX-APIKEY': decryptedKey,
        'Content-Type': 'application/json'
      }
    })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function decryptApiKey(encrypted: string, iv: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('klarpakke-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const encryptedData = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))
  const ivData = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivData }, key, encryptedData)
  return decoder.decode(decrypted)
}

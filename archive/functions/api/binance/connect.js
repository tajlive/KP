import { createClient } from '@supabase/supabase-js'

async function encryptApiKey(plaintext, secret) {
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('klarpakke-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. Parse request
    const body = await request.json()
    const { apiKey, apiSecret } = body

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 3. Encrypt API keys
    const encryptedKey = await encryptApiKey(apiKey, env.ENCRYPTION_SECRET)
    const encryptedSecret = await encryptApiKey(apiSecret, env.ENCRYPTION_SECRET)

    // 4. Store in database
    const { error: insertError } = await supabase
      .from('trading_api_keys')
      .upsert({
        user_id: user.id,
        exchange: 'binance',
        api_key_encrypted: encryptedKey.encrypted,
        api_key_iv: encryptedKey.iv,
        api_secret_encrypted: encryptedSecret.encrypted,
        api_secret_iv: encryptedSecret.iv,
        permissions: ['read', 'trade'],
        status: 'active',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,exchange'
      })

    if (insertError) {
      console.error('Database error:', insertError)
      throw new Error('Failed to store API keys')
    }

    // 5. Return success
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Exchange connected successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Exchange connection error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

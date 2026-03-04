import { createClient } from '@supabase/supabase-js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Manglende token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Hash token for lookup
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check if token exists and is valid
    const { data: resetRecord, error } = await supabase
      .from('admin_password_resets')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !resetRecord) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Ugyldig lenke' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Lenken er utløpt' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is already used
    if (resetRecord.used_at) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Lenken er allerede brukt' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify token error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'En feil oppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

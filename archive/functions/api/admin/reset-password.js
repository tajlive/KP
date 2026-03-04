import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse request body
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: 'Token og passord er påkrevd' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Passordet må være minst 8 tegn' }),
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

    // Find and validate token
    const { data: resetRecord, error: tokenError } = await supabase
      .from('admin_password_resets')
      .select('*, admin_users!inner(id, email)')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenError || !resetRecord) {
      return new Response(
        JSON.stringify({ error: 'Ugyldig lenke' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Lenken er utløpt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is already used
    if (resetRecord.used_at) {
      return new Response(
        JSON.stringify({ error: 'Lenken er allerede brukt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update password using Supabase Auth Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetRecord.admin_user_id,
      { password }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Kunne ikke oppdatere passord' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    const { error: markError } = await supabase
      .from('admin_password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetRecord.id);

    if (markError) {
      console.error('Failed to mark token as used:', markError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

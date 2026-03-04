import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-post er påkrevd' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find admin user by email
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      // Return success even if user not found (security best practice)
      return new Response(
        JSON.stringify({ success: true, message: 'Hvis e-posten finnes, har vi sendt en lenke' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure token
    const tokenBuffer = new Uint8Array(32);
    crypto.getRandomValues(tokenBuffer);
    const token = Array.from(tokenBuffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Hash token
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { error: insertError } = await supabase
      .from('admin_password_resets')
      .insert({
        admin_user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used_at: null
      });

    if (insertError) {
      console.error('Failed to insert reset token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Kunne ikke lagre token' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const resetUrl = `https://www.klarpakke.no/admin/reset-password?token=${token}`;
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tilbakestill passord - Klarpakke Admin</title>
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #3B82F6;">Klarpakke Admin</h1>
  </div>
  
  <p>Hei,</p>
  
  <p>Du har bedt om å tilbakestille passordet ditt for Klarpakke Admin.</p>
  
  <p>Klikk på lenken nedenfor for å lage et nytt passord:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" 
       style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
      Tilbakestill passord
    </a>
  </div>
  
  <p>Lenken er gyldig i 1 time.</p>
  
  <p>Hvis du ikke ba om dette, kan du se bort fra denne e-posten.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #6b7280;">
    Hvis knappen ikke fungerer, kopier denne lenken: ${resetUrl}
  </p>
</body>
</html>`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Klarpakke <post@klarpakke.no>',
        to: user.email,
        subject: 'Tilbakestill passord - Klarpakke Admin',
        html: emailHtml
      })
    });

    if (!resendResponse.ok) {
      console.error('Failed to send email:', await resendResponse.text());
      // Don't fail the request, but log the error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Hvis e-posten finnes, har vi sendt en lenke' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return new Response(
      JSON.stringify({ error: 'En feil oppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Cloudflare Pages Function for beta signup with improved welcome email
export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    
    // Validate
    if (!body.erfaring || !body.email || !body.laeringsmaal?.length) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Vennligst fyll ut alle påkrevde felt.' 
      }), { status: 400, headers: corsHeaders });
    }

    // Get Supabase credentials
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Count current students
    const countRes = await fetch(`${supabaseUrl}/rest/v1/beta_signups?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    
    const existingStudents = await countRes.json();
    const count = existingStudents.length;
    const studentNummer = count + 1;
    
    if (studentNummer > 100) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Dessverre er alle 100 plasser fylt!' 
      }), { status: 400, headers: corsHeaders });
    }

    // Insert into Supabase
    await fetch(`${supabaseUrl}/rest/v1/beta_signups`, {
      method: 'POST',
      headers: { 
        'apikey': supabaseKey, 
        'Authorization': `Bearer ${supabaseKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        student_nummer: studentNummer,
        erfaring: body.erfaring,
        laeringsmaal: body.laeringsmaal,
        email: body.email,
        handle: body.handle || null,
        tokens_credited: false,
        onboarding_step: 'registered',
        created_at: new Date().toISOString()
      })
    });

    // Send improved welcome email
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${env.RESEND_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        from: 'Klarpakke Universitet <onboarding@resend.dev>',
        to: body.email,
        subject: `🎓 Velkommen! Du er Student #${studentNummer}/100`,
        html: getWelcomeEmailHTML(studentNummer, body.email)
      })
    });

    return new Response(
      JSON.stringify({ success: true, studentNummer }), 
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Beta signup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers: corsHeaders }
    );
  }
}

function getWelcomeEmailHTML(studentNummer, email) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velkommen til Klarpakke Universitet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 48px; margin-bottom: 10px; }
    h1 { color: #1a1a2e; font-size: 28px; margin: 0 0 10px; }
    .student-number { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: inline-block; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold; margin: 20px 0; }
    .steps { margin: 30px 0; }
    .step { display: flex; align-items: flex-start; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #667eea; }
    .step-number { background: #667eea; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
    .step-content h3 { margin: 0 0 8px; color: #1a1a2e; font-size: 18px; }
    .step-content p { margin: 0; color: #666; font-size: 15px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 10px 0; }
    .info-box { background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .info-box h4 { margin: 0 0 10px; color: #0c5460; }
    .info-box p { margin: 0; color: #0c5460; font-size: 14px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee; color: #999; font-size: 13px; }
    .social { margin: 20px 0; }
    .social a { color: #667eea; text-decoration: none; margin: 0 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎓</div>
      <h1>Velkommen til Klarpakke Universitet!</h1>
      <div class="student-number">Student #${studentNummer} av 100</div>
      <p style="color: #666; font-size: 16px;">Du er nå offisielt en del av Norges første crypto-universitet</p>
    </div>

    <div class="steps">
      <h2 style="color: #1a1a2e; margin-bottom: 20px;">Dine neste steg:</h2>
      
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Sjekk statusen din nå</h3>
          <p>Logg inn for å se ditt studentnummer, bekrefte registreringen og få oversikt over hva som skjer frem til oppstart.</p>
          <a href="https://www.klarpakke.no/no/innlogging" class="cta-button">Sjekk min status →</a>
        </div>
      </div>

      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Hold av datoen</h3>
          <p><strong>Oppstart: 15. februar 2026</strong><br>
          Merk datoen i kalenderen din. Du får mer informasjon om tidspunkt og hvordan du logger deg på plattformen i god tid før start.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Forbered deg</h3>
          <p>I løpet av de neste ukene sender vi deg:</p>
          <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
            <li>Guide til paper trading (øve med lekepenger)</li>
            <li>Trading journal-mal</li>
            <li>Forberedelsesmateriell før første modul</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4>💡 Husk: Dette er 100% paper trading i starten</h4>
      <p>Ingen ekte penger risikeres i beta-perioden. Fokuset er på å lære deg grunnleggende trading, risikostyring og å bygge gode vaner – uten stress.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #666; margin-bottom: 15px;">Spørsmål? Svar på denne e-posten eller kontakt oss:</p>
      <a href="mailto:post@klarpakke.no" style="color: #667eea; text-decoration: none;">post@klarpakke.no</a>
    </div>

    <div class="footer">
      <p>Med vennlig hilsen,<br><strong>Teamet bak Klarpakke Universitet</strong></p>
      <p style="margin-top: 15px; font-size: 12px;">
        Du mottar denne e-posten fordi du registrerte deg på klarpakke.no<br>
        E-post: ${email}
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({ message: 'POST only endpoint' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}

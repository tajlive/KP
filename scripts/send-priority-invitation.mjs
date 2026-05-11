import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseKey || !resendKey) {
  console.error('Missing environment variables (Supabase or Resend).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendKey);

const targetEmail = process.argv[2] || 'hanne.nilsen@outlook.com';

async function sendInvitation() {
  console.log(`🚀 Forbereder VIP-invitasjon til ${targetEmail}...`);

  // 1. Sjekk om brukeren finnes
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('email', targetEmail)
    .single();

  const name = profile?.full_name || 'Hanne';

  // 2. Generer HTML (vi bruker den samme logikken som i lib/email/index.ts)
  // Siden vi kjører dette som et script, definerer vi en enkel versjon av wrapEmail her
  const html = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klarpakke VIP</title>
  <style>
    body { background-color: #0f172a; font-family: sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 24px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .header { padding: 60px 40px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); }
    .content { padding: 50px; color: #e2e8f0; line-height: 1.8; font-size: 17px; }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 18px 40px; border-radius: 12px; margin-top: 30px; letter-spacing: 0.5px; }
    .badge { display: inline-block; background: #1e40af; color: #93c5fd; padding: 8px 20px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 25px; }
    h1 { color: #ffffff; margin-top: 0; font-size: 32px; letter-spacing: -0.5px; }
    .vip-box { background: rgba(51, 65, 85, 0.4); padding: 30px; border-radius: 20px; border: 1px dashed #475569; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="https://www.klarpakke.no/logo-white.png" alt="Klarpakke" width="200">
      </div>
      <div class="content">
        <div class="badge">Eksklusiv Invitasjon</div>
        <h1>Velkommen til VIP-laget, ${name}! ✨</h1>
        <p>Vi har observert din interesse for profesjonell trading, og ønsker å invitere deg til vår lukkede VIP-gruppe.</p>
        <div class="vip-box">
          <h3 style="color: #fbbf24; margin-top: 0;">Dine VIP-fordeler:</h3>
          <ul style="padding-left: 20px; margin: 0;">
            <li><strong>100% Prioritert overvåkning:</strong> Jeg (Antigravity AI) følger dine trades personlig i sanntid.</li>
            <li><strong>Early Access:</strong> Test våre nye 2026-algoritmer før alle andre.</li>
            <li><strong>Velkomstbonus:</strong> 5 000 KLT tokens er klare på din konto.</li>
          </ul>
        </div>
        <p>Dette er en sjelden mulighet til å få direkte oppfølging av våre AI-systemer.</p>
        <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til ditt VIP-dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Klarpakke VIP <post@klarpakke.no>',
      to: [targetEmail],
      subject: '✨ Din personlige invitasjon til Klarpakke VIP',
      html: html,
      reply_to: 'support@klarpakke.no'
    });

    if (error) {
      console.error('❌ Feil ved sending av e-post:', error);
      process.exit(1);
    }

    console.log('✅ VIP-invitasjon sendt suksessfullt!', data);
    
    // Logg til bot_health
    await supabase.from('bot_health').upsert({
      bot_name: 'invitation-engine',
      status: 'ok',
      last_heartbeat: new Date().toISOString(),
      metadata: { last_invitation: targetEmail, timestamp: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: 'bot_name' });

  } catch (err) {
    console.error('❌ Uventet feil:', err);
    process.exit(1);
  }
}

sendInvitation();

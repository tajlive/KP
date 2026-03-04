import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars')
  }
  return createClient(url, key)
}

// Initialize Resend lazily
function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }
  return new Resend(apiKey)
}

// Email sending function using Resend
async function sendWelcomeEmail(email: string, studentNummer: number) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return;
  }

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: 'Klarpakke Universitet <onboarding@resend.dev>',
      to: email,
      subject: `Velkommen til Klarpakke Universitet! 🎉 [Student #${studentNummer}/100]`,
      html: getWelcomeEmailHTML(studentNummer),
    });

    if (error) {
      console.error('Resend error:', error);
    } else {
      console.log(`Welcome email sent to ${email}`, data);
    }
  } catch (error) {
    console.error('Resend error:', error);
  }
}

function getWelcomeEmailHTML(studentNummer: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px 20px; }
    .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .highlight { background: #dbeafe; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
    .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    @media only screen and (max-width: 600px) {
      .container { padding: 10px; }
      .header { padding: 30px 15px; }
      .content { padding: 20px 15px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">🎓 KLARPAKKE UNIVERSITET</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Velkommen, Student #${studentNummer}!</p>
    </div>

    <div class="content">
      <div class="section">
        <p>Hei!</p>
        <p>Takk for at du meldte deg på Klarpakke Universitet! 🎉</p>
        <p><strong>Du er student #${studentNummer} av 100 grunnlegger-studenter.</strong></p>
        <p>Men før vi starter: La meg fortelle deg hvorfor jeg bygger dette.</p>
      </div>

      <div class="section">
        <h2>📉 MIN 40K FEIL (November 2021)</h2>
        <p>Jeg så Bitcoin på ATH. $69,000. Alle sa "to the moon" 🚀</p>
        <p>Jeg tenkte: "Hvis jeg ikke kjøper NÅ, går jeg glipp!"</p>
        <p>Så jeg kjøpte. For 100k NOK.</p>
        <ul>
          <li>Uten plan.</li>
          <li>Uten research.</li>
          <li>Uten risk management.</li>
        </ul>
        <p><strong>6 uker senere: -60% 📉</strong></p>
        <p>Jeg panikksolgte. Tapte 40k NOK.</p>
      </div>

      <div class="highlight">
        <h3 style="margin-top: 0;">💡 HVA JEG LÆRTE</h3>
        <p><strong>Feilene mine:</strong></p>
        <ul>
          <li>❌ FOMO (Fear of Missing Out)</li>
          <li>❌ Ingen exit-strategi</li>
          <li>❌ Ingen stop-loss</li>
          <li>❌ Emotionally-driven beslutninger</li>
        </ul>
        <p><strong>Hvis jeg hadde hatt Klarpakke da?</strong></p>
        <ul>
          <li>✅ Paper trading først (ingen reelle tap)</li>
          <li>✅ AI hadde advart: "Kjøper på toppen"</li>
          <li>✅ Lært risk management FØR jeg tradet</li>
          <li>✅ Hatt en plan</li>
        </ul>
      </div>

      <div class="section">
        <h2>🎓 DERFOR BYGGER JEG KLARPAKKE UNIVERSITET</h2>
        <p>Jeg vil at du skal starte smartere enn jeg gjorde.</p>
        <p><strong>Dette universitetet vil vokse med deg.</strong></p>
        <p>Fra nybegynner → selvstendig trader → master.</p>
      </div>

      <div class="section">
        <h2>🚀 DINE NESTE STEG:</h2>
        
        <div style="margin: 20px 0;">
          <h3>1️⃣ JOIN DISCORD (i dag)</h3>
          <a href="https://discord.gg/klarpakke" class="cta">Join Discord →</a>
          <p style="margin: 5px 0; color: #6b7280;">Møt andre grunnlegger-studenter i #grunnlegger-studenter</p>
        </div>

        <div style="margin: 20px 0;">
          <h3>2️⃣ DAG 1 LEKSJON (15. februar kl 09:00)</h3>
          <p>"Hva er crypto? (basics uten bullshit)" - 5 min video</p>
          <p style="color: #6b7280;">Link kommer i inbox 15. februar</p>
        </div>

        <div style="margin: 20px 0;">
          <h3>3️⃣ FULLFØR 7-DAGERS INTRO (neste uke)</h3>
          <ul style="margin: 10px 0;">
            <li>Dag 1: Hva er crypto?</li>
            <li>Dag 2: Hvordan lese en chart</li>
            <li>Dag 3: Hva er trading-signaler?</li>
            <li>Dag 4: Risikostyring 101</li>
            <li>Dag 5: Paper trading demo</li>
            <li>Dag 6: Markedspsykologi</li>
            <li>Dag 7: Din læringsplan fremover</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>🎁 DINE BELØNNINGER (ALLEREDE AKTIVERT):</h2>
        <ul>
          <li>✅ 10,000 KLT tokens → Credited når du logger inn første gang</li>
          <li>✅ Lifetime 50% studierabatt → Aktivert på konto</li>
          <li>✅ "Grunnlegger-Student" badge → Vises på profil</li>
          <li>✅ Nevnt på Hall of Fame → Publiseres 15. februar</li>
        </ul>
      </div>

      <div class="section">
        <h2>🏆 VÅRSEMESTER 2026 KONKURRANSE:</h2>
        <p><strong>Start:</strong> 15. februar<br>
        <strong>Slutt:</strong> 15. juni</p>
        <p><strong>Premier:</strong></p>
        <ul>
          <li>🥇 1. plass: 1,000,000 KLT + "Student of the Semester"</li>
          <li>🥈 2. plass: 500,000 KLT</li>
          <li>🥉 3. plass: 250,000 KLT</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px;">Basert på GPA (læring, ikke profit).</p>
      </div>

      <div class="section">
        <h3>💬 SPØRSMÅL?</h3>
        <p>Svar på denne emailen. Jeg leser alle!</p>
        <p>Eller DM meg på Discord: @taj_klarpakke</p>
      </div>

      <div class="section" style="text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%); color: white;">
        <h2 style="margin-top: 0;">Velkommen til universitetet! 📚</h2>
        <p style="margin-bottom: 0;">Mvh,<br><strong>Taj</strong><br>Rektor & Grunnlegger<br>Klarpakke Universitet</p>
      </div>

      <div style="background: #fef3c7; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>PS:</strong> Del med venner! Verveprogrammet gir deg 1 mnd gratis for hver 5 venner som starter Bachelor.</p>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Din tracking-link: <a href="https://www.klarpakke.no/opptak?ref=${studentNummer}" style="color: #92400e;">www.klarpakke.no/opptak?ref=${studentNummer}</a></p>
      </div>
    </div>

    <div class="footer">
      <p>⚠️ Disclaimer: Krypto-trading kan innebære høy risiko. Du kan tape hele investeringen din. Vi er et læringsverktøy, ikke finansrådgiver.</p>
      <p style="margin-top: 20px;">
        Klarpakke Universitet<br>
        <a href="https://www.klarpakke.no" style="color: #3b82f6;">www.klarpakke.no</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json();
    
    // Validate required fields
    if (!body.erfaring || !body.email || !body.laeringsmaal || body.laeringsmaal.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vennligst fyll ut alle påkrevde felt.' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ugyldig email-adresse.' 
      }, { status: 400 });
    }
    
    // Count current students
    const { count, error: countError } = await supabase
      .from('beta_signups')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ 
        success: false, 
        error: 'Kunne ikke sjekke tilgjengelighet. Prøv igjen.' 
      }, { status: 500 });
    }
    
    const studentNummer = (count || 0) + 1;
    
    if (studentNummer > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dessverre er alle 100 plasser fylt!' 
      }, { status: 400 });
    }
    
    // Check if email already exists
    const { data: existing } = await supabase
      .from('beta_signups')
      .select('email')
      .eq('email', body.email)
      .single();
    
    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Denne email-adressen er allerede registrert.' 
      }, { status: 400 });
    }
    
    // Insert to database
    const { data, error } = await supabase
      .from('beta_signups')
      .insert([{
        student_nummer: studentNummer,
        erfaring: body.erfaring,
        laeringsmaal: body.laeringsmaal,
        email: body.email,
        handle: body.handle || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Kunne ikke lagre registrering. Prøv igjen.' 
      }, { status: 500 });
    }
    
    // Send welcome email (don't await - let it happen in background)
    sendWelcomeEmail(body.email, studentNummer).catch(console.error);
    
    return NextResponse.json({ 
      success: true, 
      studentNummer,
      data 
    });
    
  } catch (error) {
    console.error('Beta signup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'En feil oppstod. Prøv igjen senere.' 
    }, { status: 500 });
  }
}

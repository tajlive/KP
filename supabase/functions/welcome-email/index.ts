import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const { record } = await req.json();
    const { email, full_name, locale } = record;

    if (!email) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
      });
    }

    // Default to 'en' for "the world", only use 'no' if explicitly set
    const isEnglish = locale !== "no";

    // 1. Add to Resend Audience (Contacts)
    await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        firstName: full_name?.split(" ")[0] || "",
        lastName: full_name?.split(" ").slice(1).join(" ") || "",
        unsubscribed: false,
      }),
    });

    // 2. Send Welcome Email
    const subjects = {
      no: "Velkommen til Klarpakke! 🎓 Din reise mot Master Trader starter her.",
      en: "Welcome to Klarpakke! 🎓 Your journey to Master Trader starts here.",
    };

    const htmlContent = isEnglish
      ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #334155;">
        <h1 style="color: #0052FF;">Hi ${full_name || "there"}!</h1>
        <p>Welcome as a student at Klarpakke. We are incredibly excited to have you on board.</p>
        <p>Klarpakke is a Norwegian company passionate about making crypto trading understandable and safe for everyone. Our goal is to give you the knowledge you need to navigate the market with confidence – risk-free in our simulator.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0;">Your first steps:</h3>
          <ol>
            <li>Log in at <a href="https://www.klarpakke.no/en" style="color: #0052FF; font-weight: bold;">Klarpakke.no</a></li>
            <li>Start your first lesson in the courses portal.</li>
            <li>Try your first trade with 100,000 kr in virtual capital.</li>
          </ol>
        </div>
        <p>Got questions? Just reply to this email, and I will help you personally.</p>
        <p>Best regards,<br><strong>Tom</strong><br>Klarpakke</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          &copy; 2026 Klarpakke. All rights reserved.<br>
          You receive this email because you signed up for Klarpakke.
        </p>
      </div>
    `
      : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #334155;">
        <h1 style="color: #0052FF;">Hei ${full_name || "der"}!</h1>
        <p>Velkommen som student hos Klarpakke. Vi er utrolig glade for å ha deg med på laget.</p>
        <p>Klarpakke er et helnorsk selskap som brenner for å gjøre kryptotrading forståelig og trygt for alle. Vårt mål er å gi deg kunnskapen du trenger for å navigere markedet med selvtillit – helt uten risiko i vår simulator.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0;">Her er dine første steg:</h3>
          <ol>
            <li>Logg inn på <a href="https://www.klarpakke.no" style="color: #0052FF; font-weight: bold;">Klarpakke.no</a></li>
            <li>Start din første leksjon i kursportalen.</li>
            <li>Prøv din første trade med 100 000 kr i virtuell kapital.</li>
          </ol>
        </div>
        <p>Har du spørsmål? Bare svar på denne e-posten, så hjelper jeg deg personlig.</p>
        <p>Hilsen,<br><strong>Tom</strong><br>Klarpakke</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          &copy; 2026 Klarpakke. Alle rettigheter reservert.<br>
          Du mottar denne e-posten fordi du har registrert deg hos Klarpakke.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // IMPORTANT: Must be a verified domain in Resend.
        // Use 'onboarding@resend.dev' for sandbox testing.
        from: "Klarpakke <post@klarpakke.no>",
        to: [email],
        subject: isEnglish ? subjects.en : subjects.no,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Klarpakke Branded Email Templates
 * Premium HTML templates for transactional and engagement emails.
 * Uses a deep blue/slate theme matching the Klarpakke brand.
 */

export const BRAND_COLORS = {
  primary: "#0052FF",
  bg: "#f8fafc",
  text: "#1e293b",
  border: "#e2e8f0",
  accent: "#3b82f6",
};

const wrapInBaseTemplate = (content: string, preheader: string) => `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klarpakke Notification</title>
  <style>
    body { background-color: ${BRAND_COLORS.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background-color: #ffffff; border-radius: 12px; border: 1px solid ${BRAND_COLORS.border}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { padding: 32px 40px; text-align: center; }
    .content { padding: 0 40px 40px; color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; }
    .footer { padding: 32px; text-align: center; color: #94a3b8; font-size: 12px; }
    .button { display: inline-block; background-color: ${BRAND_COLORS.primary}; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin-top: 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    .badge-success { background-color: #dcfce7; color: #15803d; }
    h1, h2, h3 { color: #0f172a; margin-top: 0; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="https://www.klarpakke.no/logo-blue.png" alt="Klarpakke" width="160" style="display: block; margin: 0 auto;">
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      <p>Klarpakke / Blyt AS © 2026. Alle rettigheter reservert.</p>
      <p>Norge · Oslo</p>
      <p><a href="https://www.klarpakke.no/no/innstillinger" style="color: #94a3b8; text-decoration: underline;">Varslingsinnstillinger</a></p>
    </div>
  </div>
</body>
</html>
`;

export const BrandedTemplates = {
  // 1. Welcome Premium (Welcome + Success)
  welcomePremium: (name: string, tier: string) =>
    wrapInBaseTemplate(
      `
    <div class="badge badge-success">Suksess</div>
    <h1>Velkommen som ${tier}-student! 🎓</h1>
    <p>Hei ${name}, vi er utrolig glade for å ha deg med på VIP-laget.</p>
    <p>Ditt abonnement er nå aktivert, og du har fått full tilgang til alle algoritmene og læringsassistenten i Klarpakke.</p>
    <div style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0;">
      <h3 style="margin-bottom: 12px;">Dine neste steg:</h3>
      <ul style="padding-left: 20px; margin: 0;">
        <li>Fullfør Masterclass-modulen for ${tier}.</li>
        <li>Koble til Kraken API for automatisk trading.</li>
        <li>Bli med i vår lukkede Telegram-kanal.</li>
      </ul>
    </div>
    <a href="https://www.klarpakke.no/no/handel?tab=auto" class="button">Start din første bot</a>
  `,
      `Velkommen som ${tier}-student hos Klarpakke!`,
    ),

  // 2. Payment Failed
  paymentFailed: (name: string) =>
    wrapInBaseTemplate(
      `
    <div class="badge" style="background-color: #fee2e2; color: #b91c1c;">Handling påkrevd</div>
    <h1>Problem med betaling ⚠️</h1>
    <p>Hei ${name}, vi klarte dessverre ikke å fornye abonnementet ditt.</p>
    <p>Dette kan skyldes et utløpt kort eller tekniske problemer hos banken. For å unngå at trading-botene dine stopper, anbefaler vi at du oppdaterer betalingsinformasjonen din med en gang.</p>
    <a href="https://www.klarpakke.no/no/innstillinger" class="button">Oppdater betalingsmetode</a>
    <p style="margin-top: 24px; font-size: 14px; color: #64748b;">Dersom betalingen ikke går gjennom innen 48 timer, vil tilgangen din bli nedgradert til Gratis-planen.</p>
  `,
      "Viktig: Vi klarte ikke å gjennomføre betalingen din.",
    ),

  // 3. Level Up (Gamification)
  levelUp: (name: string, newLevel: number, rank: string) =>
    wrapInBaseTemplate(
      `
    <div class="badge" style="background-color: #fef9c3; color: #854d0e;">Ny Bragd</div>
    <h1>Nivå ${newLevel} Oppnådd! 🏆</h1>
    <p>Solid jobba, ${name}! Du har nå klatret til rangeringen <strong>${rank}</strong>.</p>
    <p>Din aktivitet på plattformen viser at du utvikler deg raskt mot å bli en Master Trader. Vi har lagt til 500 bonus-XP på profilen din som belønning.</p>
    <div style="text-align: center; margin: 32px 0;">
      <span style="font-size: 48px;">🔥</span>
    </div>
    <p>Fortsett den gode stimen og sjekk leaderboardet for å se hvor du ligger an mot de andre studentene.</p>
    <a href="https://www.klarpakke.no/no/leaderboard" class="button">Se Leaderboard</a>
  `,
      `Gratulerer! Du har nådd nivå ${newLevel}!`,
    ),

  // 4. Achievement (Badge Earned)
  achievementEarned: (name: string, achievementName: string) =>
    wrapInBaseTemplate(
      `
    <h1>Du har låst opp en ny badge! 🎖️</h1>
    <p>Hei ${name}, du har nettopp oppnådd: <strong>${achievementName}</strong>.</p>
    <p>Badgen er nå synlig på din offentlige profil på leaderboardet.</p>
    <a href="https://www.klarpakke.no/no/innstillinger" class="button">Se min profil</a>
  `,
      `Ny utmerkelse: ${achievementName}`,
    ),

  // 5. Priority User Invitation
  priorityInvitation: (name: string) =>
    wrapInBaseTemplate(
      `
    <div class="badge" style="background-color: #ede9fe; color: #6d28d9;">Eksklusiv Invitasjon</div>
    <h1>Velkommen til Klarpakke VIP, ${name}! ✨</h1>
    <p>Vi er stolte av å invitere deg til vår mest eksklusive gruppe med tradere.</p>
    <p>Som en prioritert bruker vil du få tilgang til våre mest avanserte verktøy, personlig overvåkning av dine trades, og direkte tilgang til våre nye algoritmer før alle andre.</p>
    <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border: 1px dashed #cbd5e1; margin: 24px 0;">
      <h3 style="margin-bottom: 12px; color: #6d28d9;">Dine VIP-fordeler:</h3>
      <ul style="padding-left: 20px; margin: 0; color: #475569;">
        <li><strong>100% Prioritert overvåkning:</strong> AI-monitoren vår følger dine trades i sanntid.</li>
        <li><strong>Early Access:</strong> Test nye funksjoner 2 uker før lansering.</li>
        <li><strong>Bonus:</strong> Vi har satt inn 5 000 KLT tokens på din konto som velkomstgave.</li>
        <li><strong>Founder-løftet:</strong> De 100 første får gratis tilgang for livet — ingen prøveperiode, ingen skjulte kostnader.</li>
      </ul>
    </div>
    <p>Vi gleder oss til å se din reise mot økonomisk frihet.</p>
    <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til ditt VIP-dashboard</a>
  `,
      "Din personlige invitasjon til Klarpakke VIP",
    ),
};

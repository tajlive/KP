/**
 * Shared Branded Email Templates for Supabase Edge Functions
 */

export const BRAND_COLORS = {
  primary: "#0052FF",
  bg: "#f8fafc",
  text: "#1e293b",
  border: "#e2e8f0",
  accent: "#3b82f6",
};

export function wrapInBaseTemplate(content: string, preheader: string) {
  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klarpakke</title>
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
      <p>Klarpakke © 2026. Alle rettigheter reservert.</p>
    </div>
  </div>
</body>
</html>
`;
}

export const BrandedTemplates = {
  welcomePremium: (name: string, tier: string) => ({
    subject: `🎓 Velkommen som ${tier}-student!`,
    html: wrapInBaseTemplate(
      `
      <div class="badge badge-success">Suksess</div>
      <h1>Velkommen om bord!</h1>
      <p>Hei ${name}, vi er utrolig glade for å ha deg med på VIP-laget.</p>
      <p>Ditt abonnement er nå aktivert som <strong>${tier}</strong>.</p>
      <a href="https://www.klarpakke.no/no/auto-trading" class="button">Start din første bot</a>
    `,
      `Velkommen som ${tier}-student hos Klarpakke!`,
    ),
  }),

  paymentFailed: (name: string) => ({
    subject: `⚠️ Problem med betaling hos Klarpakke`,
    html: wrapInBaseTemplate(
      `
      <div class="badge" style="background-color: #fee2e2; color: #b91c1c;">Handling påkrevd</div>
      <h1>Problem med betaling</h1>
      <p>Hei ${name}, vi klarte dessverre ikke å fornye abonnementet ditt.</p>
      <a href="https://www.klarpakke.no/no/innstillinger/betaling" class="button">Oppdater betaling</a>
    `,
      "Viktig: Vi klarte ikke å gjennomføre betalingen din.",
    ),
  }),

  levelUp: (name: string, level: number, rank: string) => ({
    subject: `🏆 Nivå ${level} oppnådd!`,
    html: wrapInBaseTemplate(
      `
      <h1>Nivå ${level} Oppnådd!</h1>
      <p>Solid jobba, ${name}! Du er nå en <strong>${rank}</strong>.</p>
      <a href="https://www.klarpakke.no/no/leaderboard" class="button">Se Leaderboard</a>
    `,
      `Gratulerer! Du har nådd nivå ${level}!`,
    ),
  }),
};

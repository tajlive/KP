/**
 * KLA-31: Automated Emails - Unified Email Service
 *
 * This module provides a centralized email service for all transactional
 * and engagement emails in Klarpakke.
 *
 * Features:
 * - Branded HTML templates for all email types
 * - Email preference checking before sending
 * - Queue integration for async processing
 * - Comprehensive logging
 */

import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY mangler");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

const FROM_EMAIL = "Klarpakke <post@klarpakke.no>";
const REPLY_TO = "post@klarpakke.no";

// Email types that require user consent
export type EmailType =
  | "welcome"
  | "subscription_welcome"
  | "payment_failed"
  | "payment_succeeded"
  | "subscription_cancelled"
  | "subscription_expiring"
  | "level_up"
  | "achievement_unlocked"
  | "leaderboard_climb"
  | "trade_executed"
  | "daily_digest"
  | "weekly_digest"
  | "password_reset"
  | "email_verification"
  | "marketing"
  | "circuit_breaker"
  | "priority_invitation";

// Email preferences mapping
interface EmailPreferences {
  user_id: string;
  marketing_emails: boolean;
  transaction_emails: boolean;
  gamification_emails: boolean;
  trading_alerts: boolean;
  digest_emails: "daily" | "weekly" | "never";
  updated_at: string;
}

/**
 * Check if user has opted in to receive a specific email type
 */
async function shouldSendEmail(
  userId: string,
  type: EmailType,
): Promise<boolean> {
  // Transactional emails are always sent
  const transactionalTypes: EmailType[] = [
    "welcome",
    "password_reset",
    "email_verification",
    "payment_failed",
    "subscription_expiring",
    "circuit_breaker",
  ];

  if (transactionalTypes.includes(type)) {
    return true;
  }

  try {
    const supabase = createClient();
    const { data: prefs } = await supabase
      .from("email_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!prefs) {
      // Default to sending if no preferences set
      return true;
    }

    switch (type) {
      case "marketing":
        return prefs.marketing_emails ?? false;
      case "level_up":
      case "achievement_unlocked":
      case "leaderboard_climb":
        return prefs.gamification_emails ?? false;
      case "trade_executed":
      case "circuit_breaker":
        return prefs.trading_alerts ?? false;
      case "daily_digest":
        return prefs.digest_emails === "daily";
      case "weekly_digest":
        return (
          prefs.digest_emails === "weekly" || prefs.digest_emails === "daily"
        );
      default:
        return true;
    }
  } catch (error) {
    console.error("[Email] Error checking preferences:", error);
    // Default to sending on error (fail open for transactional)
    return transactionalTypes.includes(type);
  }
}

/**
 * Get user email and name
 */
async function getUserInfo(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  try {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      // Fallback: get email from auth
      const {
        data: { user },
      } = await supabase.auth.admin.getUserById(userId);
      if (!user?.email) return null;

      return {
        email: user.email,
        name: profile?.full_name || user.email.split("@")[0],
      };
    }

    return {
      email: profile.email,
      name: profile.full_name || profile.email.split("@")[0],
    };
  } catch (error) {
    console.error("[Email] Error getting user info:", error);
    return null;
  }
}

/**
 * Base email wrapper with Klarpakke branding
 */
function wrapEmail(content: string, preheader: string): string {
  return `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klarpakke</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { 
      background-color: #0f172a; 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 0; 
      -webkit-font-smoothing: antialiased; 
    }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { 
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); 
      border-radius: 16px; 
      border: 1px solid #334155;
      overflow: hidden;
    }
    .header { 
      padding: 40px; 
      text-align: center; 
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 40px; color: #e2e8f0; font-size: 16px; line-height: 1.6; }
    .content h2 { color: #f8fafc; margin-top: 0; }
    .footer { 
      padding: 32px; 
      text-align: center; 
      color: #64748b; 
      font-size: 12px;
      border-top: 1px solid #334155;
    }
    .button { 
      display: inline-block; 
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
      color: #ffffff !important; 
      font-weight: 600; 
      text-decoration: none; 
      padding: 14px 32px; 
      border-radius: 8px; 
      margin-top: 24px; 
    }
    .badge { 
      display: inline-block; 
      padding: 6px 16px; 
      border-radius: 9999px; 
      font-size: 12px; 
      font-weight: 600; 
      text-transform: uppercase; 
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }
    .badge-success { background-color: #166534; color: #86efac; }
    .badge-warning { background-color: #92400e; color: #fcd34d; }
    .badge-info { background-color: #1e40af; color: #93c5fd; }
    .stats { background: rgba(51, 65, 85, 0.5); padding: 24px; border-radius: 12px; margin: 24px 0; }
    .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #475569; }
    .stat-row:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <img src="https://www.klarpakke.no/logo-white.png" alt="Klarpakke" width="180" style="display: block; margin: 0 auto 16px;">
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      <p><strong>Klarpakke</strong> © 2026</p>
      <p>Stortingsgata 30, 0161 Oslo, Norge</p>
      <p style="margin-top: 16px;">
        <a href="https://www.klarpakke.no/no/innstillinger" style="color: #64748b; text-decoration: underline;">Varslingsinnstillinger</a> • 
        <a href="https://www.klarpakke.no/no/kontakt" style="color: #64748b; text-decoration: underline;">Kontakt oss</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const templates = {
  welcome: (name: string) => ({
    subject: "Velkommen til Klarpakke! 🚀",
    html: wrapEmail(
      `
      <h2>Hei ${name}!</h2>
      <p>Velkommen til Norges ledende plattform for krypto-trading utdanning. Vi er superglade for å ha deg med!</p>
      <div class="stats">
        <p><strong>🎯 Dine første steg:</strong></p>
        <ol style="padding-left: 20px;">
          <li>Fullfør onboarding-modulen</li>
          <li>Utforsk Trading Skolen</li>
          <li>Prøv Paper Trading (risikofritt!)</li>
          <li>Koble til Kraken når du er klar</li>
        </ol>
      </div>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til Dashboard</a>
    `,
      "Velkommen til Klarpakke - Din trading-reise starter her!",
    ),
  }),

  subscriptionWelcome: (name: string, tier: string) => ({
    subject: `Velkommen som ${tier}-student! 🎓`,
    html: wrapEmail(
      `
      <div class="badge badge-success">Abonnement Aktivert</div>
      <h2>Hei ${name}!</h2>
      <p>Takk for at du ble medlem av Klarpakke. Ditt <strong>${tier}</strong>-abonnement er nå aktivt!</p>
      <div class="stats">
        <p><strong>🎁 Dette får du nå:</strong></p>
        <ul style="padding-left: 20px;">
          <li>Full tilgang til alle trading-kurs</li>
          <li>AI-drevne trading-signaler</li>
          <li>Automatisk paper trading</li>
          <li>Live trading (når du kobler til Kraken)</li>
          <li>Eksklusiv Discord/Telegram tilgang</li>
        </ul>
      </div>
      <a href="https://www.klarpakke.no/no/handel?tab=auto" class="button">Start Din Første Bot</a>
    `,
      `Velkommen som ${tier}-student - Ditt abonnement er aktivt!`,
    ),
  }),

  paymentFailed: (name: string, updateUrl: string) => ({
    subject: "Betaling mislyktes - Handling påkrevd ⚠️",
    html: wrapEmail(
      `
      <div class="badge badge-warning">Handling Påkrevd</div>
      <h2>Hei ${name}!</h2>
      <p>Vi kunne dessverre ikke trekke betalingen for ditt Klarpakke-abonnement.</p>
      <div class="stats">
        <p><strong>🚨 Hva skjer nå?</strong></p>
        <ul style="padding-left: 20px;">
          <li>Din tilgang fortsetter i 48 timer</li>
          <li>Etter det nedgraderes kontoen til Gratis</li>
          <li>Botene dine vil stoppe</li>
        </ul>
      </div>
      <p>Oppdater betalingsinformasjonen din for å unngå avbrudd:</p>
      <a href="${updateUrl}" class="button" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">Oppdater Betalingsmåte</a>
    `,
      "Viktig: Oppdater dine betalingsopplysninger for å fortsette",
    ),
  }),

  paymentSucceeded: (name: string, amount: string, nextBilling: string) => ({
    subject: "Betaling bekreftet ✅",
    html: wrapEmail(
      `
      <div class="badge badge-success">Betaling Vellykket</div>
      <h2>Takk, ${name}!</h2>
      <p>Din betaling på <strong>${amount}</strong> er mottatt og bekreftet.</p>
      <div class="stats">
        <div class="stat-row">
          <span>Beløp:</span>
          <span style="font-weight: 600;">${amount}</span>
        </div>
        <div class="stat-row">
          <span>Neste fakturering:</span>
          <span style="font-weight: 600;">${nextBilling}</span>
        </div>
      </div>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til Dashboard</a>
    `,
      "Din betaling er bekreftet - Takk for at du er med!",
    ),
  }),

  subscriptionCancelled: (name: string, endDate: string) => ({
    subject: "Abonnement kansellert",
    html: wrapEmail(
      `
      <h2>Hei ${name}</h2>
      <p>Ditt Klarpakke-abonnement er nå kansellert.</p>
      <div class="stats">
        <p><strong>📅 Viktig informasjon:</strong></p>
        <ul style="padding-left: 20px;">
          <li>Tilgangen din fortsetter til: <strong>${endDate}</strong></li>
          <li>Etter dette nedgraderes du til Gratis-planen</li>
          <li>Vi håper å se deg igjen!</li>
        </ul>
      </div>
      <p>Endret du mening? Du kan reaktivere abonnementet når som helst.</p>
      <a href="https://www.klarpakke.no/no/priser" class="button">Se Priser</a>
    `,
      "Ditt abonnement er kansellert - Tilgangen din fortsetter til periodens slutt",
    ),
  }),

  levelUp: (
    name: string,
    oldLevel: number,
    newLevel: number,
    totalXp: number,
  ) => {
    const getRank = (level: number): string => {
      if (level >= 25) return "🏆 Legend";
      if (level >= 20) return "💎 Master Trader";
      if (level >= 15) return "🥇 Expert Trader";
      if (level >= 10) return "🥈 Advanced Trader";
      if (level >= 5) return "🥉 Intermediate";
      return "📚 Beginner";
    };

    return {
      subject: `🎉 LEVEL UP! Du er nå Level ${newLevel}!`,
      html: wrapEmail(
        `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 64px; margin-bottom: 16px;">🎊</div>
          <h2 style="color: #fbbf24; margin-bottom: 8px;">GRATULERER!</h2>
        </div>
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">LEVEL ${oldLevel} → LEVEL ${newLevel}</div>
          <div style="font-size: 48px; font-weight: bold; margin-bottom: 8px;">${newLevel}</div>
          <div style="font-size: 16px; opacity: 0.9;">${getRank(newLevel)}</div>
        </div>
        <p style="text-align: center;">Du har oppnådd <strong>${totalXp.toLocaleString("no-NO")} XP</strong> totalt.</p>
        <div style="text-align: center;">
          <a href="https://www.klarpakke.no/no/leaderboard" class="button">Se Leaderboard</a>
        </div>
      `,
        `Gratulerer! Du har nådd Level ${newLevel}!`,
      ),
    };
  },

  achievementUnlocked: (
    name: string,
    badgeName: string,
    badgeIcon: string,
  ) => ({
    subject: `Ny badge opplåst: ${badgeName}! 🎖️`,
    html: wrapEmail(
      `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 64px; margin-bottom: 16px;">${badgeIcon}</div>
        <h2>Ny Badge!</h2>
      </div>
      <p style="text-align: center;">Gratulerer, ${name}!</p>
      <p style="text-align: center; font-size: 24px; font-weight: bold; color: #fbbf24;">${badgeName}</p>
      <p style="text-align: center;">Badgen er nå synlig på din offentlige profil.</p>
      <div style="text-align: center;">
        <a href="https://www.klarpakke.no/no/innstillinger" class="button">Se Min Profil</a>
      </div>
    `,
      `Gratulerer! Du har låst opp ${badgeName}!`,
    ),
  }),

  leaderboardClimb: (
    name: string,
    climb: number,
    newRank: number,
    period: string,
  ) => {
    const periodText: { [key: string]: string } = {
      daily: "daglige",
      weekly: "ukentlige",
      monthly: "månedlige",
      all_time: "totale",
    };

    return {
      subject: `🚀 Du klatret ${climb} plasser på leaderboardet!`,
      html: wrapEmail(
        `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 64px; margin-bottom: 16px;">🚀</div>
          <h2 style="color: #fbbf24;">WOW!</h2>
        </div>
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">OPP ${climb} PLASSER</div>
          <div style="font-size: 48px; font-weight: bold; margin-bottom: 8px;">#${newRank}</div>
          <div style="font-size: 16px; opacity: 0.9;">${periodText[period] || period} leaderboard</div>
        </div>
        <p style="text-align: center;">Fortsett slik! Kanskje du når toppen snart? 👑</p>
        <div style="text-align: center;">
          <a href="https://www.klarpakke.no/no/leaderboard" class="button">Se Leaderboard</a>
        </div>
      `,
        `Du klatret ${climb} plasser på ${periodText[period]} leaderboardet!`,
      ),
    };
  },

  tradeExecuted: (
    name: string,
    side: string,
    pair: string,
    amount: string,
    price: string,
    pnl?: string,
  ) => ({
    subject: `📈 Trade utført: ${side.toUpperCase()} ${pair}`,
    html: wrapEmail(
      `
      <div class="badge badge-info">Trade Utført</div>
      <h2>Hei ${name}!</h2>
      <p>Boten din har nettopp utført en trade:</p>
      <div class="stats">
        <div class="stat-row">
          <span>Side:</span>
          <span style="font-weight: 600; color: ${side === "buy" ? "#4ade80" : "#f87171"};">${side.toUpperCase()}</span>
        </div>
        <div class="stat-row">
          <span>Par:</span>
          <span style="font-weight: 600;">${pair}</span>
        </div>
        <div class="stat-row">
          <span>Mengde:</span>
          <span style="font-weight: 600;">${amount}</span>
        </div>
        <div class="stat-row">
          <span>Pris:</span>
          <span style="font-weight: 600;">${price}</span>
        </div>
        ${
          pnl
            ? `
        <div class="stat-row">
          <span>P&L:</span>
          <span style="font-weight: 600; color: ${pnl.startsWith("-") ? "#f87171" : "#4ade80"};">${pnl}</span>
        </div>
        `
            : ""
        }
      </div>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Se Dashboard</a>
    `,
      `Trade utført: ${side.toUpperCase()} ${pair} @ ${price}`,
    ),
  }),

  circuitBreaker: (
    name: string,
    drawdown: string,
    sessionsStopped: number,
    portfolioValue: string,
    restartUrl: string,
  ) => ({
    subject: "⚠️ Trading stoppet: Portfolio drawdown",
    html: wrapEmail(
      `
      <div class="badge badge-warning">Circuit Breaker</div>
      <h2>Hei ${name}!</h2>
      <p>Alle dine trading-sessions er midlertidig stoppet av sikkerhetssystemet.</p>
      <div class="stats">
        <div class="stat-row">
          <span>Portfolio drawdown:</span>
          <span style="font-weight: 600; color: #f87171;">${drawdown}</span>
        </div>
        <div class="stat-row">
          <span>Sessioner stoppet:</span>
          <span style="font-weight: 600;">${sessionsStopped}</span>
        </div>
        <div class="stat-row">
          <span>Sesjonsverdi (lekepenger):</span>
          <span style="font-weight: 600;">${portfolioValue}</span>
        </div>
      </div>
      <p style="margin-top: 20px; color: #94a3b8;">
        Dette er en sikkerhetsmekanisme som stopper trading når porteføljen din har falt betydelig.
        Du kan restarte trading når som helst ved å trykke på knappen nedenfor.
      </p>
      <a href="${restartUrl}" class="button">Restart Trading</a>
      <p style="font-size: 14px; color: #94a3b8; margin-top: 24px;">
        Har du spørsmål? Kontakt post@klarpakke.no
      </p>
    `,
      `Trading stoppet: Portfolio drawdown ${drawdown}`,
    ),
  }),

  dailyDigest: (name: string, trades: number, pnl: string, winRate: string) => {
    const isPositive = !pnl.startsWith("-");
    return {
      subject: `📊 Daglig oppsummering: ${isPositive ? "+" : ""}${pnl}`,
      html: wrapEmail(
        `
        <h2>Daglig oppsummering, ${name}</h2>
        <p>Her er din trading-statistikk for i dag:</p>
        <div class="stats">
          <div class="stat-row">
            <span>Trades:</span>
            <span style="font-weight: 600;">${trades}</span>
          </div>
          <div class="stat-row">
            <span>Total P&L:</span>
            <span style="font-weight: 600; color: ${isPositive ? "#4ade80" : "#f87171"};">${pnl}</span>
          </div>
          <div class="stat-row">
            <span>Win Rate:</span>
            <span style="font-weight: 600;">${winRate}</span>
          </div>
        </div>
        <a href="https://www.klarpakke.no/no/dashboard" class="button">Se Detaljer</a>
      `,
        `Daglig oppsummering: ${trades} trades, P&L ${pnl}`,
      ),
    };
  },

  passwordReset: (name: string, resetUrl: string) => ({
    subject: "Tilbakestill passord 🔐",
    html: wrapEmail(
      `
      <h2>Hei ${name}!</h2>
      <p>Vi mottok en forespørsel om å tilbakestille passordet ditt.</p>
      <p>Klikk på knappen nedenfor for å velge et nytt passord:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Tilbakestill Passord</a>
      </div>
      <p style="font-size: 14px; color: #94a3b8; margin-top: 24px;">Lenken er gyldig i 1 time. Hvis du ikke ba om dette, kan du ignorere denne emailen.</p>
    `,
      "Tilbakestill ditt Klarpakke-passord",
    ),
  }),

  emailVerification: (name: string, verifyUrl: string) => ({
    subject: "Bekreft email-adressen din ✉️",
    html: wrapEmail(
      `
      <h2>Hei ${name}!</h2>
      <p>Takk for at du registrerte deg hos Klarpakke. Bekreft email-adressen din for å komme i gang:</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="button">Bekreft Email</a>
      </div>
      <p style="font-size: 14px; color: #94a3b8; margin-top: 24px;">Lenken er gyldig i 24 timer.</p>
    `,
      "Bekreft din email-adresse for Klarpakke",
    ),
  }),
  priorityInvitation: (name: string) => ({
    subject: "Din personlige invitasjon til Klarpakke VIP ✨",
    html: wrapEmail(
      `
      <div class="badge badge-info">Eksklusiv Invitasjon</div>
      <h2>Velkommen til Klarpakke VIP, ${name}!</h2>
      <p>Vi er stolte av å invitere deg til vår mest eksklusive gruppe med tradere.</p>
      <div class="stats">
        <p><strong>💎 Dine VIP-fordeler:</strong></p>
        <ul style="padding-left: 20px;">
          <li><strong>100% Prioritert overvåkning:</strong> AI-monitoren følger dine trades.</li>
          <li><strong>Early Access:</strong> Test nye funksjoner før alle andre.</li>
          <li><strong>Bonus:</strong> 5 000 KLT tokens velkomstgave.</li>
          <li><strong>Founder-løftet:</strong> De 100 første får gratis tilgang for livet — ingen prøveperiode, ingen skjulte kostnader.</li>
        </ul>
      </div>
      <p>Vi gleder oss til å se din reise mot økonomisk frihet.</p>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til ditt VIP-dashboard</a>
    `,
      "Din personlige invitasjon til Klarpakke VIP - Bli med nå!",
    ),
  }),
};

// ============================================================================
// PUBLIC API
// ============================================================================

interface SendEmailOptions {
  userId: string;
  type: EmailType;
  data: Record<string, string | number | boolean>;
  skipPreferences?: boolean;
}

/**
 * Send an email to a user
 */
export async function sendTemplatedEmail(
  options: SendEmailOptions,
): Promise<{ success: boolean; error?: string }> {
  const { userId, type, data, skipPreferences = false } = options;

  try {
    // Check preferences (unless skipped)
    if (!skipPreferences) {
      const shouldSend = await shouldSendEmail(userId, type);
      if (!shouldSend) {
        return { success: true };
      }
    }

    // Get user info
    const user = await getUserInfo(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Generate email content
    let email: { subject: string; html: string };

    switch (type) {
      case "welcome":
        email = templates.welcome((data.name as string) || user.name);
        break;
      case "subscription_welcome":
        email = templates.subscriptionWelcome(
          (data.name as string) || user.name,
          data.tier as string,
        );
        break;
      case "payment_failed":
        email = templates.paymentFailed(
          (data.name as string) || user.name,
          data.updateUrl as string,
        );
        break;
      case "payment_succeeded":
        email = templates.paymentSucceeded(
          (data.name as string) || user.name,
          data.amount as string,
          data.nextBilling as string,
        );
        break;
      case "subscription_cancelled":
        email = templates.subscriptionCancelled(
          (data.name as string) || user.name,
          data.endDate as string,
        );
        break;
      case "level_up":
        email = templates.levelUp(
          (data.name as string) || user.name,
          data.oldLevel as number,
          data.newLevel as number,
          data.totalXp as number,
        );
        break;
      case "achievement_unlocked":
        email = templates.achievementUnlocked(
          (data.name as string) || user.name,
          data.badgeName as string,
          data.badgeIcon as string,
        );
        break;
      case "leaderboard_climb":
        email = templates.leaderboardClimb(
          (data.name as string) || user.name,
          data.climb as number,
          data.newRank as number,
          data.period as string,
        );
        break;
      case "trade_executed":
        email = templates.tradeExecuted(
          (data.name as string) || user.name,
          data.side as string,
          data.pair as string,
          data.amount as string,
          data.price as string,
          data.pnl as string,
        );
        break;
      case "circuit_breaker":
        email = templates.circuitBreaker(
          (data.name as string) || user.name,
          data.drawdown as string,
          data.sessionsStopped as number,
          data.portfolioValue as string,
          data.restartUrl as string,
        );
        break;
      case "daily_digest":
        email = templates.dailyDigest(
          (data.name as string) || user.name,
          data.trades as number,
          data.pnl as string,
          data.winRate as string,
        );
        break;
      case "password_reset":
        email = templates.passwordReset(
          (data.name as string) || user.name,
          data.resetUrl as string,
        );
        break;
      case "email_verification":
        email = templates.emailVerification(
          (data.name as string) || user.name,
          data.verifyUrl as string,
        );
        break;
      case "priority_invitation":
        email = templates.priorityInvitation(
          (data.name as string) || user.name,
        );
        break;
      default:
        return { success: false, error: "Unknown email type" };
    }

    // Send email
    const resend = getResendClient();
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: email.subject,
      html: email.html,
      replyTo: REPLY_TO,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("[Email] Unexpected error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Queue an email for async processing
 */
export async function queueEmail(
  options: SendEmailOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from("notification_queue").insert({
      user_id: options.userId,
      type: options.type,
      payload: options.data,
      status: "pending",
    });

    if (error) {
      console.error("[Email] Queue error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("[Email] Queue unexpected error:", error);
    return { success: false, error: String(error) };
  }
}

// Export for external use
export { FROM_EMAIL, REPLY_TO, templates };
export type { EmailPreferences };

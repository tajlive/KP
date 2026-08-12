// ============================================================================
// supabase/functions/send-notifications/index.ts
// KLA-31: Automated Email Processor
// ============================================================================
// Processes the notification_queue and sends branded emails via Resend
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Klarpakke <post@klarpakke.no>';
const REPLY_TO = 'post@klarpakke.no';
const BATCH_SIZE = 10;

// Brand colors
const BRAND_COLORS = {
  primary: '#3b82f6',
  bg: '#0f172a',
  card: '#1e293b',
  text: '#e2e8f0',
  border: '#334155',
};

// Email wrapper with Klarpakke branding
const wrapEmail = (content: string, preheader: string) => `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klarpakke</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { 
      background-color: ${BRAND_COLORS.bg}; 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 0; 
      -webkit-font-smoothing: antialiased; 
    }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { 
      background: linear-gradient(135deg, ${BRAND_COLORS.card} 0%, ${BRAND_COLORS.bg} 100%); 
      border-radius: 16px; 
      border: 1px solid ${BRAND_COLORS.border};
      overflow: hidden;
    }
    .header { 
      padding: 40px; 
      text-align: center; 
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    }
    .content { padding: 40px; color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6; }
    .content h2 { color: #f8fafc; margin-top: 0; }
    .footer { 
      padding: 32px; 
      text-align: center; 
      color: #64748b; 
      font-size: 12px;
      border-top: 1px solid ${BRAND_COLORS.border};
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
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Klarpakke</h1>
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      <p><strong>Klarpakke</strong> © 2026</p>
      <p>Stortingsgata 30, 0161 Oslo, Norge</p>
      <p style="margin-top: 16px;">
        <a href="https://www.klarpakke.no/no/innstillinger" style="color: #64748b;">Varslingsinnstillinger</a> • 
        <a href="https://www.klarpakke.no/no/kontakt" style="color: #64748b;">Kontakt oss</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// Email templates
const templates: Record<string, (data: Record<string, unknown>, name: string) => { subject: string; html: string }> = {
  welcome: (data, name) => ({
    subject: 'Velkommen til Klarpakke! 🚀',
    html: wrapEmail(`
      <h2>Hei ${name}!</h2>
      <p>Velkommen til Norges ledende plattform for krypto-trading utdanning.</p>
      <div class="stats">
        <p><strong>🎯 Dine første steg:</strong></p>
        <ol style="padding-left: 20px;">
          <li>Fullfør onboarding-modulen</li>
          <li>Utforsk Trading Skolen</li>
          <li>Prøv Paper Trading (risikofritt!)</li>
        </ol>
      </div>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til Dashboard</a>
    `, 'Velkommen til Klarpakke'),
  }),

  level_up: (data, name) => {
    const newLevel = data.new_level as number;
    const oldLevel = data.old_level as number;
    const totalXp = data.total_xp as number;
    
    const getRank = (level: number): string => {
      if (level >= 25) return '🏆 Legend';
      if (level >= 20) return '💎 Master';
      if (level >= 15) return '🥇 Expert';
      if (level >= 10) return '🥈 Advanced';
      if (level >= 5) return '🥉 Intermediate';
      return '📚 Beginner';
    };
    
    return {
      subject: `🎉 LEVEL UP! Du er nå Level ${newLevel}!`,
      html: wrapEmail(`
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 64px; margin-bottom: 16px;">🎊</div>
          <h2 style="color: #fbbf24;">GRATULERER!</h2>
        </div>
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 14px; opacity: 0.9;">LEVEL ${oldLevel} → LEVEL ${newLevel}</div>
          <div style="font-size: 48px; font-weight: bold; margin: 8px 0;">${newLevel}</div>
          <div style="font-size: 16px; opacity: 0.9;">${getRank(newLevel)}</div>
        </div>
        <p style="text-align: center;">${totalXp.toLocaleString('no-NO')} XP totalt</p>
        <div style="text-align: center;">
          <a href="https://www.klarpakke.no/no/leaderboard" class="button">Se Leaderboard</a>
        </div>
      `, `Gratulerer! Du har nådd Level ${newLevel}`),
    };
  },

  leaderboard_climb: (data, name) => {
    const climb = data.climb as number;
    const newRank = data.new_rank as number;
    const period = data.time_period as string;
    
    const periodText: Record<string, string> = {
      daily: 'daglige',
      weekly: 'ukentlige',
      monthly: 'månedlige',
      all_time: 'totale',
    };
    
    return {
      subject: `🚀 Du klatret ${climb} plasser på leaderboardet!`,
      html: wrapEmail(`
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 64px; margin-bottom: 16px;">🚀</div>
          <h2 style="color: #fbbf24;">WOW!</h2>
        </div>
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 14px; opacity: 0.9;">OPP ${climb} PLASSER</div>
          <div style="font-size: 48px; font-weight: bold; margin: 8px 0;">#${newRank}</div>
          <div style="font-size: 16px; opacity: 0.9;">${periodText[period] || period} leaderboard</div>
        </div>
        <div style="text-align: center;">
          <a href="https://www.klarpakke.no/no/leaderboard" class="button">Se Leaderboard</a>
        </div>
      `, `Du klatret ${climb} plasser på leaderboardet`),
    };
  },

  trade_executed: (data, name) => ({
    subject: `📈 Trade utført: ${data.side} ${data.pair}`,
    html: wrapEmail(`
      <div class="badge badge-info">Trade Utført</div>
      <h2>Hei ${name}!</h2>
      <p>Boten din har utført en trade:</p>
      <div class="stats">
        <div class="stat-row">
          <span>Par:</span>
          <span style="font-weight: 600;">${data.pair}</span>
        </div>
        <div class="stat-row">
          <span>Side:</span>
          <span style="font-weight: 600;">${data.side}</span>
        </div>
        <div class="stat-row">
          <span>Mengde:</span>
          <span style="font-weight: 600;">${data.quantity}</span>
        </div>
        ${data.realized_pnl ? `
        <div class="stat-row">
          <span>P&L:</span>
          <span style="font-weight: 600;">${data.realized_pnl}</span>
        </div>
        ` : ''}
      </div>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Se Dashboard</a>
    `, `Trade utført: ${data.side} ${data.pair}`),
  }),

  bot_crashed: (data, name) => ({
    subject: data.permanent ? '⛔ Bot stoppet permanent' : '⚠️ Bot krasjet',
    html: wrapEmail(`
      <div class="badge badge-warning">Bot Varsel</div>
      <h2>Hei ${name}!</h2>
      ${data.permanent 
        ? `<p>Boten din har krasjet 5 ganger på rad og er nå <strong>stoppet permanent</strong>.</p>`
        : `<p>Boten din krasjet, men vi prøver å starte den igjen automatisk.</p>`
      }
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Sjekk Status</a>
    `, 'Bot krasjet - Handling påkrevd'),
  }),

  bot_recovered: (data, name) => ({
    subject: '✅ Bot gjenoppstartet',
    html: wrapEmail(`
      <div class="badge badge-success">Bot Online</div>
      <h2>Hei ${name}!</h2>
      <p>Boten din er tilbake online og handler igjen.</p>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Se Dashboard</a>
    `, 'Bot gjenoppstartet'),
  }),

  copy_started: (data, name) => ({
    subject: `🤝 Du følger nå ${data.leader_name}`,
    html: wrapEmail(`
      <h2>Hei ${name}!</h2>
      <p>Du kopierer nå trades fra <strong>${data.leader_name}</strong>.</p>
      <p>Skaleringsfaktor: ${data.scale_factor}x</p>
      <a href="https://www.klarpakke.no/no/dashboard" class="button">Se Copy-Trading</a>
    `, `Du følger nå ${data.leader_name}`),
  }),

  daily_digest: (data, name) => {
    const pnl = Number(data.total_pnl);
    const isPositive = pnl >= 0;
    
    return {
      subject: `📊 Daglig oppsummering: ${isPositive ? '+' : ''}${pnl.toLocaleString('no-NO')} NOK`,
      html: wrapEmail(`
        <h2>Daglig oppsummering, ${name}</h2>
        <div class="stats">
          <div class="stat-row">
            <span>Trades:</span>
            <span style="font-weight: 600;">${data.total_trades}</span>
          </div>
          <div class="stat-row">
            <span>P&L:</span>
            <span style="font-weight: 600; color: ${isPositive ? '#4ade80' : '#f87171'};">
              ${isPositive ? '+' : ''}${pnl.toLocaleString('no-NO')} NOK (${data.pnl_percent}%)
            </span>
          </div>
          <div class="stat-row">
            <span>Win Rate:</span>
            <span style="font-weight: 600;">${data.win_rate}%</span>
          </div>
        </div>
        <a href="https://www.klarpakke.no/no/dashboard" class="button">Se Detaljer</a>
      `, `Daglig oppsummering: ${data.total_trades} trades`),
    };
  },

  subscription_change: (data, name) => {
    const isUpgrade = data.change_type === 'upgrade';
    
    return {
      subject: isUpgrade ? '🎉 Abonnement oppgradert!' : 'Abonnement endret',
      html: wrapEmail(`
        <h2>Hei ${name}!</h2>
        <p>Ditt abonnement har blitt ${isUpgrade ? 'oppgradert' : 'endret'}.</p>
        <div class="stats">
          <div class="stat-row">
            <span>Nytt nivå:</span>
            <span style="font-weight: 600;">${data.new_tier}</span>
          </div>
        </div>
        <a href="https://www.klarpakke.no/no/dashboard" class="button">Gå til Dashboard</a>
      `, `Abonnement ${isUpgrade ? 'oppgradert' : 'endret'}`),
    };
  },
};

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch pending notifications
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*, profiles!user_id(full_name)')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at')
    .limit(BATCH_SIZE);

  if (error || !notifications?.length) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  const results = [];

  for (const notification of notifications) {
    try {
      // Mark as sending
      await supabase
        .from('notification_queue')
        .update({ status: 'sending', attempts: notification.attempts + 1 })
        .eq('id', notification.id);

      // Get user email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(notification.user_id);
      if (!user?.email) {
        await supabase
          .from('notification_queue')
          .update({ status: 'failed', error_message: 'No email found' })
          .eq('id', notification.id);
        continue;
      }

      // Check email preferences
      const { data: prefs } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', notification.user_id)
        .single();

      const shouldSend = checkPreferences(notification.type, prefs);
      if (!shouldSend) {
        await supabase
          .from('notification_queue')
          .update({ status: 'skipped', error_message: 'User preferences' })
          .eq('id', notification.id);
        results.push({ id: notification.id, status: 'skipped' });
        continue;
      }

      // Build email
      const template = templates[notification.type];
      if (!template) {
        throw new Error(`Unknown template: ${notification.type}`);
      }

      const email = template(notification.payload, notification.profiles?.full_name || 'Trader');

      // Send via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [user.email],
          subject: email.subject,
          html: email.html,
          reply_to: REPLY_TO,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend error ${res.status}: ${errorBody}`);
      }

      const resData = await res.json();

      // Mark as sent
      await supabase
        .from('notification_queue')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          resend_id: resData.id,
        })
        .eq('id', notification.id);

      // Log to email_log
      await supabase
        .from('email_log')
        .insert({
          user_id: notification.user_id,
          email_type: notification.type,
          recipient_email: user.email,
          subject: email.subject,
          status: 'sent',
          resend_id: resData.id,
          sent_at: new Date().toISOString(),
        });

      results.push({ id: notification.id, status: 'sent', resend_id: resData.id });

    } catch (err) {
      console.error(`Notification ${notification.id} failed:`, err);
      await supabase
        .from('notification_queue')
        .update({ 
          status: notification.attempts + 1 >= 3 ? 'failed' : 'pending',
          error_message: (err as Error).message,
        })
        .eq('id', notification.id);

      results.push({ id: notification.id, status: 'failed', error: (err as Error).message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

function checkPreferences(type: string, prefs: Record<string, unknown> | null): boolean {
  if (!prefs) return true;
  
  // Transactional emails are always sent
  const transactional = ['welcome', 'password_reset', 'email_verification', 'payment_failed'];
  if (transactional.includes(type)) return true;
  
  switch (type) {
    case 'level_up':
    case 'leaderboard_climb':
      return prefs.gamification_emails !== false;
    case 'trade_executed':
    case 'bot_crashed':
    case 'bot_recovered':
      return prefs.trading_alerts !== false;
    case 'daily_digest':
      return prefs.digest_emails === 'daily' || prefs.digest_emails === 'weekly';
    default:
      return true;
  }
}

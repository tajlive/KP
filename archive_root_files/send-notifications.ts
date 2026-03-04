// ============================================================================
// supabase/functions/send-notifications/index.ts
// NOTIFICATION PROCESSOR — Sends emails via Resend
// ============================================================================
// Triggered by: cron (every 30 seconds) or pg_notify
// Processes the notification_queue table and sends emails.
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'Klarpakke <noreply@klarpakke.no>';
const BATCH_SIZE = 10;

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch pending notifications
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*, user_profiles!user_id(display_name)')
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

      // Build email based on notification type
      const email = buildEmail(notification.type, notification.payload, user.email, notification.user_profiles?.display_name ?? 'Trader');

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
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend error ${res.status}: ${errorBody}`);
      }

      await supabase
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id);

      results.push({ id: notification.id, status: 'sent' });

    } catch (err) {
      console.error(`Notification ${notification.id} failed:`, err);
      await supabase
        .from('notification_queue')
        .update({ 
          status: notification.attempts + 1 >= 3 ? 'failed' : 'pending',
          error_message: (err as Error).message,
        })
        .eq('id', notification.id);

      results.push({ id: notification.id, status: 'failed' });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ============================================================================
// EMAIL TEMPLATES (inline HTML — React Email would be better in production)
// ============================================================================

interface EmailContent {
  subject: string;
  html: string;
}

function buildEmail(type: string, payload: Record<string, unknown>, toEmail: string, displayName: string): EmailContent {
  switch (type) {
    case 'trade_executed':
      return buildTradeEmail(payload, displayName);
    case 'bot_crashed':
      return buildCrashEmail(payload, displayName);
    case 'bot_recovered':
      return buildRecoveryEmail(payload, displayName);
    case 'copy_started':
      return buildCopyStartedEmail(payload, displayName);
    case 'daily_digest':
      return buildDailyDigestEmail(payload, displayName);
    default:
      return { subject: 'Klarpakke Notification', html: `<p>Du har en ny varsling.</p>` };
  }
}

function buildTradeEmail(payload: Record<string, unknown>, name: string): EmailContent {
  const side = payload.side === 'buy' ? 'kjøpte' : 'solgte';
  const quantity = Number(payload.quantity).toFixed(6);
  const price = Number(payload.price).toLocaleString('no-NO');
  const pair = payload.trading_pair as string;
  const isCopy = payload.is_copy ? ' (kopiert trade)' : '';
  const pnl = payload.realized_pnl ? ` | P&L: ${Number(payload.realized_pnl).toLocaleString('no-NO')} NOK` : '';

  return {
    subject: `📈 Trade utført: ${side} ${quantity} ${pair}`,
    html: wrapTemplate(`
      <h2>Hei ${name}! 👋</h2>
      <p>Boten din ${side} <strong>${quantity} ${pair}</strong> til <strong>${price} NOK</strong>${isCopy}.</p>
      ${pnl ? `<p style="color: ${Number(payload.realized_pnl) >= 0 ? '#22c55e' : '#ef4444'}; font-size: 18px; font-weight: bold;">P&L: ${Number(payload.realized_pnl).toLocaleString('no-NO')} NOK</p>` : ''}
      <p><a href="https://klarpakke.no/no/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Se Dashboard →</a></p>
    `),
  };
}

function buildCrashEmail(payload: Record<string, unknown>, name: string): EmailContent {
  const permanent = payload.permanent as boolean;
  return {
    subject: permanent ? '⛔ Bot stoppet permanent' : '⚠️ Bot krasjet — restart startet',
    html: wrapTemplate(`
      <h2>Hei ${name}!</h2>
      ${permanent 
        ? `<p>Boten din har krasjet 5 ganger på rad og er nå <strong>stoppet permanent</strong>.</p>
           <p>Vennligst sjekk strategien din og start på nytt manuelt.</p>`
        : `<p>Boten din krasjet, men vi prøver å starte den opp igjen automatisk.</p>
           <p>Du trenger ikke gjøre noe — vi håndterer dette.</p>`
      }
      <p><a href="https://klarpakke.no/no/dashboard" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Sjekk Status →</a></p>
    `),
  };
}

function buildRecoveryEmail(payload: Record<string, unknown>, name: string): EmailContent {
  return {
    subject: '✅ Bot gjenoppstartet',
    html: wrapTemplate(`
      <h2>Hei ${name}! 🎉</h2>
      <p>Boten din er tilbake online og handler igjen.</p>
      <p>Antall restarter: ${payload.crash_count}</p>
      <p><a href="https://klarpakke.no/no/dashboard" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Se Dashboard →</a></p>
    `),
  };
}

function buildCopyStartedEmail(payload: Record<string, unknown>, name: string): EmailContent {
  return {
    subject: `🤝 Du følger nå ${payload.leader_name}`,
    html: wrapTemplate(`
      <h2>Hei ${name}!</h2>
      <p>Du kopierer nå trades fra <strong>${payload.leader_name}</strong>.</p>
      <p>Skaleringsfaktor: ${payload.scale_factor}x</p>
      <p>Neste gang ${payload.leader_name} handler, vil du automatisk kopiere traden skalert til din kapital.</p>
      <p><a href="https://klarpakke.no/no/dashboard" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Se Copy-Trading →</a></p>
    `),
  };
}

function buildDailyDigestEmail(payload: Record<string, unknown>, name: string): EmailContent {
  const trades = payload.total_trades as number;
  const pnl = Number(payload.total_pnl).toLocaleString('no-NO');
  const pnlPct = payload.pnl_percent as number;
  const isPositive = Number(payload.total_pnl) >= 0;

  return {
    subject: `📊 Daglig oppsummering: ${isPositive ? '+' : ''}${pnlPct}% i dag`,
    html: wrapTemplate(`
      <h2>Daglig oppsummering for ${name}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Trades i dag</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${trades}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Total P&L</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${isPositive ? '#22c55e' : '#ef4444'};">${pnl} NOK (${isPositive ? '+' : ''}${pnlPct}%)</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Win Rate</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${payload.win_rate}%</td>
        </tr>
      </table>
      <p style="margin-top: 24px;"><a href="https://klarpakke.no/no/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Se Full Rapport →</a></p>
    `),
  };
}

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${content}
    </div>
    <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
      <p>Klarpakke · Norges #1 krypto trading-plattform</p>
      <p><a href="https://klarpakke.no/no/innstillinger" style="color: #9ca3af;">Endre varslinger</a></p>
    </div>
  </div>
</body>
</html>`;
}

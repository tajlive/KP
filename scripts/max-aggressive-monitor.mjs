#!/usr/bin/env node
/**
 * MAX AGGRESSIVE OVERVÅKNING — 5x Leveraged Grid SOL
 * 
 * Kjører hver 15. minutt. Discord-rapport hver kjøring; Linear-issue KUN ved
 * alert (kill switch / feil) — fingerprint-dedup, Arch alert-format (KLA-279).
 * 
 * Bruk: node scripts/max-aggressive-monitor.mjs
 * Cron: hvert 15. minutt (0,15,30,45)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Last .env.local eksplisitt
import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OKX_API_KEY = process.env.OKX_API_KEY;
const OKX_SECRET = process.env.OKX_SECRET_KEY;
const OKX_PASSPHRASE = process.env.OKX_PASSPHRASE;
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

// Linear-konstanter (KLA-team + incident-label)
const LINEAR_TEAM_ID = 'a2b657ba-6d13-48b0-8570-25cbcb69f9c4';
const LINEAR_LABEL_INCIDENT = 'f3469fde-fcfc-440e-b463-7c23b34684a3';
const LINEAR_LABEL_P0 = '8a58eb7b-5a16-40ac-83f1-9f0484cc207b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// OKX API-signering
function signOKX(timestamp, method, path, body = '') {
  const message = timestamp + method + path + body;
  return crypto.createHmac('sha256', OKX_SECRET).update(message).digest('base64');
}

// Hent OKX posisjon
async function getOKXPosition() {
  const timestamp = new Date().toISOString();
  const path = '/api/v5/account/positions';
  const signature = signOKX(timestamp, 'GET', path);
  
  const res = await fetch(`https://eea.okx.com${path}`, {
    headers: {
      'OK-ACCESS-KEY': OKX_API_KEY,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
    },
  });
  
  return res.json();
}

// Hent OKX balanse
async function getOKXBalance() {
  const timestamp = new Date().toISOString();
  const path = '/api/v5/account/balance';
  const signature = signOKX(timestamp, 'GET', path);
  
  const res = await fetch(`https://eea.okx.com${path}`, {
    headers: {
      'OK-ACCESS-KEY': OKX_API_KEY,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': OKX_PASSPHRASE,
    },
  });
  
  return res.json();
}

// Beregn daglig P&L
function calculateDailyPnl(trades) {
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.timestamp?.startsWith(today));
  return todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
}

// Post alert til Linear (KLA-279: erstatter Trello-kort). Kun ved data.alert.
// Fingerprint-dedup mot ÅPNE issues — samme alert = samme issue, ingen spam.
async function postLinearAlert(data) {
  if (!data.alert) return;
  if (!LINEAR_API_KEY) {
    console.error('[linear-alert] LINEAR_API_KEY mangler i env — alert droppet (fail-safe)');
    return;
  }

  const type = data.kill_switch ? 'kill-switch' : 'monitor-error';
  const fingerprint = `max-aggressive:${type}`;
  const severity = data.kill_switch ? 'critical' : 'warning';
  const priority = data.kill_switch ? 1 : 2;

  const gql = async (query, variables) => {
    const body = { query };
    if (variables !== undefined) body.variables = variables;
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Linear API ${res.status}`);
    return res.json();
  };

  try {
    // Dedup: kun ÅPNE issues med samme fingerprint teller.
    const existing = await gql(
      `{ issues(filter: { description: { contains: "${fingerprint}" }, state: { type: { neq: "completed" } } }) { nodes { id } } }`
    );
    if (existing?.data?.issues?.nodes?.length) {
      console.log(`[linear-alert] Issue finnes allerede (${fingerprint}) — ingen duplikat`);
      return;
    }

    const title = data.kill_switch
      ? '⚠️ MAX AGGRESSIVE: KILL SWITCH AKTIVERT (3% daglig tap)'
      : '🔴 MAX AGGRESSIVE: overvåkningsfeil';

    const desc = [
      `**Tid:** ${new Date().toISOString()}`,
      `**Symbol:** SOL`,
      `**Leverage:** ${data.leverage}x`,
      `**Daglig P&L:** ${data.daily_pnl}%`,
      `**Trades i dag:** ${data.trades_today}`,
      `**Liquidation-avstand:** ${data.liquidation_distance}%`,
      `**Kill switch:** ${data.kill_switch ? '🔴 AKTIV' : '🟢 OK'}`,
      `**Saldo:** ${data.balance} USDT`,
      '',
      data.notes || '',
      '',
      `<!--arch-alert`,
      `fingerprint: ${fingerprint}`,
      `source: monitor:max-aggressive`,
      `severity: ${severity}`,
      `-->`,
    ].join('\n');

    const res = await gql(
      'mutation CreateIncident($input: IssueCreateInput!) { issueCreate(input: $input) { issue { identifier } } }',
      {
        input: {
          teamId: LINEAR_TEAM_ID,
          title,
          description: desc,
          labelIds: data.kill_switch ? [LINEAR_LABEL_INCIDENT, LINEAR_LABEL_P0] : [LINEAR_LABEL_INCIDENT],
          priority,
        },
      }
    );
    const ident = res?.data?.issueCreate?.issue?.identifier;
    if (!ident) {
      console.error('[linear-alert] Issue-opprettelse feilet (fail-safe: monitor fortsetter)');
    } else {
      console.log(`[linear-alert] Issue opprettet: ${ident}`);
    }
  } catch (e) {
    console.error(`[linear-alert] Feil: ${e.message} (fail-safe: monitor fortsetter)`);
  }
}

// Send rapport til Discord
async function sendDiscordReport(data) {
  if (!DISCORD_WEBHOOK) return;
  
  const color = data.daily_pnl >= 0 ? 0x00ff00 : 0xff0000;
  
  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `📊 Max Aggressive ${data.status}`,
        color,
        fields: [
          { name: 'Daglig P&L', value: `${data.daily_pnl}%`, inline: true },
          { name: 'Leverage', value: `${data.leverage}x`, inline: true },
          { name: 'Trades', value: `${data.trades_today}`, inline: true },
          { name: 'Saldo', value: `${data.balance} USDT`, inline: true },
          { name: 'Kill Switch', value: data.kill_switch ? '🔴 AKTIV' : '🟢 OK', inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  });
}

// Hovedfunksjon
async function main() {
  console.log('🔍 Max Aggressive Overvåkning —', new Date().toISOString());
  
  try {
    // Hent data
    const [position, balance] = await Promise.all([
      getOKXPosition(),
      getOKXBalance(),
    ]);
    
    // Hent trades fra Supabase
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    // Beregn metrics
    const dailyPnl = calculateDailyPnl(trades || []);
    const positions = position.data?.[0]?.pos || '0';
    const liquidationPrice = position.data?.[0]?.liqPx || null;
    const currentPrice = 150; // TODO: Hent fra market data
    const liquidationDistance = liquidationPrice 
      ? Math.abs(currentPrice - liquidationPrice) / currentPrice * 100 
      : null;
    
    const availBal = balance.data?.[0]?.details?.[0]?.availBal || '0';
    
    const report = {
      status: dailyPnl >= 0 ? '🟢 PROFIT' : '🔴 TAP',
      daily_pnl: dailyPnl.toFixed(2),
      leverage: 5,
      trades_today: trades?.filter(t => t.timestamp?.startsWith(new Date().toISOString().split('T')[0])).length || 0,
      liquidation_distance: liquidationDistance?.toFixed(2) || 'N/A',
      kill_switch: dailyPnl <= -3,
      alert: dailyPnl <= -3,
      balance: availBal,
      positions,
      notes: dailyPnl <= -3 ? '⚠️ KILL SWITCH AKTIVERT — 3% daglig tap' : '',
    };
    
    console.log('📊 Rapport:', report);
    
    // Send rapporter (Discord hver kjøring; Linear kun ved alert)
    await Promise.all([
      postLinearAlert(report),
      sendDiscordReport(report),
    ]);
    
    console.log('✅ Rapporter sendt');
    
    // Logg til Supabase
    await supabase.from('monitoring_logs').insert({
      type: 'max_aggressive',
      data: report,
      created_at: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Feil:', error);
    
    // Send feil-alert (Linear) — Discord ikke relevant ved monitor-krasj
    await postLinearAlert({
      status: '🔴 FEIL',
      daily_pnl: 'N/A',
      leverage: 5,
      trades_today: 0,
      liquidation_distance: 'N/A',
      kill_switch: false,
      alert: true,
      balance: 'N/A',
      notes: `Feil: ${error.message}`,
    });
  }
}

main();

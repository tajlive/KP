#!/usr/bin/env node
/**
 * MAX AGGRESSIVE OVERVÅKNING — 5x Leveraged Grid SOL
 * 
 * Kjører hver 15. minutt. Rapporterer til Trello + Discord.
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
const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

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

// Send rapport til Trello
async function sendTrelloReport(data) {
  const listId = '6a77a7b720d121385c010083'; // 🚨 Varsler
  
  const card = {
    name: `📊 Max Aggressive ${data.status} — ${data.daily_pnl}% P&L`,
    desc: `
**Tid:** ${new Date().toISOString()}
**Symbol:** SOL
**Leverage:** ${data.leverage}x
**Daglig P&L:** ${data.daily_pnl}%
**Trades i dag:** ${data.trades_today}
**Liquidation-avstand:** ${data.liquidation_distance}%
**Kill switch:** ${data.kill_switch ? '🔴 AKTIV' : '🟢 OK'}
**Saldo:** ${data.balance} USDT

${data.notes || ''}
    `,
    idList: listId,
  };
  
  await fetch(`https://api.trello.com/1/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });
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
      balance: availBal,
      positions,
      notes: dailyPnl <= -3 ? '⚠️ KILL SWITCH AKTIVERT — 3% daglig tap' : '',
    };
    
    console.log('📊 Rapport:', report);
    
    // Send rapporter
    await Promise.all([
      sendTrelloReport(report),
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
    
    // Send feil-rapport
    await sendTrelloReport({
      status: '🔴 FEIL',
      daily_pnl: 'N/A',
      leverage: 5,
      trades_today: 0,
      liquidation_distance: 'N/A',
      kill_switch: false,
      balance: 'N/A',
      notes: `Feil: ${error.message}`,
    });
  }
}

main();

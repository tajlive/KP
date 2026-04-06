#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../.env.local') });

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Mangler SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const EMAIL = 'tom@klarpakke.no';

async function main() {
  console.log('=== KLARPAKKE: create-test-trades ===');

  // 1. Finn userId
  console.log('\n[1] Finner bruker', EMAIL);
  const listResult = await sb.auth.admin.listUsers();
  if (listResult.error) { console.error('listUsers feil:', listResult.error.message); process.exit(1); }

  const allUsers = listResult.data.users;
  const user = allUsers.find((u) => u.email && u.email.toLowerCase() === EMAIL.toLowerCase());
  if (!user) {
    console.error('Fant ikke', EMAIL);
    console.log('Kjente e-poster:');
    allUsers.slice(0, 10).forEach((u) => console.log(' -', u.email));
    process.exit(1);
  }
  const userId = user.id;
  console.log('OK - userId:', userId);

  // 2. Finn eller opprett sesjon
  console.log('\n[2] Sjekker paper-sesjon...');
  const sesRes = await sb.from('trading_sessions')
    .select('*').eq('user_id', userId).eq('mode', 'paper').eq('status', 'active')
    .order('updated_at', { ascending: false }).limit(1).maybeSingle();

  let session = sesRes.data;
  if (!session) {
    console.log('Ingen sesjon - oppretter...');
    const now = new Date().toISOString();
    const ins = await sb.from('trading_sessions').insert({
      user_id: userId, mode: 'paper', status: 'active',
      strategy_id: 'dca', strategy_config: {},
      trading_pair: 'BTCUSDT',
      starting_capital_nok: 100000, current_capital_nok: 100000,
      initial_capital: 100000,    current_capital: 100000,
      total_pnl: 0, winning_trades: 0, losing_trades: 0, total_trades: 0,
      started_at: now, last_heartbeat: now, created_at: now, updated_at: now,
    }).select().single();
    if (ins.error) { console.error('Sesjon-feil:', ins.error.message); process.exit(1); }
    session = ins.data;
    console.log('Ny sesjon:', session.id);
  } else {
    console.log('Eksisterende sesjon:', session.id);
    console.log('Saldo: kr', Number(session.current_capital_nok).toLocaleString('nb-NO'));
  }

  // 3. Trades
  console.log('\n[3] Oppretter trades...');
  const now = Date.now();
  const rows = [
    { label: 'BUY BTC 0.001 @ 84000',  side: 'buy',  pair: 'BTCUSDT', qty: 0.001,  px: 84000, pnl: null,  ago: 3600000 },
    { label: 'BUY ETH 0.05 @ 3200',    side: 'buy',  pair: 'ETHUSDT', qty: 0.05,   px: 3200,  pnl: null,  ago: 1800000 },
    { label: 'SELL BTC 0.0005 @ 85500', side: 'sell', pair: 'BTCUSDT', qty: 0.0005, px: 85500, pnl: 7.875, ago: 600000  },
  ];

  let ok = 0;
  for (const r of rows) {
    const ts = new Date(now - r.ago).toISOString();
    const res = await sb.from('trades').insert({
      session_id:       session.id,
      user_id:          userId,
      trading_pair:     r.pair,
      side:             r.side,
      quantity:         r.qty,
      price:            r.px,
      total_value:      r.px * r.qty * 10.5,
      realized_pnl:     r.pnl,
      fee:              0,
      status:           'filled',
      mode:             'paper',
      order_type:       'market',
      idempotency_key:  'seed-' + r.side + '-' + r.pair + '-' + now,
      executed_at:      ts,
      created_at:       ts,
    });
    if (res.error) { console.log('  FEIL:', r.label, '-', res.error.message); }
    else           { console.log('  OK:  ', r.label); ok++; }
  }

  // 4. Oppdater statistikk
  await sb.from('trading_sessions').update({
    total_trades:   (session.total_trades   || 0) + ok,
    winning_trades: (session.winning_trades || 0) + 1,
    updated_at:     new Date().toISOString(),
  }).eq('id', session.id);

  console.log('\n=== FERDIG:', ok + '/3 trades opprettet ===');
  console.log('Bruker:  ', EMAIL);
  console.log('Passord:  TestPassword123!');
  console.log('Session: ', session.id);
  console.log('URL:      http://localhost:3000/no/paper-trading');
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });

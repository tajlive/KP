#!/usr/bin/env node
/**
 * Auto-trading simulation for Klarpakke Norwegian test users.
 * Creates paper sessions + realistic trades for 10 test users.
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const ENV_PATH = '/Users/taj/klarpakke/.env.local';
const envRaw = readFileSync(ENV_PATH, 'utf8');
const SUPABASE_URL = envRaw.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const SERVICE_KEY = envRaw.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const COINS = [
  { pair: 'BTCUSDT', name: 'Bitcoin', minQty: 0.0001 },
  { pair: 'ETHUSDT', name: 'Ethereum', minQty: 0.001 },
  { pair: 'SOLUSDT', name: 'Solana', minQty: 0.01 },
];

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function supabasePost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${txt.substring(0, 120)}`);
  return txt ? JSON.parse(txt) : null;
}

async function supabaseGet(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${txt.substring(0, 120)}`);
  return JSON.parse(txt);
}

async function binancePrice(pairs) {
  const q = encodeURIComponent(JSON.stringify(pairs));
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${q}`);
  const data = await res.json();
  const out = {};
  for (const p of data) out[p.symbol] = parseFloat(p.price);
  return out;
}

function rPrice(base, pct = 1.5) {
  return +(base * (1 + (Math.random() - 0.5) * 2 * pct / 100)).toFixed(2);
}

function rQty(balance, price) {
  const amt = balance * (0.05 + Math.random() * 0.20) / price;
  return amt < 0.00005 ? 0.00005 : +amt.toFixed(6);
}

function rPnl(price, qty) {
  const r = Math.random();
  const pct = r < 0.35 ? 0.02 + Math.random() * 0.13
           : r < 0.75 ? -(0.01 + Math.random() * 0.07)
           : -(0.08 + Math.random() * 0.17);
  return +(price * pct * qty).toFixed(2);
}

async function main() {
  // 1. Market prices
  const prices = await binancePrice(COINS.map(c => c.pair));
  console.log(`Prices: BTC=${prices.BTCUSDT} ETH=${prices.ETHUSDT} SOL=${prices.SOLUSDT}\n`);

  // 2. Users
  const profiles = await supabaseGet(
    'user_profiles?select=id,paper_balance,tier&paper_balance=gte.10000&order=paper_balance.desc'
  );
  const users = profiles.filter(p => p.id !== '814b8c67-1534-4a47-8c66-40a3f80870cd' && p.paper_balance >= 10000).slice(0, 10);
  if (!users.length) { console.log('No users.'); return; }
  console.log(`Users: ${users.length}\n`);

  // 3. Paper accounts
  const paList = await supabaseGet('paper_accounts?select=id,user_id,current_balance');
  const paMap = {};
  for (const pa of paList) paMap[pa.user_id] = pa;

  // 4. Sessions + trades
  const now = new Date().toISOString();
  const trades = [];
  const results = [];

  for (const user of users) {
    const n = 1 + (Math.random() > 0.35 ? 1 : 0);
    const balance = paMap[user.id]?.current_balance ?? user.paper_balance;
    if (balance < 500) { console.log(`  ⏭ ${user.id.substring(0,8)} balance ${Math.round(balance)} too low`); continue; }

    const sessionId = randomUUID();
    const tPair = COINS[Math.floor(Math.random() * COINS.length)].pair;

    try {
      await supabasePost('trading_sessions', {
        id: sessionId, user_id: user.id,
        strategy_id: ['dca','grid','momentum'][Math.floor(Math.random()*3)],
        strategy_config: { position_size: 0.04, interval_minutes: 240 },
        trading_pair: tPair,
        current_capital: balance, initial_capital: balance,
        started_at: now, created_at: now, updated_at: now,
        last_heartbeat: now, last_status_message: 'Auto-sim — handelssesjon',
        total_trades: 0, winning_trades: 0, losing_trades: 0, total_pnl: 0, crash_count: 0,
      });
    } catch (e) {
      console.log(`  ✗ Session ${user.id.substring(0,8)}: ${e.message.substring(0,70)}`);
      continue;
    }

    let buys = 0, sells = 0, vol = 0, pnl = 0;

    for (let i = 0; i < n; i++) {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const bp = prices[coin.pair];
      if (!bp) continue;

      const side = Math.random() < 0.6 ? 'buy' : 'sell';
      const ep = rPrice(bp);
      const qty = rQty(balance, ep);
      const tv = +(qty * ep).toFixed(2);
      if (tv < 100 || qty < coin.minQty) continue;

      const rp = side === 'sell' ? rPnl(ep, qty) : 0;

      trades.push({
        session_id: sessionId, user_id: user.id,
        idempotency_key: `${sessionId}-${coin.pair}-${side}-${i}`,
        mode: 'paper', trading_pair: coin.pair, side, order_type: 'market',
        quantity: qty, price: ep, total_value: tv,
        fee: +(tv * 0.001).toFixed(2), status: 'filled', realized_pnl: rp,
        is_copy: false, is_mock: false,
        executed_at: now, created_at: now, idempotency_scope: 'trade',
        filled_quantity: qty,
        strategy_signal: {
          action: side,
          reason: side === 'buy'
            ? `Auto-sim: Kjøp ${coin.name} $${ep} (markedspris $${bp})`
            : `Auto-sim: Salg ${coin.name} $${ep}`,
          regime: 'unknown', confidence: +(0.5 + Math.random() * 0.3).toFixed(2),
        },
        indicator_snapshot: {
          price: bp, timestamp: now, volatility: 10 + Math.random() * 20,
          price_24h_ago: +(bp * (1 + (Math.random()-0.5)*0.04)).toFixed(2),
        },
        reason_code: side === 'sell' ? 'SIM_SELL' : 'SIM_BUY',
        reason_params: { simulation: true, priceSource: 'binance' },
        venue: 'binance', pilot_trade: false,
      });

      if (side === 'buy') buys++; else sells++;
      vol += tv; pnl += rp;
    }

    results.push({
      id: user.id.substring(0,8), bal: Math.round(balance),
      n, buys, sells, vol: Math.round(vol), pnl: Math.round(pnl*100)/100,
    });
  }

  console.log(`Generated ${trades.length} trades for ${results.length} users\nInserting...`);

  // 5. Insert
  let ok = 0, fail = 0;
  for (const t of trades) {
    try {
      await supabasePost('trades', t);
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 5) console.log(`  ✗ ${t.user_id.substring(0,8)} ${t.trading_pair} ${t.side}: ${e.message.substring(0,90)}`);
    }
  }

  // 6. Report
  const bT = trades.filter(t => t.side === 'buy').length;
  const sT = trades.filter(t => t.side === 'sell').length;
  const win = trades.filter(t => t.side === 'sell' && t.realized_pnl > 0).length;
  const loss = sT - win;

  console.log(`\n── Per user ────────────────────────────────`);
  for (const r of results) {
    const ps = r.pnl > 0 ? `+${r.pnl}` : `${r.pnl}`;
    console.log(`  ${r.id} | ${r.bal.toLocaleString()} kr | ${r.n}t (${r.buys}B/${r.sells}S) | vol: ${r.vol.toLocaleString()} USD | pnl: ${ps}`);
  }

  const tv = Math.round(trades.reduce((s, t) => s + t.total_value, 0));
  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`  Inserted: ${ok}/${trades.length}`);
  console.log(`  BUY: ${bT} | SELL: ${sT}`);
  console.log(`  Win: ${win} | Loss: ${loss}`);
  console.log(`  Total vol: ${tv.toLocaleString()} USD`);
  console.log(`  Users: ${results.length}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

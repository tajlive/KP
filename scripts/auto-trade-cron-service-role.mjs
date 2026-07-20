// Auto-trading cron: 10 norske testbrukere, 1-2 handler hver, service role key via REST
import { randomUUID, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

const envRaw = readFileSync('/Users/taj/klarpakke/.env.local', 'utf-8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}

const SUPA_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

const USERS = {
  '165b894d-f747-4c1a-8ca1-1e9e2df0925a': 'Silje Lund',
  'd4480fda-6c67-4e77-b4a3-ad4b7d00f652': 'Per Berg',
  '10de2b9b-62c3-43a0-8d83-c1e38aecba5d': 'Marte Hav',
  'f4d68672-d994-4d4b-855a-36f39c71d09d': 'Trond Dal',
  '67db9b24-3c98-4196-9f88-e70c2c164a03': 'Ola Nordmann',
  '7734a444-0094-4a8a-9744-cd09c2a2cfd2': 'Anne Mo',
  'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8': 'Kari Aas',
  '4211b1c7-2b0d-4a55-b397-a10b3ae598a7': 'Ingrid Sol',
  '4bd58f81-c41c-49ca-a712-b5aecbc8548d': 'Bjørn Fjell',
  '241e1133-c895-4e64-a02f-447af4ea90b6': 'Lars Vik',
};
const userIds = Object.keys(USERS);
const inList = '(' + userIds.join(',') + ')';
const SYMBOLS = ['BTC', 'ETH', 'SOL'];
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };
const rand = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r2 = (n) => Math.round(n * 100) / 100;

async function supaGet(path) {
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, { headers: H });
  if (!res.ok) throw new Error('GET ' + path + ' -> ' + res.status + ' ' + (await res.text()));
  return res.json();
}

async function main() {
  const now = new Date().toISOString();
  console.log('[' + now + '] Auto-trading START (service role)');

  // Live market prices from Binance
  const tickRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]');
  const ticks = await tickRes.json();
  const MARKET = {};
  for (const t of ticks) MARKET[t.symbol.replace('USDT', '')] = parseFloat(t.price);
  console.log('Market prices:', JSON.stringify(MARKET));

  const accounts = await supaGet('paper_accounts?user_id=in.' + inList + '&select=*');
  const accountMap = new Map(accounts.map((a) => [a.user_id, a]));

  const sessions = await supaGet(
    'trading_sessions?user_id=in.' + inList + '&mode=eq.paper&select=id,user_id,trading_pair&order=created_at.desc'
  );
  const sessionMap = new Map();
  for (const s of sessions) {
    if (!sessionMap.has(s.user_id)) sessionMap.set(s.user_id, []);
    sessionMap.get(s.user_id).push(s);
  }

  const results = [];
  for (const uid of userIds) {
    const account = accountMap.get(uid);
    const sess = sessionMap.get(uid);
    if (!account || !sess || sess.length === 0) {
      console.log('  SKIP ' + USERS[uid] + ': ' + (!account ? 'no paper account' : 'no session'));
      continue;
    }

    const numTrades = Math.random() < 0.5 ? 1 : 2;
    for (let t = 0; t < numTrades; t++) {
      const symbol = pick(SYMBOLS);
      const side = pick(['buy', 'sell']);
      const price = r2(MARKET[symbol] * (1 + rand(-0.015, 0.015)));
      let quantity;
      if (symbol === 'BTC') quantity = Math.round(rand(0.001, 0.08) * 1e6) / 1e6;
      else if (symbol === 'ETH') quantity = Math.round(rand(0.05, 2.5) * 1e3) / 1e3;
      else quantity = Math.round(rand(1, 25) * 10) / 10;

      const totalValue = r2(price * quantity);
      const fee = r2(totalValue * 0.001);
      const isProfitable = Math.random() < 0.58;
      const realizedPnl = isProfitable ? r2(rand(8, 300)) : r2(rand(-280, -5));

      const matching = sess.filter((s) => s.trading_pair === PAIRS[symbol]);
      const session = matching.length > 0 ? pick(matching) : pick(sess);

      const trade = {
        id: randomUUID(),
        session_id: session.id,
        user_id: uid,
        mode: 'paper',
        trading_pair: PAIRS[symbol],
        side,
        order_type: 'market',
        quantity,
        price,
        total_value: totalValue,
        fee,
        status: 'filled',
        is_copy: false,
        is_mock: true,
        idempotency_key: 'cron_' + randomBytes(4).toString('hex'),
        idempotency_scope: 'auto_trading_cron',
        realized_pnl: realizedPnl,
        reason_code: 'cron_auto',
        reason_params: { source: 'auto_trading_cron', run: now },
        executed_at: now,
        created_at: now,
      };

      const ins = await fetch(SUPA_URL + '/rest/v1/trades', { method: 'POST', headers: H, body: JSON.stringify(trade) });
      if (!ins.ok) {
        console.error('  INSERT FAILED for ' + USERS[uid] + ': ' + ins.status + ' ' + (await ins.text()));
        continue;
      }

      const newBalance = r2(parseFloat(account.current_balance) + realizedPnl - fee);
      const newPnl = r2((parseFloat(account.total_profit_loss) || 0) + realizedPnl);
      const newWin = (account.win_count || 0) + (isProfitable ? 1 : 0);
      const newLoss = (account.loss_count || 0) + (isProfitable ? 0 : 1);

      const upd = await fetch(SUPA_URL + '/rest/v1/paper_accounts?id=eq.' + account.id, {
        method: 'PATCH',
        headers: H,
        body: JSON.stringify({ current_balance: newBalance, total_profit_loss: newPnl, win_count: newWin, loss_count: newLoss, updated_at: now }),
      });
      if (!upd.ok) console.error('  UPDATE FAILED for ' + USERS[uid] + ': ' + upd.status + ' ' + (await upd.text()));

      Object.assign(account, { current_balance: newBalance, total_profit_loss: newPnl, win_count: newWin, loss_count: newLoss });
      results.push({ user: USERS[uid], symbol, side, price, quantity, fee, pnl: realizedPnl, isProfitable, newBalance });
    }
  }

  const wins = results.filter((r) => r.isProfitable).length;
  console.log('=================================================');
  console.log('DONE: ' + results.length + ' trades | Wins: ' + wins + ' | Losses: ' + (results.length - wins));
  for (const r of results) {
    console.log(
      '  ' + (r.isProfitable ? '🟢' : '🔴') + ' ' + r.user.padEnd(14) +
      ' ' + r.side.toUpperCase().padEnd(4) + ' ' + r.symbol.padEnd(4) +
      String(r.quantity).padEnd(10) + ' @ $' + String(r.price).padEnd(12) +
      ' | PnL: ' + (r.pnl >= 0 ? '+' : '') + '$' + String(r.pnl).padEnd(9) +
      ' | Bal: $' + r.newBalance
    );
  }
  console.log('=================================================');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });

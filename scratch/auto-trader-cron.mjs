// Klarpakke auto-trader cron — paper trading for 10 norske testbrukere
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const SUPA_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SRK) { console.error('Mangler SUPABASE_URL/SRK'); process.exit(1); }

const headers = {
  apikey: SRK,
  Authorization: 'Bearer ' + SRK,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function supa(path, opts = {}) {
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, { headers, ...opts });
  if (!res.ok) throw new Error(path + ': ' + res.status + ' ' + await res.text());
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

const USERS = [
  { id: '10de2b9b-62c3-43a0-8d83-c1e38aecba5d', name: 'Marte Hav' },
  { id: 'd4480fda-6c67-4e77-b4a3-ad4b7d00f652', name: 'Per Berg' },
  { id: '67db9b24-3c98-4196-9f88-e70c2c164a03', name: 'Ola Nordmann' },
  { id: 'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', name: 'Kari Aas' },
  { id: '165b894d-f747-4c1a-8ca1-1e9e2df0925a', name: 'Silje Lund' },
  { id: 'f4d68672-d994-4d4b-855a-36f39c71d09d', name: 'Trond Dal' },
  { id: '7734a444-0094-4a8a-9744-cd09c2a2cfd2', name: 'Anne Mo' },
  { id: '4bd58f81-c41c-49ca-a712-b5aecbc8548d', name: 'Bjørn Fjell' },
  { id: '4211b1c7-2b0d-4a55-b397-a10b3ae598a7', name: 'Ingrid Sol' },
  { id: '241e1133-c895-4e64-a02f-447af4ea90b6', name: 'Lars Vik' },
];
const COINS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// --- Live priser fra Binance + USD/NOK ---
const tickers = await (await fetch(
  'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D'
)).json();
const fx = await (await fetch('https://open.er-api.com/v6/latest/USD')).json();
const USDT_NOK = fx.rates.NOK;
const usd = Object.fromEntries(tickers.map(t => [t.symbol, parseFloat(t.price)]));
const NOK = Object.fromEntries(Object.entries(usd).map(([s, p]) => [s, p * USDT_NOK]));
console.log('Priser (NOK):', Object.fromEntries(Object.entries(NOK).map(([k, v]) => [k, v.toFixed(2)])), 'USDT/NOK:', USDT_NOK);

// --- paper_accounts ---
const ids = USERS.map(u => u.id).join(',');
const accounts = await supa('paper_accounts?select=user_id,current_balance,total_profit_loss,win_count,loss_count&user_id=in.(' + ids + ')');
const acct = Object.fromEntries(accounts.map(a => [a.user_id, a]));

// --- Cost basis: snitt kjøpspris siste 30 dager (kun NOK-prisede rader) ---
const since = new Date(Date.now() - 30 * 864e5).toISOString();
const hist = await supa(
  'trades?select=user_id,trading_pair,side,quantity,price,total_value&user_id=in.(' + ids + ')&mode=eq.paper&status=eq.filled&side=eq.buy&executed_at=gte.' + since
);
const basis = {};
for (const t of hist) {
  const pair = t.trading_pair.replace('/', '');
  if (!COINS.includes(pair)) continue;
  if (pair === 'BTCUSDT' && t.price < 100000) continue;
  if (pair === 'ETHUSDT' && t.price < 5000) continue;
  if (pair === 'SOLUSDT' && t.price < 300) continue;
  basis[t.user_id] ??= {};
  const b = (basis[t.user_id][pair] ??= { qty: 0, val: 0 });
  b.qty += parseFloat(t.quantity); b.val += parseFloat(t.total_value);
}
const avgEntry = (uid, pair) => {
  const b = basis[uid]?.[pair];
  return b && b.qty > 0 ? b.val / b.qty : null;
};

// --- Fordel utfall ~50/50 ---
const shuffled = [...USERS].sort(() => Math.random() - 0.5);
const target = {};
shuffled.forEach((u, i) => { target[u.id] = i % 2 === 0 ? 'win' : 'loss'; });

const results = [];
for (const u of USERS) {
  const nTrades = Math.random() < 0.5 ? 1 : 2;
  let balance = parseFloat(acct[u.id].current_balance);
  let pnlSum = 0, wins = 0, losses = 0;

  for (let i = 0; i < nTrades; i++) {
    const want = target[u.id];
    let side = 'buy', coin = pick(COINS), entry = null;
    const sellCands = COINS
      .map(c => ({ c, e: avgEntry(u.id, c) }))
      .filter(x => x.e !== null)
      .map(x => ({ ...x, pnlSign: NOK[x.c] >= x.e ? 'win' : 'loss' }));
    const match = sellCands.filter(x => x.pnlSign === want);
    if (Math.random() < 0.65 && (match.length || sellCands.length)) {
      const chosen = match.length ? pick(match) : pick(sellCands);
      side = 'sell'; coin = chosen.c; entry = chosen.e;
    }

    const mkt = NOK[coin];
    const slippage = 0.002;
    const jitter = rnd(-0.0035, 0.0035);
    const price = +(mkt * (1 + jitter + (side === 'buy' ? slippage : -slippage))).toFixed(2);

    const tv = +(balance * rnd(0.05, 0.18)).toFixed(2);
    const qty = +(tv / price).toFixed(8);
    const fee = +(tv * 0.001).toFixed(2);
    let realized = null;
    if (side === 'sell' && entry) realized = +(((price - entry) * qty) - fee).toFixed(2);

    const now = new Date(Date.now() - Math.floor(rnd(0, 240000))).toISOString();
    const row = {
      user_id: u.id,
      mode: 'paper',
      trading_pair: coin,
      side,
      order_type: 'market',
      quantity: qty,
      price,
      total_value: tv,
      fee,
      status: 'filled',
      realized_pnl: realized,
      venue: 'binance',
      is_mock: false,
      usdt_nok_rate: +USDT_NOK.toFixed(4),
      slippage_bps: 20,
      idempotency_key: 'auto-cron-' + randomUUID(),
      idempotency_scope: 'paper',
      executed_at: now,
      created_at: now,
      strategy_signal: { source: 'auto-trader-cron', strategy: 'random-market-sim' },
    };
    await supa('trades', { method: 'POST', body: JSON.stringify(row) });

    if (side === 'buy') balance -= (tv + fee);
    else balance += (tv - fee);
    if (realized !== null) {
      pnlSum += realized;
      if (realized > 0) wins++; else if (realized < 0) losses++;
    }
    results.push({ user: u.name, side, coin, qty, price, tv, pnl: realized });
  }

  const newBal = +balance.toFixed(2);
  await supa('paper_accounts?user_id=eq.' + u.id, {
    method: 'PATCH',
    body: JSON.stringify({
      current_balance: newBal,
      total_profit_loss: +(parseFloat(acct[u.id].total_profit_loss) + pnlSum).toFixed(2),
      win_count: acct[u.id].win_count + wins,
      loss_count: acct[u.id].loss_count + losses,
      updated_at: new Date().toISOString(),
    }),
  });
  console.log(u.name + ': ' + nTrades + ' handler, ny balanse ' + newBal + ' NOK (PnL ' + pnlSum.toFixed(2) + ')');
}

console.log('\n--- Handler ---');
for (const r of results) {
  console.log(r.user.padEnd(14) + ' ' + r.side.toUpperCase().padEnd(4) + ' ' + r.coin.padEnd(8) + ' qty=' + r.qty + ' pris=' + r.price + ' verdi=' + r.tv + ' pnl=' + (r.pnl ?? '-'));
}
const sells = results.filter(r => r.pnl !== null);
console.log('\nTotalt: ' + results.length + ' handler (' + sells.filter(s => s.pnl > 0).length + ' vinnere, ' + sells.filter(s => s.pnl < 0).length + ' tapere, ' + results.filter(r => r.side === 'buy').length + ' kjøp)');

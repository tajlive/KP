import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ---- Live markedspriser (Binance + USDT/NOK), fallback til coin_prices ----
const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
let pricesUsdt, usdtNok;
try {
  const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=' + encodeURIComponent(JSON.stringify(PAIRS)));
  const arr = await r.json();
  pricesUsdt = Object.fromEntries(arr.map(x => [x.symbol, +x.price]));
  const fx = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=nok')).json();
  usdtNok = fx.tether.nok;
} catch {
  const { data } = await sb.from('coin_prices').select('symbol,price').in('symbol', PAIRS);
  pricesUsdt = null; usdtNok = 9.62;
  var pricesNokFallback = Object.fromEntries(data.map(r => [r.symbol, +r.price]));
}
const PRICES_NOK = pricesUsdt
  ? Object.fromEntries(PAIRS.map(p => [p, pricesUsdt[p] * usdtNok]))
  : pricesNokFallback;

const FEE_RATE = 0.001;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

// 10 norske testbrukere: [user_id, session_id]
const USERS = [
  ['eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', 'e4d6906d-8f9f-43a1-988a-e7e67addc9db'], // Kari Aas
  ['10de2b9b-62c3-43a0-8d83-c1e38aecba5d', 'ace2a614-d492-4f2b-857a-80f9ec39edf6'], // Marte Hav
  ['4bd58f81-c41c-49ca-a712-b5aecbc8548d', 'f7179436-3f24-4b28-bfd1-28c5637addec'], // Bjorn Fjell
  ['d4480fda-6c67-4e77-b4a3-ad4b7d00f652', '33c4dc49-9066-4708-9b5f-1cde2889d867'], // Per Berg
  ['4211b1c7-2b0d-4a55-b397-a10b3ae598a7', '04f09714-42f4-4e98-8b9d-41426e13e204'], // Ingrid Sol
  ['241e1133-c895-4e64-a02f-447af4ea90b6', 'a63cc4eb-2d22-4d6a-a291-9d734761dc09'], // Lars Vik
  ['165b894d-f747-4c1a-8ca1-1e9e2df0925a', 'cb86f1eb-c020-470e-bae8-6e0ee90a6272'], // Silje Lund
  ['67db9b24-3c98-4196-9f88-e70c2c164a03', '2b728234-8bc1-45c1-82d6-9c25bd119100'], // Ola Nordmann
  ['7734a444-0094-4a8a-9744-cd09c2a2cfd2', 'ace0e6a2-69b0-40aa-baca-e3f04ff24df1'], // Anne Mo
  ['f4d68672-d994-4d4b-855a-36f39c71d09d', 'd6c055ec-7b93-4965-a402-f02c7f474d10'], // Trond Dal
];

// Bygg handelsplan: 1-2 round-trips per bruker, ~50/50 gevinst/tap totalt
const trades = [];
for (const [userId, sessionId] of USERS) {
  const n = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < n; i++) trades.push({ userId, sessionId, pair: pick(PAIRS), idx: i + 1 });
}
const nWins = Math.round(trades.length / 2);
const drifts = shuffle(trades.map((_, i) =>
  i < nWins ? rnd(0.003, 0.015) : -rnd(0.003, 0.015) // +0.3-1.5% eller -0.3-1.5%
));
trades.forEach((t, i) => { t.drift = drifts[i]; t.sizeNOK = rnd(3000, 20000); });

const runId = new Date().toISOString().slice(0, 10);
const jitter = () => 1 + (Math.random() * 0.004 - 0.002); // +/-0.2% rundt markedspris
const results = [];
const deltas = {};

for (const t of trades) {
  const key = `cron-${runId}-${t.userId.slice(0, 8)}-t${t.idx}`;
  const buyPrice = +(PRICES_NOK[t.pair] * jitter()).toFixed(2);
  const qty = +(t.sizeNOK / buyPrice).toFixed(8);
  const buyTotal = +(qty * buyPrice).toFixed(2);
  const buyFee = +(buyTotal * FEE_RATE).toFixed(2);

  const buy = {
    session_id: t.sessionId, user_id: t.userId,
    idempotency_key: key + '-buy', idempotency_scope: 'auto_trading_cron',
    mode: 'paper', trading_pair: t.pair, side: 'buy', order_type: 'market',
    quantity: qty, price: buyPrice, total_value: buyTotal, fee: buyFee,
    status: 'filled', is_copy: false, is_mock: true, venue: 'binance',
    usdt_nok_rate: usdtNok, executed_at: new Date().toISOString(),
  };
  const { error: be } = await sb.from('trades').insert(buy);
  if (be) { console.error('BUY FEIL ' + t.userId + ':', be.message); continue; }
  if (!deltas[t.userId]) deltas[t.userId] = { balance: 0, pnl: 0, wins: 0, losses: 0 };
  deltas[t.userId].balance -= buyTotal + buyFee;

  await new Promise(r => setTimeout(r, 250));
  const sellPrice = +(buyPrice * (1 + t.drift) * jitter()).toFixed(2);
  const sellTotal = +(qty * sellPrice).toFixed(2);
  const sellFee = +(sellTotal * FEE_RATE).toFixed(2);
  const sell = {
    session_id: t.sessionId, user_id: t.userId,
    idempotency_key: key + '-sell', idempotency_scope: 'auto_trading_cron',
    mode: 'paper', trading_pair: t.pair, side: 'sell', order_type: 'market',
    quantity: qty, price: sellPrice, total_value: sellTotal, fee: sellFee,
    status: 'filled', is_copy: false, is_mock: true, venue: 'binance',
    usdt_nok_rate: usdtNok, executed_at: new Date().toISOString(),
  };
  const { data: sdata, error: se } = await sb.from('trades').insert(sell).select('realized_pnl').single();
  if (se) { console.error('SELL FEIL ' + t.userId + ':', se.message); continue; }
  const pnl = sdata.realized_pnl != null ? +(+sdata.realized_pnl).toFixed(2) : +(sellTotal - sellFee - buyTotal - buyFee).toFixed(2);
  results.push({ user: t.userId.slice(0, 8), pair: t.pair, qty, buy: buyPrice, sell: sellPrice, pnl });
  deltas[t.userId].balance += sellTotal - sellFee;
  deltas[t.userId].pnl += pnl;
  if (pnl > 0) deltas[t.userId].wins++; else if (pnl < 0) deltas[t.userId].losses++;
}

// Oppdater paper_accounts (DB-trigger synker user_profiles.paper_balance)
for (const [userId, d] of Object.entries(deltas)) {
  const { data: acc } = await sb.from('paper_accounts').select('current_balance,total_profit_loss,win_count,loss_count').eq('user_id', userId).single();
  if (!acc) { console.error('ACCOUNT MANGLER ' + userId); continue; }
  const { error } = await sb.from('paper_accounts').update({
    current_balance: +(+acc.current_balance + d.balance).toFixed(2),
    total_profit_loss: +(+(acc.total_profit_loss ?? 0) + d.pnl).toFixed(2),
    win_count: (acc.win_count ?? 0) + d.wins,
    loss_count: (acc.loss_count ?? 0) + d.losses,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
  if (error) console.error('ACCOUNT FEIL ' + userId + ':', error.message);
}

const wins = results.filter(r => r.pnl > 0).length;
console.log(JSON.stringify({ ok: true, trades: results.length, wins, losses: results.length - wins, usdtNok, results }, null, 1));

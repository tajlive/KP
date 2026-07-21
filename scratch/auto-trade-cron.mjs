// Klarpakke auto-trading cron — 10 norske testbrukere
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Mangler SUPABASE_URL/SERVICE_ROLE_KEY'); process.exit(1); }

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

async function api(path, opts = {}) {
  const r = await fetch(URL + '/rest/v1/' + path, { headers: H, ...opts });
  if (!r.ok) throw new Error((opts.method || 'GET') + ' ' + path + ' -> ' + r.status + ': ' + await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// --- markedspriser (live fra Binance, USDNOK fra Frankfurter 2026-07-20) ---
const usdnok = 9.6639;
const usd = {};
for (const s of ['BTCUSDT','ETHUSDT','SOLUSDT']) {
  const j = await (await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + s)).json();
  usd[s] = +j.price;
}
const mkt = Object.fromEntries(Object.entries(usd).map(([s, p]) => [s, p * usdnok]));
console.log('Markedspriser (NOK):', Object.fromEntries(Object.entries(mkt).map(([k,v])=>[k, v.toFixed(2)])), 'USDNOK:', usdnok);

const USERS = [
  ['241e1133-c895-4e64-a02f-447af4ea90b6', 'Lars Vik'],
  ['10de2b9b-62c3-43a0-8d83-c1e38aecba5d', 'Marte Hav'],
  ['7734a444-0094-4a8a-9744-cd09c2a2cfd2', 'Anne Mo'],
  ['4bd58f81-c41c-49ca-a712-b5aecbc8548d', 'Bjørn Fjell'],
  ['4211b1c7-2b0d-4a55-b397-a10b3ae598a7', 'Ingrid Sol'],
  ['eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', 'Kari Aas'],
  ['67db9b24-3c98-4196-9f88-e70c2c164a03', 'Ola Nordmann'],
  ['d4480fda-6c67-4e77-b4a3-ad4b7d00f652', 'Per Berg'],
  ['165b894d-f747-4c1a-8ca1-1e9e2df0925a', 'Silje Lund'],
  ['f4d68672-d994-4d4b-855a-36f39c71d09d', 'Trond Dal'],
];
const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const runId = Date.now();
const summary = [];
const plannedSells = [];

// Fase 1: planlegg
const plans = [];
for (const [uid, name] of USERS) {
  const [acc] = await api('paper_accounts?user_id=eq.' + uid + '&select=id,current_balance,total_profit_loss,win_count,loss_count');
  if (!acc) { console.error('Ingen paper_account for ' + name); continue; }
  let [sess] = await api('trading_sessions?user_id=eq.' + uid + '&status=eq.active&order=created_at.desc&limit=1&select=id');
  if (!sess) {
    [sess] = await api('trading_sessions', { method: 'POST', body: JSON.stringify({ user_id: uid, strategy_id: 'auto_trade_cron', trading_pair: 'BTC/USDT' }) });
  }
  const hist = await api('trades?user_id=eq.' + uid + '&mode=eq.paper&status=eq.filled&select=trading_pair,side,quantity,price,fee&order=executed_at.asc&limit=500');
  const inv = {};
  for (const t of hist || []) {
    const p = inv[t.trading_pair] ||= { qty: 0, cost: 0 };
    const q = +t.quantity, pr = +t.price;
    if (t.side === 'buy') { p.cost += q * pr; p.qty += q; }
    else { const avg = p.qty > 0 ? p.cost / p.qty : 0; p.cost -= q * avg; p.qty -= q; if (p.qty < 1e-9) { p.qty = 0; p.cost = 0; } }
  }
  const n = Math.random() < 0.5 ? 1 : 2;
  const trades = [];
  for (let i = 0; i < n; i++) {
    const sellable = PAIRS.filter(x => inv[x] && inv[x].qty * mkt[x] > 1500);
    const doSell = sellable.length > 0 && Math.random() < 0.55;
    trades.push({ pair: doSell ? pick(sellable) : pick(PAIRS), side: doSell ? 'sell' : 'buy' });
  }
  plans.push({ uid, name, acc, sess, inv, trades });
}

// Minst 4 salg totalt for realisert PnL
let sellCount = plans.reduce((s, p) => s + p.trades.filter(t => t.side === 'sell').length, 0);
for (const p of plans) {
  if (sellCount >= 4) break;
  const sellable = PAIRS.filter(x => p.inv[x] && p.inv[x].qty * mkt[x] > 1500);
  const buyIdx = p.trades.findIndex(t => t.side === 'buy');
  if (sellable.length && buyIdx >= 0) { p.trades[buyIdx] = { pair: pick(sellable), side: 'sell' }; sellCount++; }
}

// Fase 2: pris/kvantum/PnL
for (const p of plans) {
  for (const t of p.trades) {
    const price = mkt[t.pair] * (1 + rnd(-0.003, 0.003));
    let qty, total, realized = null;
    if (t.side === 'buy') {
      qty = (+p.acc.current_balance * rnd(0.02, 0.05)) / price;
    } else {
      const maxByBalance = (+p.acc.current_balance * rnd(0.03, 0.08)) / price;
      qty = Math.min(p.inv[t.pair].qty * rnd(0.4, 0.9), maxByBalance);
    }
    total = qty * price;
    const fee = total * 0.001;
    Object.assign(t, { qty, price, total, fee, realized });
  }
}



// Fase 3: skriv til DB
for (const p of plans) {
  let balance = +p.acc.current_balance;
  let pnl = +p.acc.total_profit_loss;
  let wins = p.acc.win_count, losses = p.acc.loss_count;
  let ti = 0;
  for (const t of p.trades) {
    const row = {
      user_id: p.uid,
      session_id: p.sess.id,
      idempotency_key: 'auto-' + runId + '-' + p.uid.slice(0,8) + '-' + (ti++),
      mode: 'paper', trading_pair: t.pair, side: t.side, order_type: 'market',
      quantity: t.qty.toFixed(8), price: t.price.toFixed(6), total_value: t.total.toFixed(2),
      fee: t.fee.toFixed(2), status: 'filled',
      realized_pnl: null,
      strategy_signal: { strategy: 'auto_trade_cron', source: 'hermes_scheduled', run_id: runId },
      venue: 'binance', usdt_nok_rate: usdnok, executed_at: new Date().toISOString(),
    };
    const [ins] = await api('trades', { method: 'POST', body: JSON.stringify(row) });
    t.realized = t.side === 'sell' && ins.realized_pnl != null ? +ins.realized_pnl : (t.side === 'sell' ? -(t.fee) : null);
    if (t.side === 'buy') {
      balance -= t.total + t.fee;
      await api('paper_positions', { method: 'POST', body: JSON.stringify({
        account_id: p.acc.id, symbol: t.pair, position_type: 'long', quantity: t.qty.toFixed(8),
        entry_price: t.price.toFixed(6), entry_amount: t.total.toFixed(2), current_price: t.price.toFixed(6),
        status: 'open', opened_at: new Date().toISOString(),
      })});
    } else {
      balance += t.total - t.fee;
      pnl += t.realized;
      if (t.realized >= 0) wins++; else losses++;
      const [pos] = await api('paper_positions?account_id=eq.' + p.acc.id + '&symbol=eq.' + t.pair + '&status=eq.open&order=opened_at.asc&limit=1');
      if (pos) {
        await api('paper_positions?id=eq.' + pos.id, { method: 'PATCH', body: JSON.stringify({
          status: 'closed', closing_price: t.price.toFixed(6), closed_at: new Date().toISOString(),
          profit_loss: t.realized.toFixed(2), profit_loss_percent: ((t.realized / +pos.entry_amount) * 100).toFixed(2),
          close_reason: 'auto_trading_cron', updated_at: new Date().toISOString(),
        })});
      }
    }
    summary.push(p.name + ': ' + t.side.toUpperCase() + ' ' + t.qty.toFixed(6) + ' ' + t.pair + ' @ ' + t.price.toFixed(2) + ' NOK' + (t.realized != null ? ' | PnL: ' + (t.realized >= 0 ? '+' : '') + t.realized.toFixed(2) + ' NOK' : ''));
  }
  await api('paper_accounts?id=eq.' + p.acc.id, { method: 'PATCH', body: JSON.stringify({
    current_balance: balance.toFixed(2), total_profit_loss: pnl.toFixed(2),
    win_count: wins, loss_count: losses, updated_at: new Date().toISOString(),
  })});
  const [sstat] = await api('trading_sessions?id=eq.' + p.sess.id + '&select=total_trades,winning_trades,losing_trades,total_pnl');
  const sWins = p.trades.filter(t => t.realized != null && t.realized >= 0).length;
  const sLoss = p.trades.filter(t => t.realized != null && t.realized < 0).length;
  const sPnl = p.trades.reduce((a, t) => a + (t.realized || 0), 0);
  await api('trading_sessions?id=eq.' + p.sess.id, { method: 'PATCH', body: JSON.stringify({
    total_trades: sstat.total_trades + p.trades.length,
    winning_trades: sstat.winning_trades + sWins,
    losing_trades: sstat.losing_trades + sLoss,
    total_pnl: (+sstat.total_pnl + sPnl).toFixed(2),
    last_heartbeat: new Date().toISOString(), updated_at: new Date().toISOString(),
  })});
}
console.log('\nOK: ' + summary.length + ' handler utfort for ' + plans.length + ' brukere:');
console.log(summary.join('\n'));
const rl = plans.flatMap(p => p.trades).filter(t => t.side === 'sell').map(t => t.realized);
console.log('\nRealiserte salg: ' + rl.length + ' | i pluss: ' + rl.filter(x => x > 0).length + ' | i minus: ' + rl.filter(x => x < 0).length);

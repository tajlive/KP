// Auto-trading cron: 1-2 paper trades per Norwegian test user (BTC/ETH/SOL)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);

const supabase = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// De 10 norske testbrukerne (ekskl. viking.no som har korrupt balanse)
const USERS = [
  ['f4d68672-d994-4d4b-855a-36f39c71d09d', 'trond.dal'],
  ['7734a444-0094-4a8a-9744-cd09c2a2cfd2', 'anne.mo'],
  ['4bd58f81-c41c-49ca-a712-b5aecbc8548d', 'bjorn.fjell'],
  ['4211b1c7-2b0d-4a55-b397-a10b3ae598a7', 'ingrid.sol'],
  ['eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', 'kari.aas'],
  ['241e1133-c895-4e64-a02f-447af4ea90b6', 'lars.vik'],
  ['10de2b9b-62c3-43a0-8d83-c1e38aecba5d', 'marte.hav'],
  ['67db9b24-3c98-4196-9f88-e70c2c164a03', 'ola.nordmann'],
  ['d4480fda-6c67-4e77-b4a3-ad4b7d00f652', 'per.berg'],
  ['165b894d-f747-4c1a-8ca1-1e9e2df0925a', 'silje.lund'],
];

const rnd = (min, max) => min + Math.random() * (max - min);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const r2 = n => Math.round(n * 100) / 100;

// Hent markedspriser
const { data: prices, error: pErr } = await supabase
  .from('coin_prices').select('symbol, price').in('symbol', ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
if (pErr) { console.error('Pris-feil:', pErr); process.exit(1); }
const market = Object.fromEntries(prices.map(p => [p.symbol, Number(p.price)]));
console.log('Markedspriser (NOK):', market);

// Hent paper accounts + siste session per bruker
const { data: accounts, error: aErr } = await supabase
  .from('paper_accounts').select('*').in('user_id', USERS.map(u => u[0]));
if (aErr) { console.error('Account-feil:', aErr); process.exit(1); }
const accByUser = Object.fromEntries(accounts.map(a => [a.user_id, a]));

const { data: sessions } = await supabase
  .from('trading_sessions').select('id, user_id, started_at')
  .in('user_id', USERS.map(u => u[0])).order('started_at', { ascending: false });
const sessByUser = {};
for (const s of sessions || []) if (!sessByUser[s.user_id]) sessByUser[s.user_id] = s.id;

// Forhåndsbestemt fordeling: ~halvparten vinner, ~halvparten taper (realistisk)
let tradeIndex = 0;
const results = [];

for (const [userId, name] of USERS) {
  const acc = accByUser[userId];
  if (!acc) { console.log(`SKIP ${name}: ingen paper_account`); continue; }
  const balance = Number(acc.current_balance);
  const nTrades = Math.random() < 0.5 ? 1 : 2;

  for (let t = 0; t < nTrades; t++) {
    const symbol = pick(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    const side = pick(['buy', 'sell']);
    // Pris nær markedspris ±0.4% (slippage-lignende jitter)
    const price = r2(market[symbol] * (1 + rnd(-0.004, 0.004)));
    // Trade-størrelse: 4-12% av balanse
    const totalValue = r2(Math.min(balance * rnd(0.04, 0.12), balance * 0.9));
    if (totalValue < 100) { console.log(`SKIP ${name}: for lav balanse`); continue; }
    const quantity = Number((totalValue / price).toFixed(8));
    const fee = r2(totalValue * 0.001); // 0.1% fee
    // PnL: annenhver pluss/minus, 0.5-4% av trade-verdi
    const win = (tradeIndex++ % 2 === 0) ? Math.random() < 0.55 : Math.random() < 0.45;
    const pnl = r2(totalValue * rnd(0.005, 0.04) * (win ? 1 : -1));

    const trade = {
      user_id: userId,
      session_id: sessByUser[userId] || null,
      idempotency_key: randomUUID(),
      mode: 'paper',
      trading_pair: symbol,
      side,
      order_type: 'market',
      quantity,
      price,
      total_value: totalValue,
      fee,
      status: 'filled',
      realized_pnl: pnl,
      is_copy: false,
      is_mock: false,
      venue: 'binance',
      executed_at: new Date().toISOString(),
      strategy_signal: { source: 'auto_trade_cron', simulated: true },
    };

    const { error: tErr } = await supabase.from('trades').insert(trade);
    if (tErr) { console.error(`FEIL trade ${name}:`, tErr.message); continue; }

    // Oppdater paper_account
    const cashDelta = side === 'buy' ? -(totalValue + fee) : (totalValue - fee);
    const newBalance = r2(balance + cashDelta + (results.filter(r => r.userId === userId).reduce((s, r) => s + r.cashDelta + r.pnl, 0)));
    const upd = {
      current_balance: newBalance,
      total_profit_loss: r2(Number(acc.total_profit_loss) + pnl + results.filter(r => r.userId === userId).reduce((s, r) => s + r.pnl, 0)),
      win_count: acc.win_count + (win ? 1 : 0) + results.filter(r => r.userId === userId && r.win).length,
      loss_count: acc.loss_count + (win ? 0 : 1) + results.filter(r => r.userId === userId && !r.win).length,
      updated_at: new Date().toISOString(),
    };
    const { error: uErr } = await supabase.from('paper_accounts').update(upd).eq('user_id', userId);
    if (uErr) console.error(`FEIL account-update ${name}:`, uErr.message);

    results.push({ userId, name, symbol, side, quantity, price, totalValue, pnl, win, cashDelta });
    console.log(`${win ? '✅' : '❌'} ${name}: ${side.toUpperCase()} ${quantity} ${symbol.replace('USDT','')} @ ${price} (${totalValue} NOK) → PnL ${pnl > 0 ? '+' : ''}${pnl}`);
  }
}

const wins = results.filter(r => r.pnl > 0).length;
const losses = results.filter(r => r.pnl < 0).length;
console.log(`\nFerdig: ${results.length} handler (${wins} i pluss, ${losses} i minus)`);

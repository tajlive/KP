// Tilleggspass: sikrer gevinster i simuleringen (2. handel for brukere med kun 1)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const now = () => new Date().toISOString();

const { data: prices } = await sb.from('coin_prices')
  .select('symbol, price').in('symbol', ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
const market = Object.fromEntries(prices.map(p => [p.symbol, Number(p.price)]));

// [user_id, symbol, win?]
const plan = [
  ['eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', 'BTCUSDT', true],
  ['241e1133-c895-4e64-a02f-447af4ea90b6', 'ETHUSDT', true],
  ['67db9b24-3c98-4196-9f88-e70c2c164a03', 'SOLUSDT', true],
  ['f4d68672-d994-4d4b-855a-36f39c71d09d', 'ETHUSDT', false],
];

for (const [userId, symbol, win] of plan) {
  const { data: acc } = await sb.from('paper_accounts')
    .select('id, current_balance, win_count, loss_count').eq('user_id', userId).single();
  const { data: sess } = await sb.from('trading_sessions')
    .select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();

  let balance = Number(acc.current_balance);
  const price = market[symbol] * (0.996 + Math.random() * 0.008);
  const total = balance * (0.08 + Math.random() * 0.07);
  const qty = total / price;
  const fee = total * 0.001;
  const pnl = total * (0.01 + Math.random() * 0.03) * (win ? 1 : -1);

  const { error } = await sb.from('trades').insert({
    idempotency_key: `cron-${randomUUID()}`, session_id: sess.id,
    user_id: userId, trading_pair: symbol, side: 'sell',
    mode: 'paper', order_type: 'market', status: 'filled',
    quantity: qty, price, total_value: total, fee, realized_pnl: pnl,
    is_mock: true, venue: 'binance', executed_at: now(),
    strategy_signal: { source: 'auto-trade-cron', simulation: true },
    metadata: { simulation: 'cron-auto-trade', run: now().slice(0, 10) },
  });
  if (error) throw new Error(error.message);

  balance += total - fee;
  await sb.from('paper_accounts').update({
    current_balance: balance,
    win_count: acc.win_count + (win ? 1 : 0),
    loss_count: acc.loss_count + (win ? 0 : 1),
    total_profit_loss: balance - 100000, updated_at: now(),
  }).eq('id', acc.id);
  console.log(`${userId.slice(0, 8)}: SELL ${symbol} pnl=${pnl.toFixed(2)} (${win ? 'gevinst' : 'tap'})`);
}
console.log('Tilleggspass ferdig');

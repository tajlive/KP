// Auto-trade simulering for Klarpakkes 10 norske testbrukere (paper trading)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const rnd = (min, max) => min + Math.random() * (max - min);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const COINS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const FEE_RATE = 0.001;
const now = () => new Date().toISOString();

const { data: prices, error: pErr } = await sb.from('coin_prices')
  .select('symbol, price').in('symbol', COINS);
if (pErr) throw pErr;
const market = Object.fromEntries(prices.map(p => [p.symbol, Number(p.price)]));

const { data: accounts, error: aErr } = await sb.from('paper_accounts')
  .select('id, user_id, current_balance, win_count, loss_count')
  .in('user_id', [
    '4211b1c7-2b0d-4a55-b397-a10b3ae598a7','eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8',
    '7734a444-0094-4a8a-9744-cd09c2a2cfd2','4bd58f81-c41c-49ca-a712-b5aecbc8548d',
    '241e1133-c895-4e64-a02f-447af4ea90b6','10de2b9b-62c3-43a0-8d83-c1e38aecba5d',
    '67db9b24-3c98-4196-9f88-e70c2c164a03','d4480fda-6c67-4e77-b4a3-ad4b7d00f652',
    '165b894d-f747-4c1a-8ca1-1e9e2df0925a','f4d68672-d994-4d4b-855a-36f39c71d09d',
  ]);
if (aErr) throw aErr;

const { data: sessions } = await sb.from('trading_sessions')
  .select('id, user_id').in('user_id', accounts.map(a => a.user_id))
  .order('created_at', { ascending: false });
const sessionByUser = {};
for (const s of sessions ?? []) if (!sessionByUser[s.user_id]) sessionByUser[s.user_id] = s.id;

const { data: openPos } = await sb.from('paper_positions')
  .select('id, account_id, symbol, quantity, entry_price')
  .in('account_id', accounts.map(a => a.id)).eq('status', 'open');
const posByAccount = {};
for (const p of openPos ?? []) (posByAccount[p.account_id] ??= []).push(p);

let wins = 0, losses = 0, tradeCount = 0;

async function insertTrade(t) {
  const { error } = await sb.from('trades').insert({
    idempotency_key: `cron-${randomUUID()}`,
    session_id: sessionByUser[t.user_id],
    mode: 'paper', order_type: 'market', status: 'filled',
    is_mock: true, venue: 'binance', executed_at: now(),
    strategy_signal: { source: 'auto-trade-cron', simulation: true },
    metadata: { simulation: 'cron-auto-trade', run: now().slice(0, 10) },
    ...t,
  });
  if (error) throw new Error(`trade insert: ${error.message}`);
  tradeCount++;
}

for (const acc of accounts) {
  let balance = Number(acc.current_balance);
  let winCount = acc.win_count, lossCount = acc.loss_count;
  const nTrades = Math.random() < 0.5 ? 1 : 2;
  const userPos = posByAccount[acc.id] ?? [];

  for (let i = 0; i < nTrades; i++) {
    const pos = userPos[i];
    if (pos) {
      const price = market[pos.symbol] * rnd(0.996, 1.004);
      const qty = Number(pos.quantity);
      const total = qty * price;
      const fee = total * FEE_RATE;
      const pnl = (price - Number(pos.entry_price)) * qty - fee;
      await insertTrade({
        user_id: acc.user_id, trading_pair: pos.symbol, side: 'sell',
        quantity: qty, price, total_value: total, fee, realized_pnl: pnl,
      });
      await sb.from('paper_positions').update({
        status: 'closed', closing_price: price, current_price: price,
        profit_loss: pnl, profit_loss_percent: (price / Number(pos.entry_price) - 1) * 100,
        close_reason: 'auto_trade_cron', closed_at: now(), updated_at: now(),
      }).eq('id', pos.id);
      balance += total - fee;
      pnl >= 0 ? (winCount++, wins++) : (lossCount++, losses++);
    } else {
      const doSell = i === 0 && userPos.length === 0 && Math.random() < 0.45;
      const symbol = pick(COINS);
      const price = market[symbol] * rnd(0.996, 1.004);
      if (doSell) {
        const total = balance * rnd(0.08, 0.15);
        const qty = total / price;
        const fee = total * FEE_RATE;
        const win = Math.random() < 0.65;
        const pnl = total * rnd(0.01, 0.04) * (win ? 1 : -1);
        await insertTrade({
          user_id: acc.user_id, trading_pair: symbol, side: 'sell',
          quantity: qty, price, total_value: total, fee, realized_pnl: pnl,
        });
        balance += total - fee;
        win ? (winCount++, wins++) : (lossCount++, losses++);
      } else {
        const total = balance * rnd(0.08, 0.15);
        const qty = total / price;
        const fee = total * FEE_RATE;
        await insertTrade({
          user_id: acc.user_id, trading_pair: symbol, side: 'buy',
          quantity: qty, price, total_value: total, fee,
        });
        await sb.from('paper_positions').insert({
          account_id: acc.id, symbol, position_type: 'long',
          quantity: qty, entry_price: price, entry_amount: total,
          current_price: price, status: 'open', opened_at: now(), updated_at: now(),
        });
        balance -= total + fee;
      }
    }
  }

  const { error: uErr } = await sb.from('paper_accounts').update({
    current_balance: balance, win_count: winCount, loss_count: lossCount,
    total_profit_loss: balance - 100000, updated_at: now(),
  }).eq('id', acc.id);
  if (uErr) throw new Error(`account update: ${uErr.message}`);
  console.log(`${acc.user_id.slice(0, 8)}: ${nTrades} handler, ny balanse ${balance.toFixed(2)} NOK`);
}

console.log(`Ferdig: ${tradeCount} handler, ${wins} gevinster, ${losses} tap`);

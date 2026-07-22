#!/usr/bin/env node
/**
 * Klarpakke auto-trade cron — 10 norske testbrukere (@klarpakke.test)
 * Genererer 1-2 paper-trades per bruker på BTC/ETH/SOL nær markedspris.
 * Bruker service role key fra .env.local. Miks av gevinst/tap for realisme.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

// --- Load .env.local ---
const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Mangler SUPABASE_URL/SERVICE_ROLE_KEY');

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// --- 10 norske testbrukere (fra paper_accounts + trading_sessions) ---
const USERS = [
  { name: 'silje.lund',    userId: '165b894d-f747-4c1a-8ca1-1e9e2df0925a', accountId: '3dab4558-c246-4284-b23c-c6c44ba1f202', sessionId: 'e0e2af00-3336-4520-8220-60145fbed44c', plan: 'roundtrip-win' },
  { name: 'trond.dal',     userId: 'f4d68672-d994-4d4b-855a-36f39c71d09d', accountId: 'fd509d52-11ae-4cd4-ae9b-40f33bc32d73', sessionId: '42bf9bb6-1f03-471a-b57f-d01519987790', plan: 'roundtrip-loss' },
  { name: 'anne.mo',       userId: '7734a444-0094-4a8a-9744-cd09c2a2cfd2', accountId: 'e9dcd5db-9dae-4514-89e7-3361ce59d29a', sessionId: 'ace0e6a2-69b0-40aa-baca-e3f04ff24df1', plan: 'roundtrip-win' },
  { name: 'per.berg',      userId: 'd4480fda-6c67-4e77-b4a3-ad4b7d00f652', accountId: 'a201cf15-08ff-474f-8374-c086bad156a7', sessionId: 'f29443b3-e9c0-4177-9e87-9d1c8781859d', plan: 'single-buy' },
  { name: 'marte.hav',     userId: '10de2b9b-62c3-43a0-8d83-c1e38aecba5d', accountId: '4b1c934c-e69c-4236-bdf1-82794e066026', sessionId: 'be174fa2-806d-48d4-8174-630d8a0c6369', plan: 'roundtrip-loss' },
  { name: 'lars.vik',      userId: '241e1133-c895-4e64-a02f-447af4ea90b6', accountId: 'bf582ba5-2266-41ca-80d0-899e4f446cd4', sessionId: 'e33ae1e0-8387-4e99-832e-f3d9b7065fcf', plan: 'single-buy' },
  { name: 'ingrid.sol',    userId: '4211b1c7-2b0d-4a55-b397-a10b3ae598a7', accountId: '5e8df6a9-d3c8-47d4-b953-63c41c3ca65d', sessionId: '4d22dc86-3dc5-4a0c-aa42-a226180042a3', plan: 'single-buy' },
  { name: 'bjorn.fjell',   userId: '4bd58f81-c41c-49ca-a712-b5aecbc8548d', accountId: '38eea3c7-3fec-46cf-b295-dc18d32790b6', sessionId: 'c381d29c-7cf3-4dfd-b663-bd7e67e1d0bf', plan: 'roundtrip-win' },
  { name: 'kari.aas',      userId: 'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', accountId: '49543181-407d-4d9f-8578-7d8acbe062cf', sessionId: 'e4d6906d-8f9f-43a1-988a-e7e67addc9db', plan: 'single-buy' },
  { name: 'ola.nordmann',  userId: '67db9b24-3c98-4196-9f88-e70c2c164a03', accountId: 'bc54fd3f-30c8-45a4-9ba3-55d136a0dc44', sessionId: 'ea9320c4-42af-4c13-bd12-15da49a0e2ef', plan: 'roundtrip-loss' },
];

const USDT_NOK = 10.92;
const FEE_RATE = 0.001;      // 0.1 %
const SLIPPAGE = 0.002;      // 0.2 % (jf. AGENTS.md)
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r2 = (n) => Math.round(n * 100) / 100;
const r8 = (n) => Math.round(n * 1e8) / 1e8;

// --- Hent live markedspriser (Binance, fallback: faste kurser) ---
async function getMarketPrices() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const data = await res.json();
    const usd = Object.fromEntries(data.map((d) => [d.symbol, parseFloat(d.price)]));
    console.log('Live USD-priser:', usd);
    return Object.fromEntries(Object.entries(usd).map(([s, p]) => [s, p * USDT_NOK]));
  } catch (e) {
    console.warn('Binance feilet, bruker fallback-priser:', e.message);
    return { BTCUSDT: 66706 * USDT_NOK, ETHUSDT: 1939.23 * USDT_NOK, SOLUSDT: 78.54 * USDT_NOK };
  }
}

async function sb(pathname, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, { ...options, headers });
  if (!res.ok) throw new Error(`${pathname}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function insertTrade(t) {
  const rows = await sb('trades', { method: 'POST', body: JSON.stringify(t) });
  return rows[0];
}

async function main() {
  const market = await getMarketPrices();
  const summary = [];

  for (const u of USERS) {
    // Hent gjeldende papir-konto
    const [acc] = await sb(`paper_accounts?id=eq.${u.accountId}&select=current_balance,total_profit_loss,win_count,loss_count`);
    let balance = parseFloat(acc.current_balance);
    let pnlDelta = 0, wins = 0, losses = 0;
    const trades = [];

    const symbol = pick(SYMBOLS);
    const mkt = market[symbol];
    // Posisjonsstørrelse: 4-12 % av balanse
    const sizeNok = Math.min(balance * rand(0.04, 0.12), balance * 0.9);

    if (u.plan === 'single-buy') {
      const price = r8(mkt * (1 + rand(-0.003, 0.003)) * (1 + SLIPPAGE));
      const qty = r8(sizeNok / price);
      const total = r2(qty * price);
      const fee = r2(total * FEE_RATE);
      const row = await insertTrade({
        session_id: u.sessionId, user_id: u.userId, mode: 'paper',
        trading_pair: symbol, side: 'buy', order_type: 'market',
        quantity: qty, price, total_value: total, fee, status: 'filled',
        is_copy: false, is_mock: false, usdt_nok_rate: USDT_NOK,
        strategy_signal: { source: 'auto_trade_cron', signal: pick(['momentum', 'dca', 'breakout']) },
      });
      balance -= total + fee;
      trades.push({ side: 'buy', symbol, qty, price, pnl: null, id: row.id });
    } else {
      // Round-trip: BUY så SELL — trigger beregner realized_pnl fra open_position
      const isWin = u.plan === 'roundtrip-win';
      const entryPrice = r8(mkt * (1 + rand(-0.003, 0.003)) * (1 + SLIPPAGE));
      const qty = r8(sizeNok / entryPrice);
      const entryTotal = r2(qty * entryPrice);
      const entryFee = r2(entryTotal * FEE_RATE);
      const buy = await insertTrade({
        session_id: u.sessionId, user_id: u.userId, mode: 'paper',
        trading_pair: symbol, side: 'buy', order_type: 'market',
        quantity: qty, price: entryPrice, total_value: entryTotal, fee: entryFee, status: 'filled',
        is_copy: false, is_mock: false, usdt_nok_rate: USDT_NOK,
        strategy_signal: { source: 'auto_trade_cron', signal: 'momentum_entry' },
      });
      balance -= entryTotal + entryFee;
      trades.push({ side: 'buy', symbol, qty, price: entryPrice, pnl: null, id: buy.id });

      const pnlPct = isWin ? rand(0.015, 0.04) : -rand(0.015, 0.04);
      const exitPrice = r8(entryPrice * (1 + pnlPct) * (1 - SLIPPAGE));
      const exitTotal = r2(qty * exitPrice);
      const exitFee = r2(exitTotal * FEE_RATE);
      // Kort pause så executed_at skiller seg
      await new Promise((r) => setTimeout(r, 300));
      const sell = await insertTrade({
        session_id: u.sessionId, user_id: u.userId, mode: 'paper',
        trading_pair: symbol, side: 'sell', order_type: 'market',
        quantity: qty, price: exitPrice, total_value: exitTotal, fee: exitFee, status: 'filled',
        is_copy: false, is_mock: false, usdt_nok_rate: USDT_NOK,
        strategy_signal: { source: 'auto_trade_cron', signal: isWin ? 'take_profit' : 'stop_loss' },
      });
      balance += exitTotal - exitFee;
      const realized = sell.realized_pnl != null ? parseFloat(sell.realized_pnl) : r2((exitPrice - entryPrice) * qty - exitFee);
      pnlDelta += realized;
      if (realized > 0) wins++; else if (realized < 0) losses++;
      trades.push({ side: 'sell', symbol, qty, price: exitPrice, pnl: realized, id: sell.id });
    }

    // Oppdater paper_accounts (source of truth)
    await sb(`paper_accounts?id=eq.${u.accountId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        current_balance: r2(balance),
        total_profit_loss: r2(parseFloat(acc.total_profit_loss) + pnlDelta),
        win_count: acc.win_count + wins,
        loss_count: acc.loss_count + losses,
        updated_at: new Date().toISOString(),
      }),
    });

    summary.push({ user: u.name, plan: u.plan, trades, nyBalanse: r2(balance) });
    console.log(`✓ ${u.name} (${u.plan}):`, trades.map((t) => `${t.side.toUpperCase()} ${t.qty} ${t.symbol} @ ${t.price}${t.pnl != null ? ` pnl=${t.pnl}` : ''}`).join(' | '), `→ balanse ${r2(balance)}`);
  }

  const wins = summary.flatMap((s) => s.trades).filter((t) => t.pnl > 0).length;
  const losses = summary.flatMap((s) => s.trades).filter((t) => t.pnl < 0).length;
  console.log(`\nFERDIG: ${summary.reduce((a, s) => a + s.trades.length, 0)} handler for ${summary.length} brukere — ${wins} i pluss, ${losses} i minus`);
}

main().catch((e) => { console.error('FEIL:', e); process.exit(1); });

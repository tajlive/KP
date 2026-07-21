/**
 * Cron: Auto-trade-simulering for Klarpakkes 10 norske testbrukere.
 * Genererer 1-2 BUY/SELL per bruker på BTC/ETH/SOL nær markedspris.
 * Bruker service role key fra .env.local. Realistisk miks av pluss/minus.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TEST_USERS = [
  ['4211b1c7-2b0d-4a55-b397-a10b3ae598a7', 'Ingrid Sol'],
  ['eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', 'Kari Aas'],
  ['241e1133-c895-4e64-a02f-447af4ea90b6', 'Lars Vik'],
  ['10de2b9b-62c3-43a0-8d83-c1e38aecba5d', 'Marte Hav'],
  ['7734a444-0094-4a8a-9744-cd09c2a2cfd2', 'Anne Mo'],
  ['4bd58f81-c41c-49ca-a712-b5aecbc8548d', 'Bjørn Fjell'],
  ['67db9b24-3c98-4196-9f88-e70c2c164a03', 'Ola Nordmann'],
  ['d4480fda-6c67-4e77-b4a3-ad4b7d00f652', 'Per Berg'],
  ['165b894d-f747-4c1a-8ca1-1e9e2df0925a', 'Silje Lund'],
  ['f4d68672-d994-4d4b-855a-36f39c71d09d', 'Trond Dal'],
];
const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const FEE_RATE = 0.001;
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r2 = (n) => Math.round(n * 100) / 100;
const r8 = (n) => Math.round(n * 1e8) / 1e8;

// Markedspris = siste handelspris per par i plattformens egen markedsdata
const market = {};
for (const pair of PAIRS) {
  const { data, error } = await supabase
    .from('trades').select('price').eq('trading_pair', pair)
    .order('executed_at', { ascending: false }).limit(1).single();
  if (error) throw new Error(`Markedspris ${pair}: ${error.message}`);
  market[pair] = Number(data.price);
}
console.log('Markedspriser:', JSON.stringify(market));

let buys = 0, sells = 0, wins = 0, losses = 0;

for (const [userId, name] of TEST_USERS) {
  const [{ data: acct, error: aErr }, { data: sessions, error: sErr }, { data: hist, error: hErr }] =
    await Promise.all([
      supabase.from('paper_accounts').select('*').eq('user_id', userId).single(),
      supabase.from('trading_sessions').select('id, trading_pair').eq('user_id', userId),
      supabase.from('trades').select('trading_pair, side, quantity, price').eq('user_id', userId),
    ]);
  if (aErr || !acct) { console.error(`${name}: fant ikke paper_account`, aErr?.message); continue; }
  if (sErr || !sessions?.length) { console.error(`${name}: ingen trading_session`, sErr?.message); continue; }
  if (hErr) { console.error(`${name}: historikk-feil`, hErr.message); continue; }

  let balance = Number(acct.current_balance);
  let pnlTotal = Number(acct.total_profit_loss ?? 0);
  let winCount = acct.win_count ?? 0;
  let lossCount = acct.loss_count ?? 0;

  const nTrades = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < nTrades; i++) {
    const pair = pick(PAIRS);
    const session = sessions.find((s) => s.trading_pair === pair) ?? sessions[0];
    const price = r2(market[pair] * (1 + rand(-0.004, 0.004)));

    // Nettoposisjon fra egen historikk
    let netQty = 0, buyVal = 0, buyQty = 0;
    for (const t of hist ?? []) {
      if (t.trading_pair !== pair) continue;
      const q = Number(t.quantity), p = Number(t.price);
      if (t.side === 'buy') { netQty += q; buyVal += q * p; buyQty += q; }
      else netQty -= q;
    }
    const avgEntry = buyQty > 0 ? buyVal / buyQty : null;

    const canSell = netQty > 1e-8 && netQty * price > 50;
    const side = canSell && Math.random() < 0.6 ? 'sell' : 'buy';

    let quantity, totalValue, fee, realizedPnl = null;
    if (side === 'buy') {
      const value = Math.min(balance * rand(0.03, 0.10), balance * 0.9);
      if (value < 50) { console.log(`${name}: for lav balanse for BUY, hopper over`); continue; }
      quantity = r8(value / price);
      totalValue = r2(quantity * price);
      fee = r2(totalValue * FEE_RATE);
      balance = r2(balance - totalValue - fee);
      buys++;
    } else {
      quantity = r8(netQty * rand(0.3, 1.0));
      totalValue = r2(quantity * price);
      fee = r2(totalValue * FEE_RATE);
      const entry = avgEntry ?? price * (1 + rand(-0.03, 0.03));
      realizedPnl = r2((price - entry) * quantity - fee);
      balance = r2(balance + totalValue - fee);
      pnlTotal = r2(pnlTotal + realizedPnl);
      if (realizedPnl >= 0) { winCount++; wins++; } else { lossCount++; losses++; }
      sells++;
    }

    const { error: tErr } = await supabase.from('trades').insert({
      user_id: userId,
      session_id: session.id,
      mode: 'paper',
      trading_pair: pair,
      side,
      order_type: 'market',
      quantity,
      price,
      total_value: totalValue,
      fee,
      status: 'filled',
      realized_pnl: realizedPnl,
      is_mock: false,
      venue: 'binance',
      executed_at: new Date().toISOString(),
    });
    if (tErr) { console.error(`${name}: insert feilet`, tErr.message); continue; }

    // Oppdater lokal historikk slik at trade #2 ser trade #1
    (hist ?? []).push({ trading_pair: pair, side, quantity, price });
    console.log(`${name}: ${side.toUpperCase()} ${quantity} ${pair} @ ${price} (tot ${totalValue}, fee ${fee}${realizedPnl !== null ? `, pnl ${realizedPnl}` : ''})`);
  }

  const { error: uErr } = await supabase.from('paper_accounts').update({
    current_balance: balance,
    total_profit_loss: pnlTotal,
    win_count: winCount,
    loss_count: lossCount,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
  if (uErr) console.error(`${name}: balance-update feilet`, uErr.message);
}

console.log(`Ferdig: ${buys} BUY, ${sells} SELL — ${wins} i pluss, ${losses} i minus`);

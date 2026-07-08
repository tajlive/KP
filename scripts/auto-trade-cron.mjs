// Auto-trading cron for Klarpakke — 10 Norwegian test users
// Each run: 1-2 random paper trades per user (BTC, ETH, SOL)
// BUY/SELL near market price, ~55% of sells profitable
// Updates paper_accounts balances

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const PROJECT_DIR = new URL('..', import.meta.url).pathname;
const envRaw = readFileSync(PROJECT_DIR + '.env.local', 'utf8');

function getEnv(key) {
  const re = new RegExp(`^${key}=["']?([^"'\n]+)["']?`, 'm');
  const m = envRaw.match(re);
  return m ? m[1].trim() : null;
}

const SUPABASE_URL = 'https://pskhryjzkobytnfwucrb.supabase.co';
const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Approximate market prices — script reads coin_prices table first as override
const MARKET_PRICES = {
  'BTC/USDT': 62100,
  'ETH/USDT': 1770,
  'SOL/USDT': 82,
};

const COINS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
const TEST_NAMES = [
  'Ola Nordmann', 'Kari Aas', 'Bjørn Fjell', 'Ingrid Sol',
  'Lars Vik', 'Marte Hav', 'Per Berg', 'Silje Lund',
  'Trond Dal', 'Anne Mo'
];

// --- Helpers ---
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const round2 = n => Math.round(n * 100) / 100;
const round8 = n => Math.round(n * 100000000) / 100000000;
const jitter = (price, pct) => {
  const f = 1 + (Math.random() * 2 - 1) * pct;
  return round2(price * f);
};

async function main() {
  // 1. Find test users via user_profiles
  const { data: profiles, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, display_name');
  if (profErr) { console.error('Profile fetch failed:', profErr.message); process.exit(1); }

  const testUsers = (profiles || []).filter(p => TEST_NAMES.includes(p.display_name));
  if (testUsers.length === 0) { process.exit(0); }

  // 2. Get one active paper session per user (latest created)
  const userIds = testUsers.map(u => u.id);
  const { data: sessions } = await supabase
    .from('trading_sessions')
    .select('id, user_id, created_at')
    .in('user_id', userIds)
    .eq('mode', 'paper')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const sessionMap = {};
  if (sessions) {
    for (const s of sessions) {
      if (!sessionMap[s.user_id]) sessionMap[s.user_id] = s.id;
    }
  }

  // 3. Get paper_account balances
  const { data: paperAccounts } = await supabase
    .from('paper_accounts')
    .select('user_id, current_balance, total_profit_loss')
    .in('user_id', userIds);

  const balanceMap = {};
  if (paperAccounts) {
    for (const pa of paperAccounts) {
      balanceMap[pa.user_id] = {
        balance: parseFloat(pa.current_balance) || 100000,
        pnl: parseFloat(pa.total_profit_loss) || 0,
      };
    }
  }

  // 4. Get coin prices from DB (fallback to market)
  let prices = { ...MARKET_PRICES };
  try {
    const { data: dbPrices } = await supabase
      .from('coin_prices')
      .select('symbol, price')
      .in('symbol', ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    if (dbPrices) {
      for (const cp of dbPrices) {
        const pair = cp.symbol.replace('USDT', '/USDT');
        if (prices[pair] !== undefined && parseFloat(cp.price) > 0) {
          prices[pair] = parseFloat(cp.price);
        }
      }
    }
  } catch (_) { /* fallback to market prices */ }

  // 5. Generate trades
  const allTrades = [];
  const balanceDeltas = {};
  const now = new Date().toISOString();

  for (const user of testUsers) {
    const sessionId = sessionMap[user.id];
    if (!sessionId) continue;

    const numTrades = randInt(1, 2);
    for (let t = 0; t < numTrades; t++) {
      const coin = pick(COINS);
      const side = pick(['buy', 'sell']);
      const basePrice = prices[coin];
      const price = jitter(basePrice, 0.015);

      let quantity;
      if (coin === 'BTC/USDT') {
        quantity = round8(Math.random() * 0.015 + 0.0005);
      } else if (coin === 'ETH/USDT') {
        quantity = round8(Math.random() * 0.4 + 0.01);
      } else {
        quantity = round8(Math.random() * 2.5 + 0.1);
      }

      const totalValue = round2(quantity * price);
      const fee = round2(totalValue * 0.001);

      // ~55% profitable sells, ±0.5% to ±4% PnL
      let realizedPnl = null;
      if (side === 'sell') {
        const profitable = Math.random() < 0.55;
        const pnlPct = (profitable ? 1 : -1) * (Math.random() * 3.5 + 0.5);
        realizedPnl = round2(totalValue * pnlPct / 100);
      }

      const trade = {
        session_id: sessionId,
        user_id: user.id,
        idempotency_key: `cron-${user.id.slice(0, 8)}-${Date.now()}-${t}-${randomUUID().slice(0, 6)}`,
        mode: 'paper',
        trading_pair: coin,
        side,
        order_type: 'market',
        quantity,
        price,
        total_value: totalValue,
        fee,
        realized_pnl: realizedPnl,
        status: 'filled',
        executed_at: now,
      };

      allTrades.push(trade);
      balanceDeltas[user.id] = (balanceDeltas[user.id] || 0) + (realizedPnl || 0) - fee;
    }
  }

  // 6. Insert trades one-by-one (most reliable)
  if (allTrades.length > 0) {
    for (const trade of allTrades) {
      const { error } = await supabase.from('trades').insert(trade);
      if (error) console.error(`Insert fail: ${error.message}`);
    }
  }

  // 7. Update paper_accounts balances
  for (const [uid, delta] of Object.entries(balanceDeltas)) {
    const d = round2(delta);
    if (d === 0) continue;
    const cur = balanceMap[uid] || { balance: 100000, pnl: 0 };
    const { error } = await supabase
      .from('paper_accounts')
      .update({
        current_balance: round2(cur.balance + d),
        total_profit_loss: round2(cur.pnl + d),
      })
      .eq('user_id', uid);
    if (error) console.error(`Balance update fail for ${uid.slice(0, 8)}: ${error.message}`);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

#!/usr/bin/env node
/**
 * Auto-trading cron job for Klarpakke test users.
 * Generates realistic BUY/SELL trades for 10 Norwegian test users.
 * Uses Supabase REST API with service role key.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

// ── Load env ──────────────────────────────────────────────────────
const env = {};
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq).trim();
  const v = trimmed.slice(eq + 1).trim();
  env[k] = v;
}

const SUPABASE_URL = env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const HEADERS = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Market prices (approximate for July 9, 2026) ──────────────────
const MARKET_PRICES = {
  BTCUSDT: 62623.88,
  ETHUSDT: 1752.59,
  SOLUSDT: 78.42,
};

const PRICE_DEVIATION = 0.035; // ±3.5%

const QUANTITIES = {
  BTCUSDT: [0.0005, 0.001, 0.0015, 0.002, 0.003],
  ETHUSDT: [0.05, 0.08, 0.1, 0.15, 0.2],
  SOLUSDT: [0.5, 1.0, 2.0, 3.0, 5.0],
};

// ── Helpers ───────────────────────────────────────────────────────

async function apiGet(endpoint, params = {}) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${qs ? '?' + qs : ''}`;
  const resp = await fetch(url, {
    headers: { apikey: HEADERS.apikey, Authorization: HEADERS.Authorization },
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`  API GET error ${resp.status}: ${body.slice(0, 300)}`);
    return null;
  }
  return resp.json();
}

async function apiPost(endpoint, data) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`  API POST error ${resp.status}: ${body.slice(0, 300)}`);
    return null;
  }
  return resp.json();
}

async function apiPatch(endpoint, data, params = {}) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${qs ? '?' + qs : ''}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`  API PATCH error ${resp.status}: ${body.slice(0, 300)}`);
    return null;
  }
  return resp.json();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// ── Main logic ────────────────────────────────────────────────────

async function getTestPaperAccounts() {
  console.log('[1] Finding test paper accounts...');
  const accounts = await apiGet('paper_accounts', {
    select: '*',
    initial_balance: 'eq.100000',
    order: 'created_at.asc',
  });
  if (!accounts || accounts.length === 0) {
    console.error('  ERROR: No test accounts found');
    process.exit(1);
  }
  console.log(`  Found ${accounts.length} test accounts`);
  for (const a of accounts) {
    console.log(`    ${a.user_id?.slice(0, 8)}... balance=${Number(a.current_balance).toFixed(0)} PnL=${Number(a.total_profit_loss || 0).toFixed(2)}`);
  }
  return accounts;
}

async function getOrCreateSession(userId) {
  const sessions = await apiGet('trading_sessions', {
    select: '*',
    user_id: `eq.${userId}`,
    mode: 'eq.paper',
    status: 'eq.active',
    order: 'updated_at.desc',
    limit: '1',
  });
  if (sessions && sessions.length > 0) return sessions[0];

  const now = new Date().toISOString();
  const sessionData = {
    user_id: userId,
    mode: 'paper',
    status: 'active',
    strategy_id: 'dca',
    strategy_config: {},
    trading_pair: 'BTCUSDT',
    starting_capital_nok: 100000,
    current_capital_nok: 100000,
    initial_capital: 100000,
    current_capital: 100000,
    total_pnl: 0,
    winning_trades: 0,
    losing_trades: 0,
    total_trades: 0,
    started_at: now,
    last_heartbeat: now,
    created_at: now,
    updated_at: now,
  };
  const result = await apiPost('trading_sessions', sessionData);
  if (result && result.length > 0) return result[0];
  return null;
}

function generateTrade(userId, sessionId) {
  const coin = pick(Object.keys(MARKET_PRICES));
  const marketPrice = MARKET_PRICES[coin];
  const side = pick(['buy', 'sell']);

  const price = +(marketPrice * (1 + rand(-PRICE_DEVIATION, PRICE_DEVIATION))).toFixed(2);
  const qty = pick(QUANTITIES[coin]);
  const totalValue = +(price * qty).toFixed(2);
  const fee = +(totalValue * 0.001).toFixed(2);

  let realizedPnl = null;
  if (side === 'sell') {
    const pnlFactor = pick([
      rand(0.01, 0.05),   // 1-5% profit
      rand(0.01, 0.05),
      rand(0.01, 0.05),
      rand(-0.05, -0.01), // 1-5% loss
      rand(-0.05, -0.01),
    ]);
    const costBasis = price * (1 + pnlFactor);
    realizedPnl = +((price - costBasis) * qty).toFixed(2);
  }

  const now = new Date();
  const minutesAgo = Math.floor(rand(5, 360));
  const executedAt = new Date(now.getTime() - minutesAgo * 60000);

  const idempotencyKey = `cron-${userId.slice(0, 8)}-${coin}-${side}-${Math.floor(executedAt.getTime() / 1000)}-${Math.floor(rand(1000, 9999))}`;

  return {
    session_id: sessionId,
    user_id: userId,
    idempotency_key: idempotencyKey,
    mode: 'paper',
    trading_pair: coin,
    side,
    order_type: 'market',
    quantity: qty,
    price,
    total_value: totalValue,
    fee,
    status: 'filled',
    realized_pnl: realizedPnl,
    is_copy: false,
    executed_at: executedAt.toISOString(),
    created_at: now.toISOString(),
  };
}

function updateSessionStats(session, trades) {
  let totalTrades = (session.total_trades || 0) + trades.length;
  let winning = session.winning_trades || 0;
  let losing = session.losing_trades || 0;
  let capital = Number(session.current_capital_nok || 100000);
  let pnl = Number(session.total_pnl || 0);

  for (const t of trades) {
    if (t.realized_pnl != null) {
      pnl += t.realized_pnl;
      capital += t.realized_pnl;
      if (t.realized_pnl > 0) winning++;
      else losing++;
    } else if (t.side === 'buy') {
      capital -= (t.total_value + t.fee);
    }
  }

  return {
    total_trades: totalTrades,
    winning_trades: winning,
    losing_trades: losing,
    current_capital_nok: +capital.toFixed(2),
    current_capital: +capital.toFixed(2),
    total_pnl: +pnl.toFixed(2),
    updated_at: new Date().toISOString(),
  };
}

function updatePaperAccount(account, trades) {
  let balance = Number(account.current_balance || 100000);
  let pnl = Number(account.total_profit_loss || 0);
  let win = account.win_count || 0;
  let loss = account.loss_count || 0;

  for (const t of trades) {
    if (t.realized_pnl != null) {
      balance += t.realized_pnl;
      pnl += t.realized_pnl;
      if (t.realized_pnl > 0) win++;
      else loss++;
    } else if (t.side === 'buy') {
      balance -= (t.total_value + t.fee);
    }
  }

  return {
    current_balance: +balance.toFixed(2),
    total_profit_loss: +pnl.toFixed(2),
    win_count: win,
    loss_count: loss,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('KLARPAKKE AUTO-TRADING CRON');
  console.log(`Run: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const accounts = await getTestPaperAccounts();
  if (accounts.length === 0) {
    console.error('ERROR: No paper accounts found');
    process.exit(1);
  }

  const traders = accounts.slice(0, 10);

  let totalTrades = 0;
  let successUsers = 0;
  const errors = [];

  for (const account of traders) {
    const userId = account.user_id;
    const uidShort = userId.slice(0, 8);
    process.stdout.write(`\n[${uidShort}...] balance=${Number(account.current_balance).toFixed(0)}`);

    const session = await getOrCreateSession(userId);
    if (!session) {
      errors.push(`${uidShort}: No session`);
      console.log(' FAILED (no session)');
      continue;
    }

    const numTrades = Math.random() < 0.6 ? 1 : 2;
    const tradesMade = [];

    for (let i = 0; i < numTrades; i++) {
      const trade = generateTrade(userId, session.id);
      const result = await apiPost('trades', trade);
      if (result && result.length > 0) {
        tradesMade.push(trade);
        totalTrades++;
        const sideLabel = trade.side === 'buy' ? '🟢 BUY ' : '🔴 SELL';
        const coinLabel = trade.trading_pair.replace('USDT', '');
        const pnlStr = trade.realized_pnl != null ? ` PnL=$${trade.realized_pnl.toFixed(2)}` : '';
        console.log(`\n    ${sideLabel} ${coinLabel} ${trade.quantity} @ $${trade.price.toFixed(2)}${pnlStr}`);
      } else {
        errors.push(`${uidShort}: Trade insert failed`);
        console.log('\n    ❌ FAILED');
      }
    }

    if (tradesMade.length > 0) {
      const sessionUpdate = updateSessionStats(session, tradesMade);
      await apiPatch('trading_sessions', sessionUpdate, { id: `eq.${session.id}` });

      const accountUpdate = updatePaperAccount(account, tradesMade);
      await apiPatch('paper_accounts', accountUpdate, { user_id: `eq.${userId}` });

      successUsers++;
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log(`RESULT: ${totalTrades} trades across ${successUsers}/${traders.length} users`);
  if (errors.length > 0) {
    console.log('ERRORS:');
    for (const e of errors) console.log(`  - ${e}`);
  } else {
    console.log('Status: ALL OK');
  }
  console.log('='.repeat(60));

  if (errors.length > 0) process.exit(1);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

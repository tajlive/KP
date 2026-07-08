import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { randomUUID, randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = '/Users/taj/klarpakke/.env.local';
const envRaw = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
    val = val.slice(1, -1);
  env[key] = val;
}

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.pskhryjzkobytnfwucrb:' + env.POSTGRES_PASSWORD + '@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=no-verify',
  max: 5,
  connectionTimeoutMillis: 15000
});

const MARKET = { BTC: 87500.00, ETH: 4200.00, SOL: 185.00 };
const SYMBOLS = ['BTC', 'ETH', 'SOL'];
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function nowISO() { return new Date().toISOString(); }
function uniqSuffix() { return randomBytes(4).toString('hex'); }

async function getOrCreateSession(client, uid, symbol, capital) {
  const { rows } = await client.query(
    'SELECT id FROM public.trading_sessions WHERE user_id = $1 AND trading_pair = $2 AND status = \'active\' LIMIT 1',
    [uid, PAIRS[symbol]]
  );
  if (rows.length > 0) return rows[0].id;

  const sid = randomUUID();
  await client.query(
    'INSERT INTO public.trading_sessions (id, user_id, mode, status, strategy_id, strategy_config, trading_pair, risk_level, current_capital, initial_capital, total_trades, winning_trades, losing_trades, total_pnl, last_heartbeat, crash_count, started_at, created_at, updated_at, is_leaderboard_visible) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)',
    [sid, uid, 'paper', 'active', 'cron_' + uniqSuffix(), JSON.stringify({}), PAIRS[symbol], 'balanced', capital, capital, 0, 0, 0, 0, nowISO(), 0, nowISO(), nowISO(), nowISO(), false]
  );
  return sid;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('[' + nowISO() + '] Auto-trading cron STARTED');

    const TEST_EMAILS = [
      'ola.nordmann@klarpakke.test', 'kari.aas@klarpakke.test',
      'bjorn.fjell@klarpakke.test', 'ingrid.sol@klarpakke.test',
      'lars.vik@klarpakke.test', 'marte.hav@klarpakke.test',
      'per.berg@klarpakke.test', 'silje.lund@klarpakke.test',
      'trond.dal@klarpakke.test', 'anne.mo@klarpakke.test',
    ];

    const { rows: authUsers } = await client.query(
      'SELECT id, email FROM auth.users WHERE email = ANY($1)', [TEST_EMAILS]
    );

    if (authUsers.length === 0) { console.log('No test users found.'); return; }
    console.log('Found ' + authUsers.length + ' test users');

    const userIds = authUsers.map(u => u.id);
    const userMap = new Map(authUsers.map(u => [u.id, u.email]));

    const { rows: paperAccounts } = await client.query(
      'SELECT * FROM public.paper_accounts WHERE user_id = ANY($1)', [userIds]
    );
    const accountMap = new Map(paperAccounts.map(pa => [pa.user_id, pa]));

    let totalTrades = 0;
    const results = [];
    const now = nowISO();

    for (const uid of userIds) {
      const email = userMap.get(uid);
      const account = accountMap.get(uid);
      if (!account) { console.log('No paper account for ' + email); continue; }

      const numTrades = Math.random() < 0.5 ? 1 : 2;

      for (let t = 0; t < numTrades; t++) {
        const symbol = pick(SYMBOLS);
        const marketPrice = MARKET[symbol];
        const side = pick(['buy', 'sell']);
        const price = Math.round((marketPrice * (1 + rand(-0.015, 0.015))) * 100) / 100;

        let quantity;
        if (symbol === 'BTC') quantity = Math.round(rand(0.001, 0.05) * 100000) / 100000;
        else if (symbol === 'ETH') quantity = Math.round(rand(0.05, 2.0) * 1000) / 1000;
        else quantity = Math.round(rand(1, 20) * 10) / 10;

        const totalValue = Math.round(price * quantity * 100) / 100;
        const isProfitable = Math.random() < 0.60;
        let realizedPnl = isProfitable
          ? Math.round(rand(5, 250) * 100) / 100
          : Math.round(rand(-200, -5) * 100) / 100;

        const tradeId = randomUUID();
        const idempotencyKey = randomUUID();
        const fee = Math.round(totalValue * 0.001 * 100) / 100;
        const sessionId = await getOrCreateSession(client, uid, symbol, account.current_balance);

        await client.query(
          'INSERT INTO public.trades (id, session_id, user_id, mode, trading_pair, side, order_type, quantity, price, total_value, fee, status, is_copy, is_mock, idempotency_key, idempotency_scope, realized_pnl, reason_code, reason_params, executed_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)',
          [tradeId, sessionId, uid, 'paper', PAIRS[symbol], side, 'market', quantity, price, totalValue, fee, 'filled', false, true, idempotencyKey, 'auto_trading_cron', realizedPnl, 'cron_auto', JSON.stringify({ source: 'auto_trading_cron', run: now }), now, now]
        );

        const newBalance = account.current_balance + realizedPnl;
        const newTotalPnl = (account.total_profit_loss || 0) + realizedPnl;
        const newWinCount = isProfitable ? (account.win_count || 0) + 1 : (account.win_count || 0);
        const newLossCount = !isProfitable ? (account.loss_count || 0) + 1 : (account.loss_count || 0);

        await client.query(
          'UPDATE public.paper_accounts SET current_balance = $1, total_profit_loss = $2, win_count = $3, loss_count = $4, updated_at = $5 WHERE id = $6',
          [Math.round(newBalance * 100) / 100, Math.round(newTotalPnl * 100) / 100, newWinCount, newLossCount, now, account.id]
        );

        account.current_balance = newBalance;
        account.total_profit_loss = newTotalPnl;
        account.win_count = newWinCount;
        account.loss_count = newLossCount;
        totalTrades++;

        results.push({ user: email, symbol, side, price, quantity, totalValue, pnl: realizedPnl, isProfitable });
      }
    }

    console.log('');
    console.log('DONE: ' + totalTrades + ' trades across ' + authUsers.length + ' users');
    console.log('----------------------------------------------------------------------');
    const prof = results.filter(r => r.isProfitable).length;
    const unprof = results.filter(r => !r.isProfitable).length;
    console.log('  Profitable: ' + prof + '  |  Unprofitable: ' + unprof);

    for (const r of results) {
      const emoji = r.isProfitable ? 'GREEN' : 'RED';
      const sign = r.pnl >= 0 ? '+' : '';
      console.log('  [' + emoji + '] ' + r.user.padEnd(28) + ' ' + r.side.padEnd(4) + ' ' + r.symbol.padEnd(4) + ' ' + String(r.quantity).padEnd(10) + ' @ $' + String(r.price).padEnd(14) + ' PnL: ' + sign + '$' + r.pnl);
    }
    console.log('----------------------------------------------------------------------');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

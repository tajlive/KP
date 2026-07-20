import { randomUUID, randomBytes } from 'crypto';
import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

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
  connectionTimeoutMillis: 15000,
});

// Live market prices (July 20, 2026, Binance)
const MARKET = { BTC: 65510, ETH: 1900.69, SOL: 77.62 };
const SYMBOLS = ['BTC', 'ETH', 'SOL'];
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };

function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function nowISO() { return new Date().toISOString(); }
function uniqSuffix() { return randomBytes(4).toString('hex'); }

const TEST_EMAILS = [
  'ola.nordmann@klarpakke.test', 'kari.aas@klarpakke.test',
  'bjorn.fjell@klarpakke.test', 'ingrid.sol@klarpakke.test',
  'lars.vik@klarpakke.test', 'marte.hav@klarpakke.test',
  'per.berg@klarpakke.test', 'silje.lund@klarpakke.test',
  'trond.dal@klarpakke.test', 'anne.mo@klarpakke.test',
];

async function getMatchingSessions(client, userIds) {
  const { rows } = await client.query(
    'SELECT id, user_id, trading_pair FROM public.trading_sessions WHERE user_id = ANY($1) AND mode = \'paper\' AND status = \'active\'',
    [userIds]
  );
  const map = new Map();
  for (const s of rows) {
    if (!map.has(s.user_id)) map.set(s.user_id, []);
    map.get(s.user_id).push(s);
  }
  return map;
}

async function main() {
  const client = await pool.connect();
  try {
    const now = nowISO();
    console.log('[' + now + '] Auto-trading cron STARTED');

    // Get test users
    const { rows: users } = await client.query(
      'SELECT id, email FROM auth.users WHERE email = ANY($1)', [TEST_EMAILS]
    );
    if (users.length === 0) { console.log('No test users found.'); return; }
    console.log('Found ' + users.length + ' test users');

    const userIds = users.map(u => u.id);
    const userMap = new Map(users.map(u => [u.id, u.email]));

    // Get paper accounts
    const { rows: paperAccounts } = await client.query(
      'SELECT * FROM public.paper_accounts WHERE user_id = ANY($1)', [userIds]
    );
    const accountMap = new Map(paperAccounts.map(pa => [pa.user_id, pa]));

    // Get active sessions
    const sessionMap = await getMatchingSessions(client, userIds);

    let totalTrades = 0;
    const results = [];

    for (const uid of userIds) {
      const email = userMap.get(uid);
      const account = accountMap.get(uid);
      if (!account) { console.log('  SKIP ' + email + ': no paper account'); continue; }

      const sessions = sessionMap.get(uid) || [];
      if (sessions.length === 0) { console.log('  SKIP ' + email + ': no active session'); continue; }

      const numTrades = Math.random() < 0.5 ? 1 : 2;

      for (let t = 0; t < numTrades; t++) {
        const symbol = pick(SYMBOLS);
        const marketPrice = MARKET[symbol];
        const side = pick(['buy', 'sell']);
        const jitterPct = rand(-0.015, 0.015);
        const price = Math.round(marketPrice * (1 + jitterPct) * 100) / 100;

        let quantity;
        if (symbol === 'BTC') quantity = Math.round(rand(0.001, 0.08) * 1000000) / 1000000;
        else if (symbol === 'ETH') quantity = Math.round(rand(0.05, 2.5) * 1000) / 1000;
        else quantity = Math.round(rand(1, 25) * 10) / 10;

        const totalValue = Math.round(price * quantity * 100) / 100;
        const fee = Math.round(totalValue * 0.001 * 100) / 100;

        // ~58% profitable (realistic: some users win, some lose)
        const isProfitable = Math.random() < 0.58;
        let realizedPnl;
        if (side === 'buy') {
          // Buy: profit means price went up
          realizedPnl = isProfitable
            ? Math.round(rand(8, 300) * 100) / 100
            : Math.round(rand(-280, -5) * 100) / 100;
        } else {
          // Sell: profit means price went down from purchase
          realizedPnl = isProfitable
            ? Math.round(rand(8, 300) * 100) / 100
            : Math.round(rand(-280, -5) * 100) / 100;
        }

        // Pick a session for this coin pair, or any session
        const matchingSessions = sessions.filter(s => s.trading_pair === PAIRS[symbol] || s.trading_pair === symbol + 'USDT');
        const session = matchingSessions.length > 0 ? pick(matchingSessions) : pick(sessions);

        const tradeId = randomUUID();
        const idempotencyKey = 'cron_' + randomUUID().slice(0, 8);

        await client.query(
          `INSERT INTO public.trades
           (id, session_id, user_id, mode, trading_pair, side, order_type, quantity, price,
            total_value, fee, status, is_copy, is_mock, idempotency_key, idempotency_scope,
            realized_pnl, reason_code, reason_params, executed_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
          [tradeId, session.id, uid, 'paper', PAIRS[symbol], side, 'market', quantity, price,
           totalValue, fee, 'filled', false, true, idempotencyKey, 'auto_trading_cron',
           realizedPnl, 'cron_auto', JSON.stringify({ source: 'auto_trading_cron', run: now }), now, now]
        );

        // Update paper account
        const newBalance = Math.round((parseFloat(account.current_balance) + realizedPnl - fee) * 100) / 100;
        const newTotalPnl = Math.round(((parseFloat(account.total_profit_loss) || 0) + realizedPnl) * 100) / 100;
        const newWinCount = isProfitable ? (account.win_count || 0) + 1 : (account.win_count || 0);
        const newLossCount = !isProfitable ? (account.loss_count || 0) + 1 : (account.loss_count || 0);

        await client.query(
          'UPDATE public.paper_accounts SET current_balance = $1, total_profit_loss = $2, win_count = $3, loss_count = $4, updated_at = $5 WHERE id = $6',
          [newBalance, newTotalPnl, newWinCount, newLossCount, now, account.id]
        );

        account.current_balance = newBalance;
        account.total_profit_loss = newTotalPnl;
        account.win_count = newWinCount;
        account.loss_count = newLossCount;
        totalTrades++;

        results.push({
          user: email,
          symbol,
          side,
          price,
          quantity,
          totalValue,
          fee,
          pnl: realizedPnl,
          isProfitable,
          newBalance,
        });
      }
    }

    // Summary
    const prof = results.filter(r => r.isProfitable).length;
    const unprof = results.filter(r => !r.isProfitable).length;
    console.log('');
    console.log('=================================================');
    console.log('DONE: ' + totalTrades + ' trades across ' + users.length + ' users');
    console.log('Profitable: ' + prof + '  |  Unprofitable: ' + unprof);
    console.log('=================================================');
    for (const r of results) {
      const emoji = r.isProfitable ? '🟢' : '🔴';
      const sign = r.pnl >= 0 ? '+' : '';
      console.log(
        '  ' + emoji + ' ' + r.user.padEnd(28) +
        ' ' + r.side.toUpperCase().padEnd(5) +
        ' ' + r.symbol.padEnd(4) +
        ' ' + String(r.quantity).padEnd(12) +
        ' @ $' + String(r.price).padEnd(14) +
        ' | PnL: ' + sign + '$' + String(r.pnl).padEnd(10) +
        ' | Bal: $' + r.newBalance
      );
    }
    console.log('=================================================');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

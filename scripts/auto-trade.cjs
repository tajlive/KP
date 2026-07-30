const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

if (!url || !key) { console.error('Missing env vars'); process.exit(1); }

const supabase = createClient(url, key);

const REF_PRICES = {
  BTCUSDT: { price: 61500, minQty: 0.001, maxVal: 3000 },
  ETHUSDT: { price: 1950, minQty: 0.01, maxVal: 2000 },
  SOLUSDT: { price: 73.5, minQty: 0.1, maxVal: 2000 },
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const { data: accounts, error } = await supabase
    .from('paper_accounts')
    .select('user_id, current_balance, initial_balance, total_profit_loss')
    .order('total_profit_loss', { ascending: false });

  if (error) { console.error('Error:', error); process.exit(1); }

  const userIds = accounts
    .filter(a => a.user_id !== 'db00be5b-2558-44fe-a5e3-b3af5f22c3bc')
    .filter(a => a.current_balance > 5000)
    .slice(0, 10)
    .map(a => a.user_id);

  console.log(`Selected ${userIds.length} users`);

  const { data: existingSessions } = await supabase
    .from('trading_sessions')
    .select('user_id, id, status')
    .in('user_id', userIds)
    .in('status', ['stopped', 'paused']);

  const sessionByUser = {};
  if (existingSessions) {
    existingSessions.forEach(s => {
      if (!sessionByUser[s.user_id]) sessionByUser[s.user_id] = [];
      sessionByUser[s.user_id].push(s.id);
    });
  }

  let totalTrades = 0, buyCount = 0, sellCount = 0;
  let profitCount = 0, lossCount = 0;
  const results = [];

  for (const userId of userIds) {
    const numTrades = randInt(1, 2);
    const account = accounts.find(a => a.user_id === userId);
    const balance = account?.current_balance || 100000;
    let currentBalance = balance;

    for (let t = 0; t < numTrades; t++) {
      const coin = pickRandom(Object.keys(REF_PRICES));
      const ref = REF_PRICES[coin];
      const price = Math.round(ref.price * (1 + rand(-0.05, 0.05)) * 100) / 100;
      const side = Math.random() < 0.6 ? 'buy' : 'sell';
      const tradeValue = Math.max(1, Math.round(currentBalance * rand(0.005, 0.03)));
      const maxVal = Math.min(ref.maxVal, tradeValue);
      const fee = Math.round(maxVal * 0.001 * 100) / 100;
      const quantity = Math.round((maxVal / price) * 100000) / 100000;

      let sessionId;
      const userSessions = sessionByUser[userId];
      if (userSessions && userSessions.length > 0) {
        sessionId = userSessions.shift();
      } else {
        sessionId = crypto.randomUUID();
      }

      const now = new Date().toISOString();

      let realizedPnl = null;
      if (side === 'sell') {
        realizedPnl = Math.random() < 0.55
          ? Math.round(rand(10, maxVal * 0.15) * 100) / 100
          : Math.round(rand(-maxVal * 0.1, -5) * 100) / 100;
      }

      const tradeId = crypto.randomUUID();
      const { error: te } = await supabase.from('trades').insert({
        id: tradeId,
        session_id: sessionId,
        user_id: userId,
        idempotency_key: `${sessionId}-${coin}-${side}-${now}`,
        idempotency_scope: 'trade',
        mode: 'paper',
        trading_pair: coin,
        side: side,
        order_type: 'market',
        quantity: quantity,
        price: price,
        total_value: Math.round(maxVal * 100) / 100,
        fee: fee,
        status: 'filled',
        is_copy: false,
        is_mock: false,
        realized_pnl: realizedPnl,
        executed_at: now,
        created_at: now,
        metadata: {},
        usdt_nok_rate: 9.66,
        venue: 'binance',
        filled_quantity: quantity,
        joker_trade: false,
      });

      if (te) {
        console.error(`  ❌ Trade err ${userId.substring(0,8)}/${coin}: ${te.message}`);
        continue;
      }

      totalTrades++;
      if (side === 'buy') buyCount++;
      else sellCount++;
      if (realizedPnl !== null) {
        if (realizedPnl > 0) profitCount++;
        else lossCount++;
      }

      const balanceChange = realizedPnl !== null ? realizedPnl : -maxVal;
      currentBalance += balanceChange;

      await supabase.from('paper_accounts').update({
        current_balance: Math.round(currentBalance * 100) / 100,
        updated_at: now,
        total_profit_loss: Math.round(((account?.total_profit_loss || 0) + (realizedPnl || 0)) * 100) / 100,
      }).eq('user_id', userId);

      results.push({
        user: userId.substring(0,8),
        coin, side,
        value: maxVal,
        pnl: realizedPnl ? (realizedPnl >= 0 ? `+${realizedPnl} kr` : `${realizedPnl} kr`) : '(åpen kjøp)',
      });

      await new Promise(r => setTimeout(r, 150));
    }
  }

  console.log(`\n✅ Auto-trading ferdig — ${totalTrades} trades`);
  console.log(`Kjøp: ${buyCount}, Salg: ${sellCount}`);
  console.log(`Lønnsomme salg: ${profitCount}, Tapsalg: ${lossCount}`);
  console.log('');
  results.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.user} | ${r.side.toUpperCase()} ${r.coin} | ${r.value} kr | ${r.pnl}`);
  });
}

main().catch(console.error);

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = 'https://pskhryjzkobytnfwucrb.supabase.co';
const SUPABASE_KEY = 'sb_secret_uoYuM8LtYDm9nypkkel0Ew_2ocT3Zwp';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COINS = {
  BTCUSDT: { price: 62948.46, minQty: 0.0001, maxQty: 0.005, step: 0.00001 },
  ETHUSDT: { price: 1753.31, minQty: 0.01, maxQty: 0.3, step: 0.0001 },
  SOLUSDT: { price: 78.32, minQty: 0.1, maxQty: 5.0, step: 0.01 },
};

const USDT_NOK_RATE = 10.65;

const USERS = [
  { name: 'Ola Nordmann',  userId: '67db9b24-3c98-4196-9f88-e70c2c164a03', sessionId: '1623500c-3943-41f2-9c2a-47443a4d8071', paperId: 'bc54fd3f-30c8-45a4-9ba3-55d136a0dc44', balance: 138971.10 },
  { name: 'Kari Aas',      userId: 'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', sessionId: '1bac6922-a594-4b30-91c2-657c7439c1c3', paperId: '49543181-407d-4d9f-8578-7d8acbe062cf', balance: 58436.70 },
  { name: 'Bjørn Fjell',   userId: '4bd58f81-c41c-49ca-a712-b5aecbc8548d', sessionId: 'bb6b7e6c-1b65-4a52-837f-67bdfff723e3', paperId: '38eea3c7-3fec-46cf-b295-dc18d32790b6', balance: 76070.59 },
  { name: 'Ingrid Sol',    userId: '4211b1c7-2b0d-4a55-b397-a10b3ae598a7', sessionId: 'ad3bf442-7e87-4151-b2df-90825e68e392', paperId: '5e8df6a9-d3c8-47d4-b953-63c41c3ca65d', balance: 79963.24 },
  { name: 'Lars Vik',      userId: '241e1133-c895-4e64-a02f-447af4ea90b6', sessionId: '48e05651-ecda-45cf-ab81-5d67252f1029', paperId: 'bf582ba5-2266-41ca-80d0-899e4f446cd4', balance: -588798.36 },
  { name: 'Marte Hav',     userId: '10de2b9b-62c3-43a0-8d83-c1e38aecba5d', sessionId: '979a3611-bc33-4fa2-83f6-0e59c9788302', paperId: '4b1c934c-e69c-4236-bdf1-82794e066026', balance: 72443.50 },
  { name: 'Per Berg',      userId: 'd4480fda-6c67-4e77-b4a3-ad4b7d00f652', sessionId: '51f356fa-cf83-4d77-b595-8d6fc8d4e194', paperId: 'a201cf15-08ff-474f-8374-c086bad156a7', balance: 110956.63 },
  { name: 'Silje Lund',    userId: '165b894d-f747-4c1a-8ca1-1e9e2df0925a', sessionId: '1a0991e6-87cc-48aa-b578-ce80e26d9544', paperId: '3dab4558-c246-4284-b23c-c6c44ba1f202', balance: 72565.74 },
  { name: 'Trond Dal',     userId: 'f4d68672-d994-4d4b-855a-36f39c71d09d', sessionId: '86cce17c-e4b9-4eb1-a949-40ab874b897a', paperId: 'fd509d52-11ae-4cd4-ae9b-40f33bc32d73', balance: 80535.62 },
  { name: 'Anne Mo',       userId: '7734a444-0094-4a8a-9744-cd09c2a2cfd2', sessionId: '1726054d-1f2c-4bc3-8e06-76953f958383', paperId: 'e9dcd5db-9dae-4514-89e7-3361ce59d29a', balance: 567216.22 },
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function roundTo(value, step) { return Math.round(value / step) * step; }

function generateTrade(user, coinSymbol, coin, isWinner) {
  const marketPrice = coin.price;
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  const variation = rand(0.005, 0.03);
  
  let price, realizedPnl = null;
  
  if (isWinner) {
    price = side === 'buy' ? marketPrice * (1 - variation) : marketPrice * (1 + variation);
  } else {
    price = side === 'buy' ? marketPrice * (1 + variation) : marketPrice * (1 - variation);
  }
  
  price = roundTo(price, 0.01);
  const quantity = roundTo(rand(coin.minQty, coin.maxQty), coin.step);
  const totalValue = roundTo(price * quantity, 0.01);
  
  if (side === 'sell') {
    realizedPnl = isWinner ? roundTo(totalValue * rand(0.01, 0.08), 0.01) : roundTo(-totalValue * rand(0.01, 0.06), 0.01);
  }
  
  return {
    idempotency_key: randomUUID(),
    user_id: user.userId,
    session_id: user.sessionId,
    mode: 'paper',
    trading_pair: coinSymbol,
    side,
    order_type: 'market',
    quantity,
    price,
    total_value: totalValue,
    fee: 0,
    status: 'filled',
    is_copy: false,
    is_mock: true,
    usdt_nok_rate: USDT_NOK_RATE,
    venue: 'binance',
    idempotency_scope: 'trade',
    realized_pnl: realizedPnl,
    reason_code: 'auto_trade_cron',
    reason_params: { source: 'klarpakke_auto_trade_cron', winner: isWinner },
    executed_at: new Date().toISOString(),
    strategy_signal: isWinner ? 'bullish_divergence' : 'bearish_divergence',
    metadata: { auto_generated: true, cron_run: new Date().toISOString() },
  };
}

async function run() {
  console.log('=== KLARPAKKE AUTO-TRADE CRON ===');
  console.log('Run:', new Date().toISOString());
  console.log('Market: BTC=$' + COINS.BTCUSDT.price + ' ETH=$' + COINS.ETHUSDT.price + ' SOL=$' + COINS.SOLUSDT.price);
  console.log('');
  
  const allTrades = [];
  
  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    const numTrades = randInt(1, 2);
    const isWinner = Math.random() > 0.45;
    
    for (let t = 0; t < numTrades; t++) {
      const coinSymbol = pick(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
      const coin = COINS[coinSymbol];
      const trade = generateTrade(user, coinSymbol, coin, isWinner);
      trade._user_name = user.name;
      trade._winner = isWinner;
      trade._idx = i;
      allTrades.push(trade);
    }
  }
  
  console.log(allTrades.length + ' trades:');
  for (const t of allTrades) {
    console.log('  ' + t._user_name + ': ' + t.side.toUpperCase() + ' ' + t.quantity + ' ' + t.trading_pair + ' @ $' + t.price.toFixed(2) + ' [' + (t._winner ? 'WIN' : 'LOSS') + ']');
  }
  
  // Insert trades
  const insertData = allTrades.map(t => {
    const { _user_name, _winner, _idx, ...rest } = t;
    return rest;
  });
  
  console.log('\nInserting...');
  const { data, error } = await supabase.from('trades').insert(insertData).select('id');
  
  if (error) {
    console.error('❌ INSERT FAILED:', JSON.stringify(error, null, 2));
    return;
  }
  
  console.log('✅ Inserted ' + data.length + ' trades');
  
  // Update paper balances + win/loss counts
  const balanceUpdates = [];
  for (const t of allTrades) {
    const u = USERS[t._idx];
    const delta = t.side === 'buy' ? -t.total_value : t.total_value;
    const newBalance = roundTo(u.balance + delta, 0.01);
    const countField = t._winner ? 'win_count' : 'loss_count';
    
    // Get current count
    const { data: curr } = await supabase.from('paper_accounts').select(countField).eq('id', u.paperId).single();
    const newCount = (curr?.[countField] || 0) + 1;
    
    balanceUpdates.push({
      paperId: u.paperId,
      newBalance,
      countField,
      newCount,
      name: u.name,
      oldBalance: u.balance,
      delta
    });
    
    u.balance = newBalance; // for subsequent trades of same user
  }
  
  // Deduplicate balance updates per paper account (take last balance)
  const finalBalances = {};
  const countIncrements = {};
  for (const bu of balanceUpdates) {
    finalBalances[bu.paperId] = { balance: bu.newBalance, name: bu.name, oldBalance: bu.oldBalance };
    if (!countIncrements[bu.paperId]) countIncrements[bu.paperId] = { win_count: 0, loss_count: 0 };
    countIncrements[bu.paperId][bu.countField]++;
  }
  
  for (const [paperId, info] of Object.entries(finalBalances)) {
    const inc = countIncrements[paperId] || { win_count: 0, loss_count: 0 };
    
    // Get current counts first
    const { data: curr } = await supabase.from('paper_accounts').select('win_count, loss_count').eq('id', paperId).single();
    
    const updateData = {
      current_balance: info.balance,
      updated_at: new Date().toISOString(),
      win_count: (curr?.win_count || 0) + inc.win_count,
      loss_count: (curr?.loss_count || 0) + inc.loss_count,
    };
    
    const { error: updErr } = await supabase.from('paper_accounts').update(updateData).eq('id', paperId);
    
    if (updErr) {
      console.error('  ❌ Balance update failed for ' + info.name + ':', updErr.message);
    } else {
      const delta = info.balance - info.oldBalance;
      console.log('  ' + info.name + ': $' + info.oldBalance.toFixed(2) + ' → $' + info.balance.toFixed(2) + ' (' + (delta >= 0 ? '+' : '') + delta.toFixed(2) + ') W+' + inc.win_count + ' L+' + inc.loss_count);
    }
  }
  
  console.log('\n✅ Auto-trade cron completed successfully');
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

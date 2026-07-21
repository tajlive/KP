// Hermes cron: auto-trading for de 10 norske testbrukerne (@klarpakke.test)
// Bruker SUPABASE_SERVICE_ROLE_KEY fra .env.local
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

const envRaw = readFileSync('/Users/taj/klarpakke/.env.local', 'utf-8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}

const supabase = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SYMBOLS = ['BTC', 'ETH', 'SOL'];
const PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT' };
const FALLBACK = { BTC: 65065.69, ETH: 1894.64, SOL: 77.41 };
const FALLBACK_USDT_NOK = 9.65;

// Verifisert mot auth.users 2026-07-20 (10 norske testbrukere)
const VERIFIED_USERS = {
  'anne.mo@klarpakke.test': '7734a444-0094-4a8a-9744-cd09c2a2cfd2',
  'bjorn.fjell@klarpakke.test': '4bd58f81-c41c-49ca-a712-b5aecbc8548d',
  'ingrid.sol@klarpakke.test': '4211b1c7-2b0d-4a55-b397-a10b3ae598a7',
  'kari.aas@klarpakke.test': 'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8',
  'lars.vik@klarpakke.test': '241e1133-c895-4e64-a02f-447af4ea90b6',
  'marte.hav@klarpakke.test': '10de2b9b-62c3-43a0-8d83-c1e38aecba5d',
  'ola.nordmann@klarpakke.test': '67db9b24-3c98-4196-9f88-e70c2c164a03',
  'per.berg@klarpakke.test': 'd4480fda-6c67-4e77-b4a3-ad4b7d00f652',
  'silje.lund@klarpakke.test': '165b894d-f747-4c1a-8ca1-1e9e2df0925a',
  'trond.dal@klarpakke.test': 'f4d68672-d994-4d4b-855a-36f39c71d09d',
};

const rand = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r2 = (x) => Math.round(x * 100) / 100;

async function getUsdtNok() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=NOK');
    const data = await res.json();
    const rate = data?.rates?.NOK;
    if (rate && rate > 5 && rate < 20) return rate;
    throw new Error('bad rate');
  } catch {
    console.log('WARN: FX fetch failed, using fallback USDT/NOK ' + FALLBACK_USDT_NOK);
    return FALLBACK_USDT_NOK;
  }
}

async function getMarketPrices() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D');
    const data = await res.json();
    const m = {};
    for (const d of data) m[d.symbol.replace('USDT', '')] = parseFloat(d.price);
    if (m.BTC && m.ETH && m.SOL) return m;
    throw new Error('incomplete');
  } catch {
    console.log('WARN: Binance fetch failed, using fallback prices');
    return FALLBACK;
  }
}

async function main() {
  const now = new Date().toISOString();
  console.log(`[${now}] Hermes auto-trade cron START`);

  const MARKET = await getMarketPrices();
  const USDT_NOK = await getUsdtNok();
  console.log(`Market: BTC $${MARKET.BTC} | ETH $${MARKET.ETH} | SOL $${MARKET.SOL} | USDT/NOK ${USDT_NOK}`);

  // Finn de 10 norske testbrukerne (fallback til verifisert mapping hvis Admin API er nede)
  let testUsers;
  try {
    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (uErr) throw uErr;
    testUsers = users.filter(u => u.email in VERIFIED_USERS).map(u => ({ id: u.id, email: u.email }));
  } catch (e) {
    console.log('WARN: Auth Admin API feilet, bruker verifisert ID-mapping');
    testUsers = Object.entries(VERIFIED_USERS).map(([email, id]) => ({ id, email }));
  }
  if (testUsers.length !== 10) throw new Error(`Forventet 10 testbrukere, fant ${testUsers.length}`);

  // Idempotens: hopp over brukere som allerede har fått cron-trade siste 45 min (denne kjøringen)
  const since = new Date(Date.now() - 45*60e3).toISOString();
  const { data: recent } = await supabase.from('trades').select('user_id').eq('idempotency_scope','auto_trading_cron').gte('created_at', since);
  const doneSet = new Set((recent||[]).map(r => r.user_id));
  testUsers = testUsers.filter(u => !doneSet.has(u.id));
  console.log(`Gjenstår ${testUsers.length} brukere uten trade i denne kjøringen`);
  if (testUsers.length === 0) { console.log('INGENTING Å GJØRE – alle brukere allerede tradet'); return; }
  console.log(`Fant ${testUsers.length} testbrukere`);

  const userIds = testUsers.map(u => u.id);
  const { data: accounts, error: aErr } = await supabase.from('paper_accounts').select('*').in('user_id', userIds);
  if (aErr) throw aErr;
  const accMap = new Map(accounts.map(a => [a.user_id, a]));

  // Handelsplan: 1-2 handler per bruker, garantert miks av vinnere/tapere
  const plan = [];
  for (const u of testUsers) {
    const n = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) plan.push({ user: u });
  }
  const outcomes = plan.map(() => Math.random() < 0.55);
  while (outcomes.filter(Boolean).length < 3) outcomes[Math.floor(Math.random() * outcomes.length)] = true;
  while (outcomes.filter(x => !x).length < 3) outcomes[Math.floor(Math.random() * outcomes.length)] = false;
  plan.forEach((p, i) => p.profitable = outcomes[i]);

  const results = [];
  for (const p of plan) {
    const { user, profitable } = p;
    const account = accMap.get(user.id);
    if (!account) { console.log(`  SKIP ${user.email}: ingen paper account`); continue; }

    const symbol = pick(SYMBOLS);
    const side = pick(['buy', 'sell']);
    const price = r2(MARKET[symbol] * USDT_NOK * (1 + rand(-0.015, 0.015)));
    let quantity;
    if (symbol === 'BTC') quantity = Math.round(rand(0.001, 0.08) * 1e6) / 1e6;
    else if (symbol === 'ETH') quantity = Math.round(rand(0.05, 2.5) * 1e3) / 1e3;
    else quantity = Math.round(rand(1, 25) * 10) / 10;
    const totalValue = r2(price * quantity);
    const fee = r2(totalValue * 0.001);
    const realizedPnl = profitable ? r2(rand(50, 800)) : r2(rand(-750, -40));

    // Gjenbruk aktiv session hvis den finnes (unik indeks på user+pair+strategi)
    let session, createdSession = false;
    const { data: existing } = await supabase.from('trading_sessions').select('id')
      .eq('user_id', user.id).eq('trading_pair', PAIRS[symbol]).eq('strategy_id', 'dca').eq('status', 'active').limit(1).maybeSingle();
    if (existing) {
      session = existing;
    } else {
      const { data: ns, error: sErr } = await supabase.from('trading_sessions').insert({
        user_id: user.id, mode: 'paper', status: 'active', trading_pair: PAIRS[symbol],
        strategy_id: 'dca', current_capital: account.current_balance, initial_capital: account.initial_balance,
        current_capital_nok: account.current_balance, starting_capital_nok: account.current_balance,
      }).select('id').single();
      if (sErr) throw sErr;
      session = ns; createdSession = true;
    }

    const { error: tErr } = await supabase.from('trades').insert({
      id: randomUUID(), session_id: session.id, user_id: user.id, mode: 'paper',
      trading_pair: PAIRS[symbol], side, order_type: 'market', quantity, price,
      total_value: totalValue, fee, status: 'filled', is_copy: false, is_mock: true,
      idempotency_key: 'hermes_' + randomUUID().slice(0, 8), idempotency_scope: 'auto_trading_cron',
      realized_pnl: realizedPnl, usdt_nok_rate: USDT_NOK, reason_code: 'cron_auto',
      reason_params: { source: 'hermes_auto_trading_cron', run: now },
      executed_at: now, created_at: now,
    });
    if (tErr) throw tErr;

    const newBalance = r2(parseFloat(account.current_balance) + realizedPnl - fee);
    const newPnl = r2((parseFloat(account.total_profit_loss) || 0) + realizedPnl);
    const newWin = (account.win_count || 0) + (profitable ? 1 : 0);
    const newLoss = (account.loss_count || 0) + (profitable ? 0 : 1);
    const { error: pErr } = await supabase.from('paper_accounts').update({
      current_balance: newBalance, total_profit_loss: newPnl,
      win_count: newWin, loss_count: newLoss, updated_at: now,
    }).eq('id', account.id);
    if (pErr) throw pErr;

    if (createdSession) await supabase.from('trading_sessions').update({
      status: 'stopped', stopped_at: now, total_trades: 1,
      winning_trades: profitable ? 1 : 0, losing_trades: profitable ? 0 : 1, total_pnl: realizedPnl,
    }).eq('id', session.id);

    account.current_balance = newBalance; account.total_profit_loss = newPnl;
    account.win_count = newWin; account.loss_count = newLoss;
    results.push({ email: user.email, symbol, side, quantity, price, fee, pnl: realizedPnl, profitable, newBalance });
  }

  const wins = results.filter(r => r.profitable).length;
  console.log('');
  console.log('=================================================');
  console.log(`FERDIG: ${results.length} handler for ${testUsers.length} brukere | Vinnere: ${wins} | Tapere: ${results.length - wins}`);
  console.log('=================================================');
  for (const r of results) {
    const e = r.profitable ? '🟢' : '🔴';
    const s = r.pnl >= 0 ? '+' : '';
    console.log(` ${e} ${r.email.padEnd(30)} ${r.side.toUpperCase().padEnd(4)} ${r.symbol.padEnd(3)} ${String(r.quantity).padEnd(10)} @ ${String(r.price).padEnd(12)} kr PnL: ${s}${String(r.pnl).padEnd(9)} kr Bal: ${r.newBalance} kr`);
  }
  console.log('=================================================');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

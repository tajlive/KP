// Auto-trading simulasjon for 10 norske testbrukere (cron)
import { readFileSync } from 'node:fs';
import { randomInt, randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync('/Users/taj/klarpakke/.env.local', 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);
const URL = env.SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const USERS = [
  ['ola.nordmann@klarpakke.test', '67db9b24-3c98-4196-9f88-e70c2c164a03', '1c4e0ba4-239c-4da3-bb93-b1abb0130b46'],
  ['anne.mo@klarpakke.test',     '7734a444-0094-4a8a-9744-cd09c2a2cfd2', '4555a550-60a7-45a3-8203-641dc4840798'],
  ['kari.aas@klarpakke.test',    'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8', 'f471a5dc-cc4e-45cd-87b4-1a385cb2d5ef'],
  ['bjorn.fjell@klarpakke.test', '4bd58f81-c41c-49ca-a712-b5aecbc8548d', '2824a3e7-c5ef-4abb-859e-ff77cb4e445e'],
  ['ingrid.sol@klarpakke.test',  '4211b1c7-2b0d-4a55-b397-a10b3ae598a7', '28a2c3be-c826-41fb-93fe-eb257eeb9216'],
  ['lars.vik@klarpakke.test',    '241e1133-c895-4e64-a02f-447af4ea90b6', '7bffee6d-f616-4f02-a7c1-07776d596308'],
  ['marte.hav@klarpakke.test',   '10de2b9b-62c3-43a0-8d83-c1e38aecba5d', 'a207dd0a-f28f-4c08-8486-a5a2b237a4b7'],
  ['per.berg@klarpakke.test',    'd4480fda-6c67-4e77-b4a3-ad4b7d00f652', 'b8d15535-61a6-48f5-9489-b23837d21975'],
  ['silje.lund@klarpakke.test',  '165b894d-f747-4c1a-8ca1-1e9e2df0925a', '86f713cb-ccd4-4334-9796-a3010abc74e4'],
  ['trond.dal@klarpakke.test',   'f4d68672-d994-4d4b-855a-36f39c71d09d', '11c207f1-4784-4e9c-a9a9-2017cc78f195'],
];

const MARKET = { BTCUSDT: 620677.0, ETHUSDT: 17954.2, SOLUSDT: 734.98 };
const COINS = Object.keys(MARKET);
const r = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[randomInt(arr.length)];
const round = (n, d = 8) => Number(n.toFixed(d));

async function api(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: H, ...opts });
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path}: ${res.status} ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

let wins = 0, losses = 0, count = 0;
for (let i = 0; i < USERS.length; i++) {
  const [email, userId, sessionId] = USERS[i];
  const [acc] = await api(`paper_accounts?user_id=eq.${userId}&select=id,current_balance,total_profit_loss,win_count,loss_count`);
  let balance = Number(acc.current_balance);
  let plDelta = 0, wDelta = 0, lDelta = 0;

  const nTrades = randomInt(1, 3); // 1-2
  // Første trade er alltid SELL med forhåndsbestemt utfall (annenhver vinner/taper)
  const forcedWin = i % 2 === 0;
  for (let t = 0; t < nTrades; t++) {
    const pair = pick(COINS);
    const side = t === 0 ? 'sell' : (Math.random() < 0.5 ? 'buy' : 'sell');
    const market = MARKET[pair];
    const jitter = r(-0.004, 0.004);
    const slippage = side === 'buy' ? 0.002 : -0.002; // 0.2% slippage
    const price = round(market * (1 + jitter + slippage), 2);
    const spendPct = r(0.05, 0.12);
    const totalValue = round(balance * spendPct, 2);
    if (totalValue < 500) { console.log(`SKIP ${email}: for lav balanse`); continue; }
    const qty = round(totalValue / price);
    const fee = round(totalValue * 0.001, 2);
    const executedAt = new Date(Date.now() - randomInt(5, 120) * 1000).toISOString();

    // Tiltenkt realized PnL for SELL: vinnere +0.5–3%, tapere -3–-0.5% av total_value
    let intendedPnl = null;
    if (side === 'sell') {
      const isWin = t === 0 ? forcedWin : Math.random() < 0.5;
      const pct = isWin ? r(0.005, 0.03) : -r(0.005, 0.03);
      intendedPnl = round(totalValue * pct, 2);
    }

    const row = {
      session_id: sessionId, user_id: userId,
      idempotency_key: `${sessionId}-${pair}-${side}-${Date.now()}-${randomUUID().slice(0, 8)}`,
      idempotency_scope: 'trade', mode: 'paper', trading_pair: pair, side,
      order_type: 'market', quantity: qty, price, total_value: totalValue, fee,
      status: 'filled', is_copy: false, is_mock: false, usdt_nok_rate: 9.65,
      venue: 'binance', executed_at: executedAt,
      metadata: { source: 'auto-trade-cron', simulated: true },
    };
    if (intendedPnl !== null) row.realized_pnl = intendedPnl;

    const [ins] = await api('trades', { method: 'POST', body: JSON.stringify(row) });

    // Trigger kan ha overskrevet pnl fra rå posisjonsdata → patche til tiltenkt verdi
    if (intendedPnl !== null && Number(ins.realized_pnl) !== intendedPnl) {
      await api(`trades?id=eq.${ins.id}`, { method: 'PATCH', body: JSON.stringify({ realized_pnl: intendedPnl }) });
    }

    if (side === 'buy') {
      balance -= totalValue + fee;
    } else {
      balance += totalValue - fee;
      plDelta += intendedPnl;
      if (intendedPnl > 0) { wDelta++; wins++; } else { lDelta++; losses++; }
    }
    count++;
    console.log(`${email} ${side.toUpperCase()} ${qty} ${pair} @ ${price} = ${totalValue} NOK` + (intendedPnl !== null ? ` | pnl ${intendedPnl}` : ''));
  }

  await api(`paper_accounts?user_id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      current_balance: round(balance, 2),
      total_profit_loss: round(Number(acc.total_profit_loss || 0) + plDelta, 2),
      win_count: (acc.win_count || 0) + wDelta,
      loss_count: (acc.loss_count || 0) + lDelta,
      updated_at: new Date().toISOString(),
    }),
  });
}
console.log(`\nFerdig: ${count} handler, ${wins} vinnere, ${losses} tapere`);
if (wins === 0 || losses === 0) throw new Error('Krever både vinnere og tapere!');

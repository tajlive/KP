/**
 * Klarpakke auto-trade sim for 10 norske testbrukere (cron).
 * Genererer 1-2 paper-trades per bruker på BTC/ETH/SOL nær markedspris.
 * Bruker service role key fra .env.local mot PostgREST.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("/Users/taj/klarpakke/.env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
const SUPA_URL = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) { console.error("Mangler SUPABASE_URL/SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };

const USERS = [
  ["f4d68672-d994-4d4b-855a-36f39c71d09d", "Trond Dal"],
  ["10de2b9b-62c3-43a0-8d83-c1e38aecba5d", "Marte Hav"],
  ["eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8", "Kari Aas"],
  ["7734a444-0094-4a8a-9744-cd09c2a2cfd2", "Anne Mo"],
  ["4bd58f81-c41c-49ca-a712-b5aecbc8548d", "Bjørn Fjell"],
  ["4211b1c7-2b0d-4a55-b397-a10b3ae598a7", "Ingrid Sol"],
  ["241e1133-c895-4e64-a02f-447af4ea90b6", "Lars Vik"],
  ["d4480fda-6c67-4e77-b4a3-ad4b7d00f652", "Per Berg"],
  ["67db9b24-3c98-4196-9f88-e70c2c164a03", "Ola Nordmann"],
  ["165b894d-f747-4c1a-8ca1-1e9e2df0925a", "Silje Lund"],
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const runId = new Date().toISOString().slice(0, 10);

async function market() {
  let prices = { BTCUSDT: 65280, ETHUSDT: 1909, SOLUSDT: 77.9 };
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D");
    for (const { symbol, price } of await r.json()) prices[symbol] = parseFloat(price);
  } catch { console.warn("Binance feilet, bruker fallback-priser"); }
  let rate = 9.67;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const j = await r.json();
    if (j?.rates?.NOK) rate = j.rates.NOK;
  } catch { console.warn("FX feilet, bruker fallback USDT/NOK 9.67"); }
  return { prices, rate };
}

async function rest(path, opts = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: H, ...opts });
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${path} -> ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const { prices, rate } = await market();
console.log(`Priser: BTC=${prices.BTCUSDT} ETH=${prices.ETHUSDT} SOL=${prices.SOLUSDT} | USDT/NOK=${rate}`);

let wins = 0, losses = 0, total = 0;

for (const [userId, name] of USERS) {
  const [acct] = await rest(`paper_accounts?user_id=eq.${userId}&select=*`);
  if (!acct) { console.warn(`${name}: ingen paper_account, hopper over`); continue; }
  let balance = parseFloat(acct.current_balance);
  let pnl = parseFloat(acct.total_profit_loss);
  let wc = acct.win_count, lc = acct.loss_count;

  // Finn eller opprett aktiv paper-session (trades.session_id er NOT NULL)
  let [session] = await rest(`trading_sessions?user_id=eq.${userId}&mode=eq.paper&status=eq.active&order=started_at.desc&limit=1&select=id`);
  if (!session) {
    [session] = await rest("trading_sessions", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId, mode: "paper", status: "active", strategy_id: "dca",
        trading_pair: "BTCUSDT",
        current_capital: balance.toFixed(2), initial_capital: balance.toFixed(2),
        current_capital_nok: balance.toFixed(2), starting_capital_nok: balance.toFixed(2),
      }),
    });
  }
  const sessionId = session.id;

  const nTrades = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < nTrades; i++) {
    const pair = pick(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
    const side = Math.random() < 0.55 ? "buy" : "sell";
    const price = prices[pair] * (1 + rnd(-0.004, 0.004));
    const valueUsdt = (balance * rnd(0.02, 0.08)) / rate;
    const qty = valueUsdt / price;
    const totalValue = qty * price;
    const fee = totalValue * 0.001;

    let realizedPnl = null;
    if (side === "sell") {
      const isWin = Math.random() < 0.55;
      const pct = isWin ? rnd(0.005, 0.045) : -rnd(0.005, 0.035);
      realizedPnl = Math.round(totalValue * rate * pct * 100) / 100;
      pnl += realizedPnl;
      if (realizedPnl >= 0) { wc++; wins++; } else { lc++; losses++; }
    }

    await rest("trades", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId, session_id: sessionId, mode: "paper",
        trading_pair: pair, side, order_type: "market",
        quantity: qty.toFixed(8), price: price.toFixed(2),
        total_value: totalValue.toFixed(2), fee: fee.toFixed(2),
        status: "filled", realized_pnl: realizedPnl,
        usdt_nok_rate: rate.toFixed(4), venue: "binance", slippage_bps: 20,
        idempotency_key: `cron-auto-${runId}-${userId.slice(0, 8)}-${i}`,
        metadata: { source: "auto-trade-cron", simulated: true },
      }),
    });
    total++;

    if (side === "buy") balance -= (totalValue + fee) * rate;
    else balance += (totalValue - fee) * rate;
    console.log(`${name}: ${side.toUpperCase()} ${qty.toFixed(6)} ${pair} @ ${price.toFixed(2)}${realizedPnl != null ? ` | PnL ${realizedPnl} NOK` : ""}`);
  }

  // Synk alle balanse-kilder til samme sluttverdi
  await rest(`paper_accounts?user_id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      current_balance: balance.toFixed(2), total_profit_loss: pnl.toFixed(2),
      win_count: wc, loss_count: lc, updated_at: new Date().toISOString(),
    }),
  });
  await rest(`trading_sessions?id=eq.${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ current_capital: balance.toFixed(2), current_capital_nok: balance.toFixed(2), updated_at: new Date().toISOString() }),
  });
  await rest(`user_profiles?id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ paper_balance: balance.toFixed(2) }),
  });
}

console.log(`Ferdig: ${total} handler for ${USERS.length} brukere | ${wins} vinnere, ${losses} tapere`);

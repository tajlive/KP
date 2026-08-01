/**
 * Testnet live-test: verifiserer hele nøkkelkjeden end-to-end
 * Vault (user_binance_keys) → decrypt_binance_keys RPC → Binance testnet API.
 *
 * Printer ALDRI nøkler — kun resultat/status.
 * Bruk: node scripts/testnet-live-test.mjs [userId] [--place-order]
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env.local", import.meta.url).pathname });
dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

const USER_ID = process.argv[2] ?? null; // tom = bruk eneste aktive rad

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function mask(s) {
  if (!s) return "(null)";
  return s.length <= 8 ? "***" : `${s.slice(0, 4)}...${s.slice(-4)}`;
}

async function loadKeys(userId) {
  let query = supabase
    .from("user_binance_keys")
    .select("user_id, api_key_id, api_secret_id, is_testnet, is_active")
    .eq("is_active", true);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.limit(5);
  if (error) throw new Error(`user_binance_keys: ${error.message}`);
  if (!data || data.length === 0) {
    console.log("❌ Ingen aktive nøkler i user_binance_keys");
    return null;
  }
  for (const row of data) {
    const { data: decrypted, error: rpcErr } = await supabase.rpc(
      "decrypt_binance_keys",
      { key_id: row.api_key_id, secret_id: row.api_secret_id },
    );
    if (rpcErr || !decrypted || decrypted.length === 0) {
      console.log(
        `❌ [${row.user_id}] Vault-dekryptering feilet: ${rpcErr?.message ?? "tomt svar"}`,
      );
      continue;
    }
    const k = decrypted[0];
    return { userId: row.user_id, isTestnet: row.is_testnet ?? true, apiKey: k.api_key, apiSecret: k.api_secret };
  }
  console.log("❌ Ingen rad kunne dekrypteres");
  return null;
}

function sign(queryString, secret) {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

async function binanceCall(baseUrl, apiKey, apiSecret, path, params = {}, method = "GET") {
  const qs = new URLSearchParams(params).toString();
  const full = `${path}?${qs}`;
  const signature = sign(qs, apiSecret);
  const url = `${baseUrl}${full}&signature=${signature}`;
  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": apiKey, Accept: "application/json", "User-Agent": "Klarpakke-test/1.0" },
  });
  const text = await res.text();
  return { status: res.status, body: safeParse(text) };
}

function safeParse(t) {
  try { return JSON.parse(t); } catch { return t; }
}

const placeOrder = process.argv.includes("--place-order");

const keys = await loadKeys(USER_ID);
if (!keys) process.exit(1);

console.log(`\n🔑 Nøkkelkjede funnet for bruker ${keys.userId}`);
console.log(`   testnet: ${keys.isTestnet ? "JA (testnet.binance.vision)" : "NEI (mainnet — TEST STOPPET)"}`);
console.log(`   apiKey:  ${mask(keys.apiKey)}`);
console.log(`   apiSecret: ${mask(keys.apiSecret)}`);

if (!keys.isTestnet) {
  console.log("\n🛑 Sikkerhetsstopp: nøkkelen er mainnet. Test krever testnet=true. Avslutter uten ordre.");
  process.exit(1);
}

const base = "https://testnet.binance.vision";

// 1) Server time (uautentisert — ingen signatur)
const stRes = await fetch(`${base}/api/v3/time`, {
  headers: { Accept: "application/json", "User-Agent": "Klarpakke-test/1.0" },
});
const stBody = safeParse(await stRes.text());
console.log(`1️⃣ Server time: ${stRes.status === 200 ? `✅ ${stBody?.serverTime ?? "ok"}` : `❌ ${JSON.stringify(stBody)}`}`);

// 2) Konto-verifisering (autentisert — beviser at nøklene er gyldige)
const acct = await binanceCall(base, keys.apiKey, keys.apiSecret, "/api/v3/account", {
  recvWindow: 5000,
  timestamp: Date.now(),
});
if (acct.status === 200) {
  const balances = (acct.body?.balances ?? []).filter((b) => Number(b.free) > 0 || Number(b.locked) > 0);
  console.log(`2️⃣ Konto: ✅ gyldig (${balances.length} balanser)`);
  for (const b of balances.slice(0, 6)) {
    console.log(`   ${b.asset}: free=${b.free} locked=${b.locked}`);
  }
} else {
  console.log(`2️⃣ Konto: ❌ ${JSON.stringify(acct.body)}`);
  process.exit(1);
}

// 3) Symbol-info (BTCUSDT)
const sym = await binanceCall(base, keys.apiKey, keys.apiSecret, "/api/v3/exchangeInfo", { symbol: "BTCUSDT" });
if (sym.status === 200) {
  const s = sym.body?.symbols?.[0];
  console.log(`3️⃣ BTCUSDT: ✅ ${s?.baseAsset}/${s?.quoteAsset} step=${s?.filters?.find((f) => f.filterType === "LOT_SIZE")?.stepSize ?? "?"}`);
} else {
  console.log(`3️⃣ BTCUSDT: ❌ ${JSON.stringify(sym.body)}`);
  process.exit(1);
}

// 4) Test-ordre (validate=true — ingen reell ordre, kun signatur- og filter-validering)
const testOrder = await binanceCall(base, keys.apiKey, keys.apiSecret, "/api/v3/order/test", {
  symbol: "BTCUSDT",
  side: "BUY",
  type: "MARKET",
  quantity: "0.0001",
  recvWindow: 5000,
  timestamp: Date.now(),
}, "POST");
console.log(`4️⃣ Test-ordre (validate): ${testOrder.status === 200 ? "✅ godkjent (signatur + filtre OK)" : `❌ ${JSON.stringify(testOrder.body)}`}`);

if (placeOrder && testOrder.status === 200) {
  // 5) Ekte testnet-markedsordre — minimal mengde
  const order = await binanceCall(base, keys.apiKey, keys.apiSecret, "/api/v3/order", {
    symbol: "BTCUSDT",
    side: "BUY",
    type: "MARKET",
    quantity: "0.0001",
    recvWindow: 5000,
    timestamp: Date.now(),
  }, "POST");
  if (order.status === 200) {
    console.log(`5️⃣ Markedsordre: ✅ orderId=${order.body?.orderId} fills=${(order.body?.fills ?? []).length}`);
  } else {
    console.log(`5️⃣ Markedsordre: ❌ ${JSON.stringify(order.body)}`);
    process.exit(1);
  }
} else {
  console.log(`5️⃣ Markedsordre: hoppet over (bruk --place-order for ekte testnet-ordre)`);
}

console.log("\n🎉 Testnet-kjede verifisert end-to-end (Vault → RPC → Binance testnet)");
process.exit(0);

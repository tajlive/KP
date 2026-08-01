#!/usr/bin/env node
/**
 * KVELDSTEST: full produksjonsvei mot testnet.
 *
 * api_keys (DB, dekryptert) → binance-proxy Supabase EF (samme som
 * BinanceProxyExecutor i prod) → testnet.binance.vision.
 *
 * Beviser at PRODUKSJONSVEIEN fungerer end-to-end, ikke bare direkte-HMAC.
 * Printer ALDRI nøkler.
 */
import { readFileSync } from 'node:fs';
import { createDecipheriv, scryptSync } from 'node:crypto';
import pg from 'pg';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const userId = process.env.KLARPAKKE_USER_ID?.trim() ?? '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
const encryptionSecret = process.env.BINANCE_ENCRYPTION_SECRET;
const proxySecret = process.env.BINANCE_PROXY_SECRET;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const connStr = process.env.POSTGRES_URL_NON_POOLING;

if (!encryptionSecret || !proxySecret || !supabaseUrl || !anonKey || !connStr) {
  throw new Error('Manglende env: trenger BINANCE_ENCRYPTION_SECRET, BINANCE_PROXY_SECRET, SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, POSTGRES_URL_NON_POOLING');
}

const PROXY_URL = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/binance-proxy`;

function decrypt(encryptedText, secret) {
  const [ivHex, tagHex, data] = encryptedText.split(':');
  const key = scryptSync(secret, 'salt', 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

async function proxyCall(action, apiKey, apiSecret, params = {}) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'x-binance-proxy-secret': proxySecret,
    },
    body: JSON.stringify({ action, apiKey, apiSecret, testnet: true, params }),
  });
  return await res.json();
}

const client = new pg.Client({ connectionString: connStr.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } });
await client.connect();
let apiKey, apiSecret;
try {
  const { rows } = await client.query(
    `SELECT api_key_encrypted, api_secret_encrypted FROM api_keys
     WHERE user_id = $1 AND exchange = 'binance' AND is_testnet = true AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (!rows.length) throw new Error('Ingen aktive testnet-nøkler i api_keys');
  apiKey = rows[0].api_key_encrypted;
  apiSecret = decrypt(rows[0].api_secret_encrypted, encryptionSecret);
} finally {
  await client.end();
}

console.log('🌙 KVELDSTEST — produksjonsvei: api_keys → binance-proxy EF → testnet');
console.log(`   proxy:   ${PROXY_URL}`);
console.log(`   api_key: ${apiKey.slice(0, 8)}…${apiKey.slice(-4)} (${apiKey.length} tegn)`);
console.log('');

// 1) testConnection → /api/v3/account
console.log('1️⃣ testConnection (account via proxy)...');
const t = await proxyCall('testConnection', apiKey, apiSecret);
console.log(`   HTTP ${t.status}`);
if (!t.ok) { console.log(`   ❌ ${JSON.stringify(t)}`); process.exit(1); }
const acc = t.data;
console.log(`   ✅ canTrade=${acc.canTrade}, balances (non-zero): ${(acc.balances ?? []).filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0).length}`);

// 2) market BUY 10 USDT BTC
console.log('2️⃣ order: MARKET BUY 10 USDT BTC (via proxy)...');
const buy = await proxyCall('order', apiKey, apiSecret, {
  symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quoteOrderQty: '10',
});
console.log(`   HTTP ${buy.status}`);
if (!buy.ok) { console.log(`   ❌ ${JSON.stringify(buy)}`); process.exit(1); }
const buyBody = buy.data;
console.log(`   ✅ BUY fylt: orderId=${buyBody.orderId}, avg=${buyBody.fills?.[0]?.price} USDT, qty=${buyBody.executedQty} BTC`);

// 3) market SELL tilbake
console.log('3️⃣ order: MARKET SELL tilbake (via proxy)...');
const sell = await proxyCall('order', apiKey, apiSecret, {
  symbol: 'BTCUSDT', side: 'SELL', type: 'MARKET', quantity: buyBody.executedQty,
});
console.log(`   HTTP ${sell.status}`);
if (!sell.ok) { console.log(`   ❌ ${JSON.stringify(sell)}`); process.exit(1); }
const sellBody = sell.data;
console.log(`   ✅ SELL fylt: orderId=${sellBody.orderId}, avg=${sellBody.fills?.[0]?.price} USDT`);

// 4) balance
console.log('4️⃣ balance (via proxy)...');
const bal = await proxyCall('balance', apiKey, apiSecret);
if (bal.ok) {
  const b = bal.data;
  const usdt = (b.balances ?? []).find((x) => x.asset === 'USDT');
  console.log(`   ✅ USDT free=${usdt?.free}`);
}

console.log('');
console.log('🎉 PRODUKSJONSVEI VERIFISERT: api_keys → binance-proxy EF → testnet (BUY/SELL OK)');

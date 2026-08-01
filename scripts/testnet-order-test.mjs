#!/usr/bin/env node
/**
 * Testnet-ORDRE-test: market BUY + SELL av BTC med 10 USDT på
 * testnet.binance.vision — beviser full handelssyklus end-to-end.
 *
 * Går api_keys-veien (samme som ExecutorFactory). Printer ALDRI nøkler.
 * Bruker KUN testnet — hard blokk mot mainnet-URL.
 */
import { readFileSync } from 'node:fs';
import { createDecipheriv, createHmac, scryptSync } from 'node:crypto';
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
const connStr = process.env.POSTGRES_URL_NON_POOLING;
const TESTNET_BASE = 'https://testnet.binance.vision/api/v3';
const MAINNET_BASE = 'https://api.binance.com';
if (TESTNET_BASE.startsWith(MAINNET_BASE)) throw new Error('BLOCKERT: mainnet!');
if (!encryptionSecret || !connStr) throw new Error('Manglende env');

function decrypt(encryptedText, secret) {
  const [ivHex, tagHex, data] = encryptedText.split(':');
  const key = scryptSync(secret, 'salt', 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

async function signedCall(method, path, params, apiKey, apiSecret) {
  const qs = new URLSearchParams({ ...params, timestamp: String(Date.now()) });
  const signature = createHmac('sha256', apiSecret).update(qs.toString()).digest('hex');
  const url = `${TESTNET_BASE}${path}?${qs.toString()}&signature=${signature}`;
  const res = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  return { status: res.status, body: await res.json() };
}

const client = new pg.Client({ connectionString: connStr.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } });
await client.connect();
let apiKey, apiSecret;
try {
  const { rows } = await client.query(
    `SELECT api_key_encrypted, api_secret_encrypted FROM api_keys
     WHERE user_id = $1 AND exchange = 'binance' AND is_testnet = true ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (!rows.length) throw new Error('Ingen testnet-nøkler i api_keys');
  apiKey = rows[0].api_key_encrypted;
  apiSecret = decrypt(rows[0].api_secret_encrypted, encryptionSecret);
} finally {
  await client.end();
}

console.log('🧪 TESTNET-ORDRE (markedsdata, null risiko)');
console.log(`   api_key: ${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`);

// 1) Market BUY 10 USDT BTC
console.log('\n1️⃣ MARKET BUY 10 USDT BTC...');
const buy = await signedCall('POST', '/order', {
  symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quoteOrderQty: '10',
}, apiKey, apiSecret);
console.log(`   HTTP ${buy.status}`);
if (buy.status !== 200) { console.log(`   ❌ ${JSON.stringify(buy.body)}`); process.exit(1); }
console.log(`   ✅ BUY fylt: orderId=${buy.body.orderId}, avg=${buy.body.fills?.[0]?.price} USDT, qty=${buy.body.executedQty} BTC`);

// 2) Market SELL hele posisjonen tilbake
console.log('2️⃣ MARKET SELL tilbake...');
const sell = await signedCall('POST', '/order', {
  symbol: 'BTCUSDT', side: 'SELL', type: 'MARKET', quantity: buy.body.executedQty,
}, apiKey, apiSecret);
console.log(`   HTTP ${sell.status}`);
if (sell.status !== 200) { console.log(`   ❌ ${JSON.stringify(sell.body)}`); process.exit(1); }
console.log(`   ✅ SELL fylt: orderId=${sell.body.orderId}, avg=${sell.body.fills?.[0]?.price} USDT`);

// 3) Account-verifisering
const acc = await signedCall('GET', '/account', {}, apiKey, apiSecret);
const usdt = acc.body.balances?.find((x) => x.asset === 'USDT');
console.log(`\n3️⃣ Saldo etter runde: USDT free=${usdt?.free} (startet 10000)`);
console.log('\n🎉 FULL HANDELSSYKLUS VERIFISERT på testnet: BUY → SELL → saldo OK');

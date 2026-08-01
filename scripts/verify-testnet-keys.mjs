#!/usr/bin/env node
/**
 * End-to-end-live-verifikasjon: api_keys (produksjonskilde #2) → dekryptering
 * → Binance testnet API (serverTime + account) med HMAC-SHA-256-signering.
 *
 * Går NØYAKTIG ExecutorFactory-veien (api_keys + BINANCE_ENCRYPTION_SECRET).
 * Printer ALDRI nøkler eller hemmeligheter — kun status/resultat.
 */
import { readFileSync } from 'node:fs';
import { createDecipheriv, createHmac, scryptSync } from 'node:crypto';
import pg from 'pg';

// --- Last .env.local ---
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

if (!encryptionSecret || !connStr) throw new Error('Manglende env');

function decrypt(encryptedText, secret) {
  const [ivHex, tagHex, data] = encryptedText.split(':');
  const key = scryptSync(secret, 'salt', 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

async function signedGet(path, apiKey, apiSecret) {
  const ts = Date.now();
  const query = `timestamp=${ts}`;
  const signature = createHmac('sha256', apiSecret).update(query).digest('hex');
  const res = await fetch(`${TESTNET_BASE}${path}?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  return { status: res.status, body: await res.json() };
}

const client = new pg.Client({ connectionString: connStr.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query(
    `SELECT api_key_encrypted, api_secret_encrypted, is_testnet, is_active
     FROM api_keys WHERE user_id = $1 AND exchange = 'binance' ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (!rows.length) throw new Error('Ingen api_keys-rad for brukeren');

  const row = rows[0];
  const apiKey = row.api_key_encrypted;
  const apiSecret = decrypt(row.api_secret_encrypted, encryptionSecret);

  console.log('🔑 Kilde: api_keys (ExecutorFactory-vei)');
  console.log(`   api_key:    ${apiKey.slice(0, 8)}…${apiKey.slice(-4)} (${apiKey.length} tegn)`);
  console.log(`   is_testnet: ${row.is_testnet}  is_active: ${row.is_active}`);
  console.log('');

  // 1) serverTime — uautentisert
  const st = await fetch(`${TESTNET_BASE}/time`);
  const stJson = await st.json();
  console.log(`⏱️  serverTime: HTTP ${st.status} → serverTime=${stJson.serverTime}`);
  if (st.status !== 200) process.exit(1);

  // 2) Account — autentisert, HMAC-signert
  const acc = await signedGet('/account', apiKey, apiSecret);
  console.log(`👤 account:    HTTP ${acc.status}`);
  if (acc.status !== 200) {
    console.log(`   ❌ FEIL: ${JSON.stringify(acc.body)}`);
    process.exit(1);
  }
  const b = acc.body;
  const bal = (b.balances ?? []).filter((x) => parseFloat(x.free) > 0 || parseFloat(x.locked) > 0);
  console.log(`   ✅ SUCCESS — canTrade=${b.canTrade}, balances (non-zero): ${bal.length}`);
  for (const x of bal.slice(0, 6)) console.log(`      ${x.asset}: free=${x.free} locked=${x.locked}`);
  console.log('');
  console.log('🎉 End-to-end bekreftet: api_keys → dekryptering → HMAC → testnet API');
} finally {
  await client.end();
}

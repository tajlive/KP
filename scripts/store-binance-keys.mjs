#!/usr/bin/env node
/**
 * Lagrer Binance testnet-nøkler i api_keys-tabellen (kanonisk kilde #2).
 * Krypterer secret med BINANCE_ENCRYPTION_SECRET (identisk format som lib/crypto).
 *
 * PRINTER ALDRI NØKLER — kun status + maskert prefix.
 *
 * Bruk:
 *   BINANCE_TESTNET_API_KEY=... BINANCE_TESTNET_API_SECRET=... node scripts/store-binance-keys.mjs
 */
import { readFileSync } from 'node:fs';
import { createCipheriv, scryptSync, randomBytes } from 'node:crypto';
import pg from 'pg';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encrypt(text, secret) {
  const key = scryptSync(secret, 'salt', 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// --- Last .env.local (uten å overskrive eksisterende env) ---
const envPath = new URL('../.env.local', import.meta.url);
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const apiKey = process.env.BINANCE_TESTNET_API_KEY?.trim();
const apiSecret = process.env.BINANCE_TESTNET_API_SECRET?.trim();
const userId = process.env.KLARPAKKE_USER_ID?.trim() ?? '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
const encryptionSecret = process.env.BINANCE_ENCRYPTION_SECRET;
const connStr = process.env.POSTGRES_URL_NON_POOLING;

if (!apiKey || !apiSecret) throw new Error('Manglende BINANCE_TESTNET_API_KEY/SECRET');
if (!encryptionSecret) throw new Error('Manglende BINANCE_ENCRYPTION_SECRET');
if (!connStr) throw new Error('Manglende POSTGRES_URL_NON_POOLING');

const maskKey = (k) => `${k.slice(0, 8)}…${k.slice(-4)} (${k.length} tegn)`;

const encryptedSecret = encrypt(apiSecret, encryptionSecret);

const client = new pg.Client({ connectionString: connStr.replace('sslmode=require', 'sslmode=no-verify'), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  // Slett gamle aktive testnet-rader for brukeren (unngå duplikater)
  const del = await client.query(
    `DELETE FROM api_keys WHERE user_id = $1 AND exchange = 'binance' AND is_testnet = true`,
    [userId],
  );
  console.log(`Slettet ${del.rowCount} gamle testnet-rader`);

  const ins = await client.query(
    `INSERT INTO api_keys (user_id, exchange, api_key_encrypted, api_secret_encrypted, permissions, is_testnet, is_active)
     VALUES ($1, 'binance', $2, $3, ARRAY['TRADE','USER_DATA'], true, true)
     RETURNING id, is_testnet, is_active`,
    [userId, apiKey, encryptedSecret],
  );

  console.log('✅ Lagret i api_keys:');
  console.log(`   user_id:    ${userId}`);
  console.log(`   api_key:    ${maskKey(apiKey)}`);
  console.log(`   is_testnet: ${ins.rows[0].is_testnet}`);
  console.log(`   is_active:  ${ins.rows[0].is_active}`);
  console.log(`   id:         ${ins.rows[0].id}`);
} finally {
  await client.end();
}

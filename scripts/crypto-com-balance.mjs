#!/usr/bin/env node
/**
 * Crypto.com Exchange API — Balance Checker
 * 
 * Sjekker saldo programmatisk via Crypto.com Exchange API v1.
 * Krever: API_KEY + SECRET_KEY fra crypto.com/exchange (API Management)
 * 
 * Bruk:
 *   node scripts/crypto-com-balance.mjs
 * 
 * Hva den gjør:
 *   1. Henter alle balances fra /v1/private/get-account-summary
 *   2. Viser EUR, CRO, USDT og andre relevante valutaer
 *   3. Beregner total verdi i EUR
 * 
 * Oppsett (manuelt, 2 minutter):
 *   1. Logg inn på crypto.com/exchange
 *   2. Profile → Manage Account → API Management
 *   3. Create new API key → "Can Read" (ikke trading!)
 *   4. Kopier API Key + Secret Key
 *   5. Lim inn i .env.local:
 *      CRYPTO_COM_API_KEY=...
 *      CRYPTO_COM_SECRET_KEY=...
 */

import crypto from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Last .env.local
const envPath = resolve(process.cwd(), '.env.local');
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#') && vals.length) {
    process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const API_KEY = process.env.CRYPTO_COM_API_KEY;
const SECRET_KEY = process.env.CRYPTO_COM_SECRET_KEY;

if (!API_KEY || !SECRET_KEY) {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  CRYPTO.COM API-NØKKEL MANGLER                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Opprett API-nøkkel (2 minutter):                                            ║
║                                                                              ║
║  1. Logg inn på https://crypto.com/exchange                                  ║
║  2. Profile → Manage Account → API Management                                ║
║  3. Create new API key → Velg "Can Read" (IKKE trading!)                     ║
║  4. Kopier API Key + Secret Key                                              ║
║                                                                              ║
║  5. Lim inn i .env.local:                                                    ║
║     CRYPTO_COM_API_KEY=din_api_key                                           ║
║     CRYPTO_COM_SECRET_KEY=din_secret_key                                     ║
║                                                                              ║
║  Kjør deretter: node scripts/crypto-com-balance.mjs                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

const BASE_URL = 'https://api.crypto.com/v1';

function signRequest(method, path, params = {}) {
  const nonce = Date.now();
  const paramString = Object.keys(params).length 
    ? '?' + new URLSearchParams(params).toString() 
    : '';
  
  const payload = `${method}${path}${paramString}${nonce}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  return { nonce, signature };
}

async function apiCall(method, path, params = {}) {
  const { nonce, signature } = signRequest(method, path, params);
  
  const headers = {
    'Content-Type': 'application/json',
    'api-key': API_KEY,
    'signature': signature,
    'nonce': nonce.toString(),
  };
  
  const url = `${BASE_URL}${path}${Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`;
  
  const res = await fetch(url, { method, headers });
  return res.json();
}

async function main() {
  console.log('🔍 Sjekker crypto.com balance...\n');
  
  // Hent account summary
  const account = await apiCall('GET', '/private/get-account-summary');
  
  if (account.code !== 0) {
    console.error('❌ API-feil:', account.message || 'Ukjent feil');
    process.exit(1);
  }
  
  const balances = account.result?.accounts || [];
  
  // Filtrer relevante valutaer
  const relevant = balances.filter(b => 
    ['EUR', 'CRO', 'USDT', 'BTC', 'ETH', 'USD', 'USDC'].includes(b.currency)
  );
  
  console.log('💰 BALANSE:');
  console.log('─'.repeat(50));
  
  let totalEUR = 0;
  
  for (const b of relevant) {
    const available = parseFloat(b.available || 0);
    const locked = parseFloat(b.locked || 0);
    const total = available + locked;
    
    if (total > 0) {
      const eurValue = b.currency === 'EUR' ? total : '(konverteres)';
      console.log(`${b.currency.padEnd(8)} | Tilgjengelig: ${available.toFixed(8).padEnd(18)} | Låst: ${locked.toFixed(8).padEnd(18)} | Total: ${total.toFixed(8)}`);
      
      if (b.currency === 'EUR') {
        totalEUR += total;
      }
    }
  }
  
  console.log('─'.repeat(50));
  console.log(`\n💶 TOTAL EUR (kun fiat): €${totalEUR.toFixed(2)}`);
  
  // Sjekk om €30,81 finnes
  const eurBalance = relevant.find(b => b.currency === 'EUR');
  if (eurBalance) {
    const eurTotal = parseFloat(eurBalance.available || 0) + parseFloat(eurBalance.locked || 0);
    console.log(`\n✅ EUR-balanse funnet: €${eurTotal.toFixed(2)}`);
    
    if (Math.abs(eurTotal - 30.81) < 0.01) {
      console.log('   MATCH: Dette er €30,81 du lette etter!');
    } else {
      console.log(`   MERK: €30,81 ikke funnet. Faktisk: €${eurTotal.toFixed(2)}`);
    }
  } else {
    console.log('\n❌ EUR-balanse ikke funnet i API-respons');
  }
  
  // Vis alle valutaer med saldo > 0
  const allPositive = balances.filter(b => 
    (parseFloat(b.available || 0) + parseFloat(b.locked || 0)) > 0
  );
  
  if (allPositive.length > relevant.length) {
    console.log(`\n📊 Alle valutaer med saldo (${allPositive.length}):`);
    for (const b of allPositive) {
      const total = parseFloat(b.available || 0) + parseFloat(b.locked || 0);
      console.log(`   ${b.currency}: ${total.toFixed(8)}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

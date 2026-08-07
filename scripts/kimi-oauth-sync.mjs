#!/usr/bin/env node
/**
 * kimi-oauth-sync.mjs — Synkroniserer Kimi Code OAuth-token til Klarpakke-miljøer
 *
 * Token-kilde: ~/.pi/agent/auth.json (pi login → kimi-coding)
 * Token utløper ca. hver 50. minutt — scriptet refresher automatisk hvis <10 min igjen.
 *
 * Bruk:
 *   node scripts/kimi-oauth-sync.mjs            # refresh (om nødvendig) + local + prod
 *   node scripts/kimi-oauth-sync.mjs --check    # kun status, ingen endringer
 *   node scripts/kimi-oauth-sync.mjs --local    # kun .dev.vars (lokal utvikling)
 *   node scripts/kimi-oauth-sync.mjs --prod     # kun wrangler secret (prod worker)
 *   node scripts/kimi-oauth-sync.mjs --supabase # også supabase edge function secrets
 *
 * Exit 0 = OK, exit 1 = feil (brukes av cron for varsling).
 *
 * Merk: KIMI_OAUTH_TOKEN i prod kan også settes til en STABIL API-nøkkel fra
 * Kimi Code Console (samme membership-kvote) — da trengs ikke denne synken.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const AUTH_FILE = join(homedir(), '.pi', 'agent', 'auth.json');
const REFRESH_URL = 'https://auth.kimi.com/api/oauth/token';
const CLIENT_ID = '17e5f671-d194-4dfb-9706-5516cb48c098';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_VARS = join(REPO_ROOT, '.dev.vars');
const SECRET_NAME = 'KIMI_OAUTH_TOKEN';
const SUPABASE_PROJECT = 'pskhryjzkobytnfwucrb';

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const ONLY_LOCAL = args.includes('--local');
const ONLY_PROD = args.includes('--prod');
const WITH_SUPABASE = args.includes('--supabase');
// Default (ingen flagg): både local og prod
const DO_LOCAL = CHECK_ONLY ? false : (ONLY_LOCAL || !ONLY_PROD);
const DO_PROD = CHECK_ONLY ? false : (ONLY_PROD || !ONLY_LOCAL);

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function readAuth() {
  if (!existsSync(AUTH_FILE)) fail(`Finner ikke ${AUTH_FILE} — kjør 'pi' → /login kimi-coding`);
  const auth = JSON.parse(readFileSync(AUTH_FILE, 'utf8'))['kimi-coding'];
  if (!auth?.access || !auth?.refresh || !auth?.expires) fail('Ugyldig auth.json for kimi-coding');
  return auth;
}

async function refreshIfNeeded(auth) {
  const remaining = (auth.expires - Date.now()) / 1000;
  if (remaining > 600) {
    console.log(`Token OK (utløper om ${Math.floor(remaining / 60)} min)`);
    return auth;
  }

  console.log(`Token utløper om ${Math.max(0, Math.floor(remaining))}s — refresher…`);
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: auth.refresh,
  });
  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(`Refresh feilet: HTTP ${res.status} — ${JSON.stringify(data)}`);

  auth.access = data.access_token;
  auth.expires = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) auth.refresh = data.refresh_token;
  writeFileSync(AUTH_FILE, JSON.stringify({ 'kimi-coding': auth }, null, 2));
  console.log(`Token refreshet (ny utløp om ${Math.floor(data.expires_in / 60)} min)`);
  return auth;
}

function pushLocal(token) {
  let lines = [];
  if (existsSync(DEV_VARS)) {
    lines = readFileSync(DEV_VARS, 'utf8').split('\n');
  }
  const entry = `${SECRET_NAME}=${token}`;
  const idx = lines.findIndex((l) => l.startsWith(`${SECRET_NAME}=`));
  if (idx >= 0) lines[idx] = entry;
  else lines.push(entry);
  // Fjern tomme linjer på slutten, avslutt med nøyaktig én newline
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  writeFileSync(DEV_VARS, lines.join('\n') + '\n');
  console.log(`✅ .dev.vars oppdatert (${SECRET_NAME})`);
}

function pushProd(token) {
  const r = spawnSync('npx', ['wrangler', 'versions', 'secret', 'put', SECRET_NAME], {
    input: token,
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (r.status !== 0) {
    fail(`wrangler secret put feilet:\n${r.stderr || r.stdout}`);
  }
  console.log(`✅ Prod worker-secret oppdatert (${SECRET_NAME})`);
}

function pushSupabase(token) {
  const r = spawnSync(
    'npx',
    ['supabase', 'secrets', 'set', `${SECRET_NAME}=${token}`, '--project-ref', SUPABASE_PROJECT],
    { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120000 }
  );
  if (r.status !== 0) {
    // Best-effort: edge-funksjonen er ikke deployet ennå
    console.warn(`⚠️  supabase secrets set feilet (ikke kritisk): ${(r.stderr || r.stdout || '').trim()}`);
  } else {
    console.log(`✅ Supabase edge-secret oppdatert (${SECRET_NAME})`);
  }
}

async function main() {
  let auth = readAuth();

  if (CHECK_ONLY) {
    const remaining = (auth.expires - Date.now()) / 1000;
    console.log(`${SECRET_NAME}-kilde: ${AUTH_FILE}`);
    console.log(`Token utløper om ${Math.floor(remaining / 60)} min (${new Date(auth.expires).toISOString()})`);
    console.log(remaining > 0 ? 'Status: GYLDIG' : 'Status: UTLOPT — kjør sync uten --check');
    process.exit(remaining > 0 ? 0 : 1);
  }

  auth = await refreshIfNeeded(auth);
  const token = auth.access;

  if (DO_LOCAL) pushLocal(token);
  if (DO_PROD) pushProd(token);
  if (WITH_SUPABASE) pushSupabase(token);

  console.log('Ferdig.');
}

main().catch((e) => fail(e.message));

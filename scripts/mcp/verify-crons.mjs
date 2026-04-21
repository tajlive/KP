#!/usr/bin/env node
/**
 * verify-crons.mjs
 * Automatisk verifisering av alle 14 Klarpakke pg_cron-jobs
 * Sjekker: aktive jobs, HTTP-responser fra Vercel, feilende kjøringer
 *
 * Exit 0 = alt OK
 * Exit 1 = inaktive jobs ELLER 401/500-responser
 *
 * Bruk: node scripts/mcp/verify-crons.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ── Les .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const path = resolve(ROOT, '.env.local');
  try {
    const raw = readFileSync(path, 'utf-8');
    const env = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...process.env, ...loadEnv() };

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_JWT_SECRET    // brukes som service-key fallback
  ? null
  : null;
// Supabase REST bruker service_role JWT — hent fra Supabase Dashboard
// Sett SUPABASE_SERVICE_ROLE_KEY i .env.local for full tilgang
const ANON_KEY     = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DB_URL       = env.POSTGRES_URL_NON_POOLING;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL mangler i .env.local');
  process.exit(1);
}

// ── Farger ────────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

const ok  = `${C.green}✅${C.reset}`;
const err = `${C.red}❌${C.reset}`;
const warn = `${C.yellow}⚠️ ${C.reset}`;

// ── SQL via Supabase REST /rpc ────────────────────────────────────────────────
async function runSQL(sql, label) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;

  // Supabase hint: funksjonen heter exec_sql med param query_text (ikke query)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({ query_text: sql }),  // ← riktig parameter-navn
  });

  if (!res.ok) {
    throw new Error(`REST feil (${res.status}) for ${label}: ${await res.text()}`);
  }
  return res.json();
}

// ── Alternativ: bruk pg direkte via env ──────────────────────────────────────
async function runPG(sql) {
  const { default: pg } = await import('pg').catch(() => ({ default: null }));
  if (!pg || !DB_URL) return null;

  // Bygg connection config fra URL + override SSL
  // POSTGRES_URL_NON_POOLING har sslmode=require i URL — override med Node-config
  const url = new URL(DB_URL);
  url.searchParams.delete('sslmode');  // fjern fra URL så pg ikke tolker den
  url.searchParams.delete('uselibpqcompat');

  const client = new pg.Client({
    host:     url.hostname,
    port:     Number(url.port) || 5432,
    database: url.pathname.replace('/', ''),
    user:     url.username,
    password: decodeURIComponent(url.password),
    // Supabase bruker self-signed cert internt — rejectUnauthorized: false er nødvendig
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 10000,
  });
  try {
    await client.connect();
    const result = await client.query(sql);
    return result.rows;
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Hoved-queries ─────────────────────────────────────────────────────────────
const SQL_JOBS = `
  SELECT jobname, schedule, active
  FROM cron.job
  WHERE jobname LIKE 'klarpakke-%'
  ORDER BY jobname;
`;

const SQL_HTTP = `
  SELECT
    status_code,
    COUNT(*)::int AS antall,
    MAX(created)  AS siste
  FROM net._http_response
  WHERE created > NOW() - INTERVAL '2 hours'
  GROUP BY status_code
  ORDER BY status_code;
`;

const SQL_FAILURES = `
  SELECT
    j.jobname,
    r.status,
    LEFT(r.return_message, 120) AS melding,
    r.start_time
  FROM cron.job j
  JOIN cron.job_run_details r ON j.jobid = r.jobid
  WHERE j.jobname LIKE 'klarpakke-%'
    AND r.status != 'succeeded'
    AND r.start_time > NOW() - INTERVAL '2 hours'
  ORDER BY r.start_time DESC
  LIMIT 20;
`;

const SQL_LAST_RUN = `
  SELECT
    j.jobname,
    MAX(r.start_time) AS siste_kjoering,
    COUNT(*)::int     AS kjoringer_2t
  FROM cron.job j
  LEFT JOIN cron.job_run_details r
    ON j.jobid = r.jobid
    AND r.start_time > NOW() - INTERVAL '2 hours'
  WHERE j.jobname LIKE 'klarpakke-%'
  GROUP BY j.jobname
  ORDER BY j.jobname;
`;

// ── Tabellprinter ─────────────────────────────────────────────────────────────
function printTable(headers, rows, colWidths) {
  const line = colWidths.map(w => '─'.repeat(w)).join('─┼─');
  const fmt  = (val, w) => String(val ?? '').padEnd(w).slice(0, w);

  console.log(' ' + headers.map((h, i) => fmt(h, colWidths[i])).join(' │ '));
  console.log('─' + line + '─');
  for (const row of rows) {
    console.log(' ' + row.map((v, i) => fmt(v, colWidths[i])).join(' │ '));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}🔍 Klarpakke pg_cron Verifikasjon${C.reset}`);
  console.log(`${C.gray}${new Date().toISOString()}${C.reset}\n`);

  let hasErrors = false;

  // Forsøk pg direkte (raskest, ingen REST-begrensninger på cron-skjema)
  let jobs, httpStats, failures, lastRun;

  try {
    [jobs, httpStats, failures, lastRun] = await Promise.all([
      runPG(SQL_JOBS),
      runPG(SQL_HTTP),
      runPG(SQL_FAILURES),
      runPG(SQL_LAST_RUN),
    ]);
  } catch (e) {
    console.warn(`${warn} pg direkte feilet, prøver REST: ${e.message}`);
    try {
      [jobs, httpStats, failures, lastRun] = await Promise.all([
        runSQL(SQL_JOBS, 'jobs'),
        runSQL(SQL_HTTP, 'http'),
        runSQL(SQL_FAILURES, 'failures'),
        runSQL(SQL_LAST_RUN, 'lastRun'),
      ]);
    } catch (e2) {
      console.error(`${err} Kunne ikke koble til Supabase: ${e2.message}`);
      console.error(`\nSett SUPABASE_SERVICE_ROLE_KEY i .env.local for REST-tilgang.`);
      console.error(`Eller sørg for at POSTGRES_URL_NON_POOLING er satt for pg-tilgang.\n`);
      process.exit(1);
    }
  }

  // ── 1. Cron-jobs status ──────────────────────────────────────────────────
  console.log(`${C.bold}1. Cron-jobs (${jobs?.length ?? 0}/14 funnet)${C.reset}`);
  const EXPECTED = 14;

  if (!jobs?.length) {
    console.log(`   ${err} Ingen klarpakke-jobs funnet i cron.job!`);
    hasErrors = true;
  } else {
    const rows = jobs.map((j, i) => [
      String(i + 1).padStart(2),
      j.active ? ok : err,
      j.jobname.replace('klarpakke-', ''),
      j.schedule,
    ]);
    printTable(['#', 'OK', 'Jobb', 'Schedule'], rows, [3, 4, 35, 18]);

    const inactive = jobs.filter(j => !j.active);
    if (inactive.length) {
      console.log(`\n   ${err} ${inactive.length} inaktiv(e) jobb(er): ${inactive.map(j => j.jobname).join(', ')}`);
      hasErrors = true;
    }
    if (jobs.length < EXPECTED) {
      console.log(`   ${warn} Forventet ${EXPECTED} jobs, fant ${jobs.length}`);
      hasErrors = true;
    }
  }

  // ── 2. HTTP-responser ────────────────────────────────────────────────────
  console.log(`\n${C.bold}2. HTTP-responser fra Vercel (siste 2t)${C.reset}`);

  if (!httpStats?.length) {
    console.log(`   ${warn} Ingen HTTP-responser ennå — jobs har kanskje ikke kjørt ennå.`);
  } else {
    const rows = httpStats.map(r => [
      r.status_code,
      r.antall,
      r.status_code === 200 ? ok :
        r.status_code === 401 ? `${err} Sjekk CRON_SECRET i Vault` :
        r.status_code === 500 ? `${err} Handler krasjer` : warn,
      r.siste ? new Date(r.siste).toLocaleTimeString('no-NO') : '-',
    ]);
    printTable(['Status', 'Antall', 'Tolkning', 'Siste'], rows, [8, 8, 35, 12]);

    const badCodes = httpStats.filter(r => [401, 500, 502, 503].includes(Number(r.status_code)));
    if (badCodes.length) {
      hasErrors = true;
    }
  }

  // ── 3. Feilende kjøringer ────────────────────────────────────────────────
  console.log(`\n${C.bold}3. Feil siste 2 timer${C.reset}`);

  if (!failures?.length) {
    console.log(`   ${ok} Ingen feil registrert.`);
  } else {
    hasErrors = true;
    const rows = failures.map(f => [
      f.jobname.replace('klarpakke-', ''),
      f.status,
      f.melding?.slice(0, 50) ?? '',
      f.start_time ? new Date(f.start_time).toLocaleTimeString('no-NO') : '-',
    ]);
    printTable(['Jobb', 'Status', 'Melding', 'Tid'], rows, [30, 12, 52, 10]);
  }

  // ── 4. Siste kjøretid per job ────────────────────────────────────────────
  console.log(`\n${C.bold}4. Aktivitet siste 2 timer${C.reset}`);
  if (lastRun?.length) {
    const stille = lastRun.filter(r => !r.kjoringer_2t || r.kjoringer_2t === 0);
    if (stille.length) {
      console.log(`   ${warn} ${stille.length} job(s) har ikke kjørt siste 2t:`);
      stille.forEach(r => console.log(`     - ${r.jobname}`));
    } else {
      console.log(`   ${ok} Alle jobs har kjørt siste 2 timer.`);
    }
  }

  // ── Sluttresultat ────────────────────────────────────────────────────────
  console.log();
  if (hasErrors) {
    console.log(`${C.bold}${C.red}❌ STATUS: FEIL OPPDAGET${C.reset}`);
    console.log(`   Sjekk punktene over. Kjør SQL i Supabase Dashboard:`);
    console.log(`   ${C.gray}SELECT * FROM klarpakke_cron_failures;${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${C.bold}${C.green}✅ STATUS: ALT OK — alle ${jobs?.length ?? 0} cron-jobs aktive${C.reset}\n`);
    process.exit(0);
  }
}

main().catch(e => {
  console.error(`${err} Uventet feil: ${e.message}`);
  process.exit(1);
});

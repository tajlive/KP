#!/usr/bin/env node
/**
 * Morgenrapport 2.0 — «Hva trenger Tom å vite»
 * 
 * Tre seksjoner:
 *   🟢 Alt er bra (ingen handling nødvendig)
 *   🟡 Krever oppmerksomhet (ikke kritisk)
 *   🔴 Kritisk (handling nødvendig)
 * 
 * Kjøres daglig kl. 07:12 via pg_cron.
 * Resultat postes som Trello-kort i «📋 Daglig rapport».
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Last .env.local
const envPath = resolve(process.cwd(), '.env.local');
if (readFileSync(envPath, 'utf8')) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#') && vals.length) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_BOARD = '6a77a7ac73020977260a3931';
const TRELLO_LIST_DAILY = '6a77a7b8b35d65c4915efa39'; // ✅ Verifisert — gjenbrukes for daglige rapporter

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// SEKSJON 1: 🟢 Alt er bra
// ═══════════════════════════════════════════════════════════════════════════

async function checkGreen() {
  const results = [];
  
  // CI-status
  try {
    const ciRes = await fetch('https://api.github.com/repos/tajlive/KP/actions/runs?per_page=1', {
      headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const ciData = await ciRes.json();
    const lastRun = ciData.workflow_runs?.[0];
    if (lastRun?.conclusion === 'success') {
      results.push(`CI: grønn (#${lastRun.run_number})`);
    } else {
      results.push(`CI: ${lastRun?.conclusion || 'ukjent'} — sjekk GitHub`);
    }
  } catch {
    results.push('CI: kunne ikke hente status');
  }
  
  // Prod-status
  try {
    const prodRes = await fetch('https://www.klarpakke.no/api/health', { signal: AbortSignal.timeout(10000) });
    if (prodRes.ok) {
      const health = await prodRes.json();
      results.push(`Prod: OK (${health.uptime || 'ukjent'} uptime)`);
    } else {
      results.push(`Prod: HTTP ${prodRes.status}`);
    }
  } catch {
    results.push('Prod: utilgjengelig');
  }
  
  // DB-invarianter
  try {
    const { data: invariant } = await supabase.rpc('check_dashboard_invariants');
    if (invariant?.ok) {
      results.push('DB: 0 invarianter brutt');
    } else {
      results.push(`DB: ${invariant?.violations?.length || '?'} invarianter brutt`);
    }
  } catch {
    results.push('DB: invariant-sjekk ikke tilgjengelig');
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEKSJON 2: 🟡 Krever oppmerksomhet
// ═══════════════════════════════════════════════════════════════════════════

async function checkYellow() {
  const results = [];
  
  // KIMI_API_KEY
  if (!process.env.KIMI_API_KEY || process.env.KIMI_API_KEY.includes('suspend')) {
    results.push('KIMI_API_KEY: suspendert (Tom må lade saldo)');
  }
  
  // Trello backlog
  try {
    const trelloRes = await fetch(
      `https://api.trello.com/1/boards/${TRELLO_BOARD}/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}&fields=idList`
    );
    const cards = await trelloRes.json();
    const backlogCount = cards.filter(c => c.idList === '6a77a7b7eeadaec0e034ea35').length;
    if (backlogCount > 5) {
      results.push(`Trello: ${backlogCount} kort i «Funnet automatisk» — auto-triagem anbefalt`);
    }
  } catch {
    results.push('Trello: kunne ikke hente kort');
  }
  
  // Stale cron (succeeded men ingen data)
  try {
    const { data: cronData } = await supabase
      .from('cron.job_run_details')
      .select('status, return_message, start_time')
      .order('start_time', { ascending: false })
      .limit(5);
    
    const emptyRuns = cronData?.filter(r => r.return_message === '1 row').length || 0;
    if (emptyRuns >= 3) {
      results.push(`Cron: ${emptyRuns}/5 siste kjøringer returnerte «1 row» — sjekk om systemet har noe å gjøre`);
    }
  } catch {
    // Ignorer — ikke kritisk
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEKSJON 3: 🔴 Kritisk
// ═══════════════════════════════════════════════════════════════════════════

async function checkRed() {
  const results = [];
  
  // Sjekk for nylige 5xx-feil
  try {
    const { data: errors } = await supabase
      .from('cron_health_events')
      .select('status_code, job_name, detected_at')
      .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gte('status_code', 500);
    
    if (errors?.length > 0) {
      results.push(`${errors.length} 5xx-feil siste 24t — sjekk cron_health_events`);
    }
  } catch {
    // Ignorer
  }
  
  // Live-trading aktiv men ingen data
  try {
    const { data: liveTrades } = await supabase
      .from('trades')
      .select('id')
      .eq('mode', 'live')
      .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const { data: liveSessions } = await supabase
      .from('trading_sessions')
      .select('id')
      .eq('mode', 'live')
      .eq('status', 'active');
    
    if (liveSessions?.length > 0 && liveTrades?.length === 0) {
      results.push('Live-sesjon aktiv men 0 trades siste 24t — sjekk trading-motor');
    }
  } catch {
    // Ignorer
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOVEDFUNKSJON
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const date = new Date().toISOString().split('T')[0];
  
  const [green, yellow, red] = await Promise.all([
    checkGreen(),
    checkYellow(),
    checkRed()
  ]);
  
  // Bygg rapport
  let report = `## Morgenrapport ${date}\n\n`;
  
  if (red.length === 0 && yellow.length === 0) {
    report += `### 🟢 Alt er bra\n\n`;
    green.forEach(g => report += `- ${g}\n`);
    report += `\nIngen handling nødvendig. Start dagen rolig.\n`;
  } else {
    if (green.length > 0) {
      report += `### 🟢 Alt er bra\n\n`;
      green.forEach(g => report += `- ${g}\n`);
      report += `\n`;
    }
    
    if (yellow.length > 0) {
      report += `### 🟡 Krever oppmerksomhet\n\n`;
      yellow.forEach(y => report += `- ${y}\n`);
      report += `\nIkke kritisk, men bør følges opp.\n\n`;
    }
    
    if (red.length > 0) {
      report += `### 🔴 Kritisk\n\n`;
      red.forEach(r => report += `- ${r}\n`);
      report += `\n**Handling nødvendig før andre oppgaver.**\n`;
    }
  }
  
  // Post til Trello
  const trelloUrl = `https://api.trello.com/1/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
  const trelloBody = {
    name: `Morgenrapport ${date}`,
    desc: report,
    idList: TRELLO_LIST_DAILY,
    pos: 'top'
  };
  
  const trelloRes = await fetch(trelloUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trelloBody)
  });
  
  if (trelloRes.ok) {
    const card = await trelloRes.json();
    console.log(`✅ Morgenrapport postet til Trello: ${card.shortUrl}`);
  } else {
    console.error('❌ Kunne ikke poste til Trello:', await trelloRes.text());
    process.exit(1);
  }
  
  // Exit-kode: 0=grønn, 1=gul, 2=rød
  if (red.length > 0) process.exit(2);
  if (yellow.length > 0) process.exit(1);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});

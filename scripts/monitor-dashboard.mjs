#!/usr/bin/env node
/**
 * Kontinuerlig overvåking dashboard for Klarpakke
 */

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const CHECKS = {
  health: { url: 'https://www.klarpakke.no/api/health', method: 'GET' },
  signal: { url: 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/signal-engine/health', method: 'GET', headers: { 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}` } },
  landing: { url: 'https://www.klarpakke.no/no', method: 'GET' },
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function statusEmoji(status) {
  if (status === 'ok' || status === true) return '🟢';
  if (status === 'warning') return '🟡';
  return '🔴';
}

async function checkHealth() {
  try {
    const res = await fetch(CHECKS.health.url);
    const data = await res.json();
    const sigAge = data.checks?.tradingSignals?.details?.engineHeartbeatAgeMinutes;
    const sigStatus = sigAge > 20 ? 'warning' : 'ok';
    return {
      db: data.checks?.database?.status === 'ok',
      kv: data.checks?.kv?.status === 'ok',
      signal: sigStatus,
      signalAge: sigAge?.toFixed ? sigAge.toFixed(1) : sigAge,
      overall: data.ok
    };
  } catch (e) {
    return { error: true, message: e.message };
  }
}

async function runCheck() {
  console.clear();
  console.log(`${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}           KLARPAKKE PRODUKSJON OVERVÅKING                  ${CYAN}║${RESET}`);
  console.log(`${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`${CYAN}Siste sjekk:${RESET} ${timestamp()}`);
  console.log();
  
  const health = await checkHealth();
  
  if (health.error) {
    console.log(`${RED}❌ Health check feilet:${RESET} ${health.message}`);
  } else {
    console.log(`${statusEmoji(health.db)} Database:     ${health.db ? GREEN + 'OK' + RESET : RED + 'FEIL' + RESET}`);
    console.log(`${statusEmoji(health.kv)} KV Cache:     ${health.kv ? GREEN + 'OK' + RESET : RED + 'FEIL' + RESET}`);
    console.log(`${statusEmoji(health.signal)} Signal Engine: ${health.signal === 'ok' ? GREEN + 'OK' + RESET : YELLOW + 'WARNING' + RESET} (${health.signalAge} min)`);
    console.log();
    console.log(`${health.overall ? GREEN : YELLOW}Overall: ${health.overall ? 'HEALTHY ✅' : 'DEGRADED ⚠️'}${RESET}`);
  }
  
  console.log();
  console.log(`${CYAN}Neste sjekk om 30 sekunder...${RESET}`);
  console.log(`${CYAN}Trykk Ctrl+C for å avslutte${RESET}`);
}

// Første kjøring
await runCheck();

// Loop hver 30 sekund
setInterval(runCheck, 30000);

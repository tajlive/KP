#!/usr/bin/env node
/**
 * 🧠 KIMI Smart Orchestrator — Installer v2.0
 *
 * Kjør: node scripts/install-kimi-orchestrator.mjs
 *
 * Installerer hele KIMI Smart Orchestrator systemet:
 * 1. Scripts til ~/.kimi/bin/
 * 2. Aliaser i .zshrc
 * 3. SessionEnd-hook oppgradering
 * 4. Verifiserer at KIMI config har hook
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const home = homedir();
const root = process.cwd();
const binDir = resolve(home, '.kimi/bin');
const zshrc = resolve(home, '.zshrc');
const kimiConfig = resolve(home, '.kimi/config.toml');
const hooksDir = resolve(home, '.kimi/hooks');

const SCRIPTS = [
  { src: 'scripts/kimi-smart-orchestrator.mjs', dest: '.kimi/bin/kimi-smart' },
  { src: 'scripts/kimi-smart-brief.mjs', dest: '.kimi/bin/kimi-smart-brief' },
  { src: 'scripts/kimi-smart-launch.mjs', dest: '.kimi/bin/kimi-smart-launch' },
  { src: 'scripts/kimi-self-improve.mjs', dest: '.kimi/bin/kimi-self-improve' },
];

const ALIASES = [
  '# === KIMI Smart Orchestrator v2.0 (auto-installert) ===',
  'alias kimis="kimi-smart"',
  'alias kimib="kimi-smart-brief"',
  'alias kimil="kimi-smart-launch"',
  'alias kimi-self="kimi-self-improve"',
  'alias kimi-super="kimi --agent-file .kimi/agents/klarpakke-super-agent.yaml"',
  '# === /KIMI Smart Orchestrator ===',
];

function log(level, msg) {
  const icons = { info: 'ℹ️', warn: '⚠️', success: '✅', error: '❌' };
  console.log(`${icons[level] || '•'} ${msg}`);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function installScripts() {
  ensureDir(binDir);
  for (const { src, dest } of SCRIPTS) {
    const srcPath = resolve(root, src);
    const destPath = resolve(home, dest);
    if (!existsSync(srcPath)) {
      log('error', `Mangler: ${src}`);
      continue;
    }
    ensureDir(dirname(destPath));
    copyFileSync(srcPath, destPath);
    execSync(`chmod +x "${destPath}"`);
    log('success', `${dest} → ${destPath}`);
  }
}

function installAliases() {
  if (!existsSync(zshrc)) {
    log('warn', `.zshrc finnes ikke — oppretter ${zshrc}`);
    writeFileSync(zshrc, '');
  }

  const current = readFileSync(zshrc, 'utf8');
  const marker = '=== KIMI Smart Orchestrator';

  if (current.includes(marker)) {
    log('info', 'Aliaser finnes allerede i .zshrc — hopper over');
    return;
  }

  const block = '\n' + ALIASES.join('\n') + '\n';
  writeFileSync(zshrc, current + block);
  log('success', `Aliaser lagt til i .zshrc (${ALIASES.length - 2} aliaser)`);
  log('warn', 'Kjør "source ~/.zshrc" for å aktivere aliaser');
}

function verifySessionEndHook() {
  if (!existsSync(kimiConfig)) {
    log('warn', `KIMI config.toml finnes ikke: ${kimiConfig}`);
    return;
  }

  const config = readFileSync(kimiConfig, 'utf8');
  if (config.includes('mempalace-smart-exit.sh')) {
    log('success', 'SessionEnd-hook er konfigurert i config.toml');
  } else {
    log('warn', 'SessionEnd-hook MANGER i config.toml');
    log('warn', 'Legg til følgende i ~/.kimi/config.toml:');
    log('warn', '  [[hooks]]');
    log('warn', '  event = "SessionEnd"');
    log('warn', '  command = "/Users/taj/.kimi/hooks/mempalace-smart-exit.sh"');
  }
}

function verifyPath() {
  try {
    const pathEnv = process.env.PATH || '';
    if (pathEnv.includes('.kimi/bin')) {
      log('success', '~/.kimi/bin er i PATH');
      return true;
    } else {
      log('warn', '~/.kimi/bin er IKKE i PATH — legg til i .zshrc:');
      log('warn', '  export PATH="$HOME/.kimi/bin:$PATH"');
      return false;
    }
  } catch { return false; }
}

function verify() {
  log('info', 'Verifiserer installasjon...');
  let ok = true;

  for (const { dest } of SCRIPTS) {
    const path = resolve(home, dest);
    if (existsSync(path)) {
      log('success', `  ✅ ${dest}`);
    } else {
      log('error', `  ❌ ${dest} mangler!`);
      ok = false;
    }
  }

  verifySessionEndHook();
  const pathOk = verifyPath();

  return ok && pathOk;
}

function main() {
  console.log('🧠 KIMI Smart Orchestrator v2.0 — Installer\n');

  installScripts();
  installAliases();
  const ok = verify();

  console.log('\n' + (ok
    ? '✅ Installasjon fullført!\n\nNeste steg:'
    : '⚠️ Installasjon ufullstendig — sjekk feil over\n\nNeste steg:'));

  console.log('  1. source ~/.zshrc');
  console.log('  2. kimil "din oppgave"     # Generer brief + kontekst');
  console.log('  3. kimil --launch          # Auto-start KIMI med riktig agent');
  console.log('  4. Kjør KIMI som normalt, avslutt for å trigge post-session analyse');
  console.log('  5. Bruk: kimi-super        # Start KIMI med super-agent direkte');
}

main();

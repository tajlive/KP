#!/usr/bin/env node
/**
 * 🧠 KIMI Smart Orchestrator — Installer
 *
 * Kjør: node scripts/install-kimi-orchestrator.mjs
 *
 * Gjør følgende:
 * 1. Kopierer scripts til .kimi/bin/
 * 2. Legger til aliaser i .zshrc
 * 3. Oppretter hooks
 * 4. Verifiserer installasjon
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const home = homedir();
const root = process.cwd();
const binDir = resolve(home, '.kimi/bin');
const zshrc = resolve(home, '.zshrc');

const SCRIPTS = [
  { src: 'scripts/kimi-smart-orchestrator.mjs', dest: '.kimi/bin/kimi-smart' },
  { src: 'scripts/kimi-smart-brief.mjs', dest: '.kimi/bin/kimi-smart-brief' },
  { src: 'scripts/kimi-self-improve.mjs', dest: '.kimi/bin/kimi-self-improve' },
];

const ALIASES = [
  '# === KIMI Smart Orchestrator (auto-installert) ===',
  'alias kimis="kimi-smart"',
  'alias kimib="kimi-smart-brief"',
  'alias kimi-self="kimi-self-improve"',
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

  // Sjekk om bin er i PATH
  try {
    const pathEnv = process.env.PATH || '';
    if (pathEnv.includes('.kimi/bin')) {
      log('success', '  ✅ ~/.kimi/bin er i PATH');
    } else {
      log('warn', '  ⚠️  ~/.kimi/bin er IKKE i PATH — legg til i .zshrc:');
      log('warn', '     export PATH="$HOME/.kimi/bin:$PATH"');
    }
  } catch { /* ignore */ }

  return ok;
}

function main() {
  console.log('🧠 KIMI Smart Orchestrator — Installer\n');

  installScripts();
  installAliases();
  const ok = verify();

  console.log('\n' + (ok
    ? '✅ Installasjon fullført! Kjør: source ~/.zshrc && kimis'
    : '❌ Installasjon ufullstendig — sjekk feil over'));
}

main();

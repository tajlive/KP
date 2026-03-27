#!/usr/bin/env node
/**
 * validate-css-classes.mjs
 * Sjekker at alle bg-kp-*, text-kp-*, border-kp-*-klasser i koden
 * er faktisk definert i tailwind.config.mjs eller globals.css.
 * Exit 1 ved funn — blokkerer commit og CI.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');

// Gyldige kp-*-klasser fra tailwind.config.mjs (kp-objekt)
const TAILWIND_KP = new Set([
  // Bakgrunner
  'bg-kp-bg-primary', 'bg-kp-bg-secondary', 'bg-kp-bg-tertiary',
  // Tekst
  'text-kp-text-primary', 'text-kp-text-secondary', 'text-kp-text-tertiary',
  // Brand
  'bg-kp-brand', 'bg-kp-brand-light', 'bg-kp-brand-dark', 'bg-kp-brand-hover',
  'text-kp-brand', 'text-kp-brand-light', 'text-kp-brand-dark',
  // Dark theme
  'bg-kp-dark-bg', 'bg-kp-dark-surface',
  'text-kp-dark-accent',
  'border-kp-dark-border',
  // Border
  'border-kp-border',
  // Status
  'bg-kp-success', 'bg-kp-success-light', 'text-kp-success',
  'bg-kp-warning', 'bg-kp-warning-light', 'text-kp-warning',
  'bg-kp-danger', 'bg-kp-danger-light', 'text-kp-danger',
]);

// CSS-utility-klasser definert direkte i globals.css
const GLOBALS_CSS_KP = new Set([
  'bg-kp-primary', 'bg-kp-secondary', 'bg-kp-tertiary', 'bg-kp-card', 'bg-kp-surface',
  'text-kp-primary', 'text-kp-secondary', 'text-kp-tertiary', 'text-kp-muted',
  'border-kp', 'border-kp-light', 'border-kp-dark',
]);

const VALID = new Set([...TAILWIND_KP, ...GLOBALS_CSS_KP]);

// Kjente dynamisk genererte klasser som ikke kan statisk valideres
const KNOWN_DYNAMIC = new Set([
  // Legg til her hvis en klasse er bygd opp dynamisk f.eks. `bg-kp-${color}`
]);

function scanDir(dir) {
  const files = [];
  const SKIP = new Set(['node_modules', '.next', '.git', 'dist', 'out', 'coverage', 'allure-results', 'playwright-report']);
  try {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry)) continue;
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) files.push(...scanDir(full));
        else if (/\.(tsx|ts|jsx|js)$/.test(entry) && !entry.endsWith('.d.ts')) files.push(full);
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable dir */ }
  return files;
}

const KP_PATTERN = /(?<!['"`\w])((?:bg|text|border)-kp-[a-z][a-z0-9-]*)/g;
const errors = [];
const scanned = scanDir(join(ROOT, 'src'));

for (const file of scanned) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }

  // Hopp over rene type-filer og test-snapshots
  if (file.includes('__snapshots__') || file.endsWith('.d.ts')) continue;

  for (const m of content.matchAll(KP_PATTERN)) {
    const cls = m[1];
    if (VALID.has(cls) || KNOWN_DYNAMIC.has(cls)) continue;

    // Sjekk om det er en template literal som bygger klassen dynamisk
    const lineStart = content.lastIndexOf('\n', m.index) + 1;
    const lineEnd = content.indexOf('\n', m.index);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
    if (line.includes('${') && line.includes(cls.split('-kp-')[0])) continue; // dynamisk

    const lineNum = content.substring(0, m.index).split('\n').length;
    errors.push({
      file: file.replace(ROOT, '').replace(/^\//, ''),
      line: lineNum,
      cls,
    });
  }
}

if (errors.length > 0) {
  console.error('\n\x1b[31m✗ UGYLDIGE KP-TAILWIND-KLASSER FUNNET:\x1b[0m');
  const byFile = {};
  for (const e of errors) {
    (byFile[e.file] = byFile[e.file] || []).push(e);
  }
  for (const [file, errs] of Object.entries(byFile)) {
    console.error(`\n  \x1b[33m${file}\x1b[0m`);
    for (const { line, cls } of errs) {
      console.error(`    Linje ${line}: \x1b[31m${cls}\x1b[0m`);
    }
  }
  console.error(`\n\x1b[31mTotalt: ${errors.length} ugyldige klasser i ${Object.keys(byFile).length} filer.\x1b[0m`);
  console.error('Gyldige formater: bg-kp-bg-primary, text-kp-text-primary, bg-kp-primary, etc.');
  console.error('Legg til ny klasse i TAILWIND_KP eller GLOBALS_CSS_KP i dette scriptet.\n');
  process.exit(1);
} else {
  console.log(`\x1b[32m✓ CSS-klassevalidering OK — skannet ${scanned.length} filer, 0 ugyldige kp-*-klasser.\x1b[0m`);
}

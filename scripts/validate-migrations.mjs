#!/usr/bin/env node
/**
 * 🔒 Migrasjonsvalidator — v2.1
 *
 * Sjekker UTEN DB-tilkobling:
 * 1. Filnavnformat: MÅ være YYYYMMDDHHMMSS_beskrivelse.sql (14 siffer)
 * 2. Unike versjoner: Ingen duplikate timestamp-prefix
 * 3. Funksjonskollisjoner: Samme funksjonsnavn med ulike signaturer på tvers av filer
 * 4. SQL-kvalitet: Ikke tomme filer, ingen binært innhold
 * 5. Destruktive DDL: DROP/ALTER uten IF EXISTS / guard
 * 6. Idempotens: CREATE uten IF NOT EXISTS / OR REPLACE der det er relevant
 *
 * Brukes i:
 *   - CI (GitHub Actions db.yml)
 *   - Pre-commit hook
 *   - Pre-push hook
 *   - Manuelt: npm run db:validate-migrations
 *
 * Bruk:
 *   node scripts/validate-migrations.mjs              # Sjekk ALLE
 *   node scripts/validate-migrations.mjs --staged     # Sjekk kun staged filer
 *   node scripts/validate-migrations.mjs file1.sql    # Sjekk spesifikke filer
 *
 * Exit-koder:
 *   0 = alt OK
 *   1 = valideringsfeil
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { spawnSync } from 'child_process';

// ─── KONFIGURASJON ───

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const LEGACY_PREFIXES = ['001', '002', '003', '004', '005', '006', '007', '999'];

// 8-sifrede timestamps deployet til prod før validator v2.0 — tillates med warning
const LEGACY_ACCEPTED = new Set([
  '20260420_fix_pg_net_schema.sql',
  '20260421_session_archive_and_fifo_pnl.sql',
  '20260422_drop_legacy_trading_tables.sql',
  '20260424_sync_balances_on_trade_trigger.sql',
  '20260426_dashboard_metrics_rpc.sql',
]);

// Funksjoner som KAN ha flere overloads (whitelist)
const ALLOWED_OVERLOADS = new Set([]);

// ─── HJELPEFUNKSJONER ───

export function extractVersion(filename) {
  const m = filename.match(/^(\d+)_[\w-]+\.sql$/);
  return m ? m[1] : null;
}

export function isValidTimestamp(version) {
  if (!/^\d{14}$/.test(version)) return false;

  const year = parseInt(version.slice(0, 4), 10);
  const month = parseInt(version.slice(4, 6), 10);
  const day = parseInt(version.slice(6, 8), 10);
  const hour = parseInt(version.slice(8, 10), 10);
  const minute = parseInt(version.slice(10, 12), 10);
  const second = parseInt(version.slice(12, 14), 10);

  if (year < 2024 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23) return false;
  if (minute > 59) return false;
  if (second > 59) return false;

  return true;
}

export function extractFunctionSignatures(sql) {
  const signatures = [];
  const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(([^)]*)\)/gi;

  let match;
  while ((match = regex.exec(sql)) !== null) {
    const funcName = match[1].toLowerCase();
    const argsRaw = match[2].trim();

    const argTypes = argsRaw
      .split(',')
      .map((arg) => {
        const parts = arg.trim().split(/\s+/);
        return parts.length >= 2 ? parts[parts.length - 1].toLowerCase() : parts[0]?.toLowerCase();
      })
      .filter(Boolean);

    signatures.push({
      funcName,
      argTypes,
      signatureKey: `${funcName}(${argTypes.join(',')})`,
      argCount: argTypes.length,
    });
  }

  return signatures;
}

// ─── IDEMPOTENS / DESTRUKTIV DDL CHECKS ───

/**
 * Sjekker SQL for destruktive DDL uten sikkerhetsnett.
 * Returnerer array med feilmeldingsobjekter { line, message, fix }.
 */
export function checkDestructiveDDL(sql, _file) {
  const issues = [];
  const lines = sql.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    // Fjern kommentarer for matching (men behold original for output)
    const stripped = line.replace(/--.*$/, '').trim();
    if (!stripped) continue;

    // 1) DROP TABLE uten IF EXISTS
    const dropTableMatch = stripped.match(/DROP\s+TABLE\s+(?!IF\s+EXISTS\s+)(\w+)/i);
    if (dropTableMatch) {
      issues.push({
        line: lineNum,
        message: `DROP TABLE uten IF EXISTS: "${dropTableMatch[1]}"`,
        fix: `DROP TABLE IF EXISTS ${dropTableMatch[1]};`,
      });
    }

    // 2) DROP FUNCTION uten IF EXISTS
    const dropFuncMatch = stripped.match(/DROP\s+FUNCTION\s+(?!IF\s+EXISTS\s+)([\w.]+)\s*\(/i);
    if (dropFuncMatch) {
      issues.push({
        line: lineNum,
        message: `DROP FUNCTION uten IF EXISTS: "${dropFuncMatch[1]}(...)"`,
        fix: `DROP FUNCTION IF EXISTS ${dropFuncMatch[1]}(...);`,
      });
    }

    // 3) ALTER TABLE ... DROP COLUMN uten guard
    const alterDropColMatch = stripped.match(/ALTER\s+TABLE\s+(\w+)\s+DROP\s+COLUMN\s+(\w+)/i);
    if (alterDropColMatch) {
      issues.push({
        line: lineNum,
        message: `ALTER TABLE DROP COLUMN uten guard: "${alterDropColMatch[1]}.${alterDropColMatch[2]}"`,
        fix: `Vurder IF EXISTS-guard eller kommenter begrunnelse: -- safe: kolonnen er ikke i bruk`,
      });
    }

    // 4) DROP INDEX uten IF EXISTS
    const dropIndexMatch = stripped.match(/DROP\s+INDEX\s+(?!IF\s+EXISTS\s+)(\w+)/i);
    if (dropIndexMatch) {
      issues.push({
        line: lineNum,
        message: `DROP INDEX uten IF EXISTS: "${dropIndexMatch[1]}"`,
        fix: `DROP INDEX IF EXISTS ${dropIndexMatch[1]};`,
      });
    }
  }

  return issues;
}

/**
 * Sjekker SQL for manglende idempotens-mønstre.
 * Returnerer array med advarselsobjekter { line, message, fix }.
 */
export function checkIdempotency(sql, _file) {
  const issues = [];
  const lines = sql.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const stripped = line.replace(/--.*$/, '').trim();
    if (!stripped) continue;

    // 1) CREATE TABLE uten IF NOT EXISTS
    const createTableMatch = stripped.match(/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\s+)(\w+)/i);
    if (createTableMatch) {
      // Unntak: inni CTE (WITH ... AS) eller subquery — sjekk enkel context
      const isCTELike = stripped.match(/WITH\s+.*\s+AS\s*\(\s*CREATE/i);
      if (!isCTELike) {
        issues.push({
          line: lineNum,
          message: `CREATE TABLE uten IF NOT EXISTS: "${createTableMatch[1]}"`,
          fix: `CREATE TABLE IF NOT EXISTS ${createTableMatch[1]} (...);`,
        });
      }
    }

    // 2) CREATE FUNCTION uten OR REPLACE
    const createFuncMatch = stripped.match(/CREATE\s+FUNCTION\s+(?!OR\s+REPLACE\s+)([\w.]+)\s*\(/i);
    if (createFuncMatch) {
      issues.push({
        line: lineNum,
        message: `CREATE FUNCTION uten OR REPLACE: "${createFuncMatch[1]}(...)"`,
        fix: `CREATE OR REPLACE FUNCTION ${createFuncMatch[1]}(...);`,
      });
    }

    // 3) CREATE INDEX uten IF NOT EXISTS
    const createIndexMatch = stripped.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS\s+)(\w+)/i);
    if (createIndexMatch) {
      issues.push({
        line: lineNum,
        message: `CREATE INDEX uten IF NOT EXISTS: "${createIndexMatch[1]}"`,
        fix: `CREATE INDEX IF NOT EXISTS ${createIndexMatch[1]} ...;`,
      });
    }

    // 4) TRUNCATE (alltid destruktivt — advarsel)
    const truncateMatch = stripped.match(/TRUNCATE\s+TABLE\s+(\w+)/i);
    if (truncateMatch) {
      issues.push({
        line: lineNum,
        message: `TRUNCATE TABLE: "${truncateMatch[1]}" — irreversibelt data-tap`,
        fix: `Vurder DELETE med WHERE + backup, eller kommenter begrunnelse`,
      });
    }
  }

  return issues;
}

// ─── I/O-HJELPERE (ikke testbare uten fs-mock) ───

function getStagedMigrationFiles() {
  // Bruker ACM (Added/Copied/Modified) uten R (Renamed) for staged-sjekk.
  // Renamede filer har ikke nødvendigvis endret innhold og source-filen finnes
  // ikke lenger i working directory, så de valideres bedre som full scan.
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    encoding: 'utf8',
  });
  return (result.stdout || '')
    .split('\n')
    .filter((f) => f.startsWith('supabase/migrations/') && f.endsWith('.sql'))
    .map((f) => basename(f));
}

async function getAllMigrationFiles() {
  return readdir(MIGRATIONS_DIR).then((files) =>
    files.filter((f) => f.endsWith('.sql'))
  );
}

// ─── HOVEDVALIDERING ───

async function main() {
  const args = process.argv.slice(2);
  const checkStagedOnly = args.includes('--staged');
  const explicitFiles = args.filter((a) => !a.startsWith('--'));

  let filesToCheck;
  let allFiles;

  if (explicitFiles.length > 0) {
    filesToCheck = explicitFiles.map((f) => basename(f));
    allFiles = await getAllMigrationFiles();
  } else if (checkStagedOnly) {
    filesToCheck = getStagedMigrationFiles();
    allFiles = await getAllMigrationFiles();
    if (filesToCheck.length === 0) {
      console.log('✅ Ingen staged migrasjonsfiler — ingenting å validere');
      process.exit(0);
    }
  } else {
    allFiles = await getAllMigrationFiles();
    filesToCheck = allFiles;
  }

  const errors = [];
  const warnings = [];
  const versions = new Map(); // version -> filename (sjekk kun blant alle filer)
  const functionRegistry = new Map(); // funcName -> [{file, signatureKey}]

  // Bygg fullstendig versjonskart fra ALLE filer (for duplikat-sjekk)
  for (const file of allFiles) {
    const version = extractVersion(file);
    if (version) {
      if (versions.has(version)) {
        // Kun rapporter duplikat hvis minst én av filene skal sjekkes
        if (filesToCheck.includes(file) || filesToCheck.includes(versions.get(version))) {
          errors.push(
            `Duplikat migrasjonsversjon "${version}":\n` +
            `    ${versions.get(version)}\n` +
            `    ${file}\n` +
            `  Supabase CLI bruker "${version}" som primærnøkkel. ` +
            `Rename én av filene til et unikt YYYYMMDDHHMMSS-prefix.`
          );
        }
      } else {
        versions.set(version, file);
      }
    }
  }

  // Bygg fullstendig funksjonsregister fra ALLE filer
  for (const file of allFiles) {
    const path = join(MIGRATIONS_DIR, file);
    const content = await readFile(path, 'utf-8').catch(() => '');
    const signatures = extractFunctionSignatures(content);
    for (const sig of signatures) {
      if (!functionRegistry.has(sig.funcName)) {
        functionRegistry.set(sig.funcName, []);
      }
      functionRegistry.get(sig.funcName).push({
        file,
        signatureKey: sig.signatureKey,
        argTypes: sig.argTypes,
      });
    }
  }

  // Valider spesifikke filer
  for (const file of filesToCheck) {
    const version = extractVersion(file);

    if (!version) {
      errors.push(`Ugyldig filnavn: ${file} (må matche <timestamp>_navn.sql)`);
      continue;
    }

    // Sjekk timestamp-format
    if (LEGACY_PREFIXES.includes(version)) {
      warnings.push(`Legacy-prefix ${version}: ${file} (unngå for nye migrasjoner)`);
    } else if (!isValidTimestamp(version)) {
      const msg =
        `Ugyldig timestamp-prefix "${version}" i ${file}\n` +
        `    MÅ være 14 siffer: YYYYMMDDHHMMSS (f.eks. 20260430193000)\n` +
        `    Supabase CLI bruker prefix som versjonsnøkkel i schema_migrations.`;
      if (LEGACY_ACCEPTED.has(file)) {
        warnings.push(`[Legacy-accepted] ${msg}`);
      } else {
        errors.push(msg);
      }
    }

    // Les innhold
    const path = join(MIGRATIONS_DIR, file);
    const content = await readFile(path, 'utf-8').catch(() => '');

    if (!content || content.trim().length === 0) {
      errors.push(`Tom eller ulesbar fil: ${file}`);
      continue;
    }
    if (content.includes('\x00')) {
      errors.push(`Binært innhold i fil: ${file}`);
    }

    // Sjekk funksjonskollisjoner for funksjoner definert i DENNE filen
    const mySignatures = extractFunctionSignatures(content);
    for (const sig of mySignatures) {
      if (ALLOWED_OVERLOADS.has(sig.funcName)) continue;

      const allOccurrences = functionRegistry.get(sig.funcName) || [];
      if (allOccurrences.length <= 1) continue;

      const otherOccurrences = allOccurrences.filter((o) => o.file !== file);
      if (otherOccurrences.length === 0) continue;

      const mySigKey = sig.signatureKey;
      const hasDifferentSignature = otherOccurrences.some((o) => o.signatureKey !== mySigKey);

      if (hasDifferentSignature) {
        const details = allOccurrences
          .map((o) => `    ${o.file}: ${o.signatureKey}`)
          .join('\n');
        errors.push(
          `Funksjonssignatur-kollisjon for "${sig.funcName}":\n${details}\n` +
          `    Flere migrasjoner definerer samme funksjon med ulike signaturer.\n` +
          `    Fix: Bruk DROP FUNCTION IF EXISTS før CREATE, eller konsolider.`
        );
      }
    }

    // ─── NYTT: Destruktiv DDL + idempotens ───
    const destructiveIssues = checkDestructiveDDL(content, file);
    for (const issue of destructiveIssues) {
      errors.push(
        `Destruktiv DDL i ${file}:${issue.line}\n` +
        `    ${issue.message}\n` +
        `    Fix: ${issue.fix}`
      );
    }

    const idempotencyIssues = checkIdempotency(content, file);
    for (const issue of idempotencyIssues) {
      // Idempotens-issues behandles som errors (BLOCK for nye filer)
      // Nedgraderes til [Historisk] warning i full scan via isFullScan-logikken
      errors.push(
        `Idempotens i ${file}:${issue.line}\n` +
        `    ${issue.message}\n` +
        `    Fix: ${issue.fix}`
      );
    }
  }

  // ─── OUTPUT ───
  // I full-scan-modus (ikke --staged): nedgrader historiske formater til warnings
  const isFullScan = !checkStagedOnly && explicitFiles.length === 0;
  let displayErrors = errors;
  let displayWarnings = warnings;

  if (isFullScan) {
    const alwaysBlock = [];
    const historicalErrors = [];
    for (const e of errors) {
      // Duplikat-versjoner er ALLTID blocking uavhengig av full scan
      if (e.includes('Duplikat migrasjonsversjon')) {
        alwaysBlock.push(e);
      } else {
        historicalErrors.push(e);
      }
    }
    displayErrors = alwaysBlock;
    displayWarnings = [...warnings, ...historicalErrors.map((e) => `[Historisk] ${e}`)];
  }

  const hasErrors = displayErrors.length > 0;
  const hasWarnings = displayWarnings.length > 0;

  if (hasWarnings) {
    console.warn('⚠️  Migrasjonsadvarsler:\n');
    displayWarnings.forEach((w) => console.warn('  -', w.replace(/\n/g, '\n    ')));
    console.warn('');
  }

  if (hasErrors) {
    console.error('❌ Migrasjonsvalidering feilet:\n');
    displayErrors.forEach((e) => console.error('  -', e.replace(/\n/g, '\n    ')));
    console.error(`\n📚 Se: scripts/validate-migrations.mjs og .kimi/AGENTS.md#migrasjonskonvensjoner`);
    process.exit(1);
  }

  console.log(`✅ ${filesToCheck.length} migrasjonsfiler validert (ingen feil)`);
  if (hasWarnings) {
    console.log(`⚠️  ${displayWarnings.length} advarsel(er) — se over`);
  }
}

main();

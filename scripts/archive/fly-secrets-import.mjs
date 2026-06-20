#!/usr/bin/env node
/**
 * Fly.io Secrets Import Script
 * 
 * Reads .env.local and imports secrets to Fly.io app using 'flyctl secrets import'.
 * This uses stdin (file-based) instead of CLI args, avoiding command length limits.
 * Usage: node scripts/fly-secrets-import.mjs [--dry-run]
 * 
 * Requires: flyctl login + flyctl app exists
 */

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const APP_NAME = 'klarpakke';

// Secrets that should NOT be imported (public vars, build-time only)
const SKIP_KEYS = [
  'NODE_ENV',
  'PORT',
  'HOSTNAME',
  'FLY_IO',
  'VERCEL',
  'CF_PAGES',
];

// Secrets that MUST be set for the app to function
const REQUIRED_SECRETS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// At least one of these database connection secrets must be set
const REQUIRED_DB_SECRETS = ['POSTGRES_URL', 'DATABASE_URL'];

const PROJECT_REF = 'pskhryjzkobytnfwucrb';

/**
 * Validates that a Supavisor pooler URL includes the tenant reference.
 * Supabase requires `options=reference%3D<project-ref>` (or `options%3Dreference`)
 * so the pooler knows which tenant to route to. Without it the connection fails
 * with "tenant/user postgres.<random-id> not found".
 */
function validatePoolerUrl(key, url) {
  if (!url) return null;
  if (!url.includes('pooler.supabase.com')) return null;

  const hasReference =
    url.includes(`options=reference%3D${PROJECT_REF}`) ||
    url.includes(`options%3Dreference%3D${PROJECT_REF}`);

  if (!hasReference) {
    return `❌ ${key} points to pooler.supabase.com but is missing the required tenant reference.\n   Add: ?options=reference%3D${PROJECT_REF}\n   Current value: ${url}`;
  }

  return null;
}

function parseEnvFile(path) {
  const content = readFileSync(path, 'utf-8');
  const secrets = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    secrets[key] = value;
  }
  return secrets;
}

function main() {
  const envPath = join(process.cwd(), '.env.local');
  let secrets;
  try {
    secrets = parseEnvFile(envPath);
  } catch (err) {
    console.error(`❌ Failed to read ${envPath}: ${err.message}`);
    process.exit(1);
  }

  // Filter out skipped keys and empty values
  const toImport = Object.entries(secrets)
    .filter(([key, value]) => !SKIP_KEYS.includes(key) && value)
    .reduce((acc, [key, value]) => { acc[key] = value; return acc; }, {});

  console.log(`📦 Found ${Object.keys(toImport).length} secrets to import\n`);

  // Check required secrets
  for (const key of REQUIRED_SECRETS) {
    if (!toImport[key]) {
      console.warn(`⚠️  Missing required secret: ${key}`);
    }
  }

  // Check that at least one database connection secret is present
  const hasDbSecret = REQUIRED_DB_SECRETS.some((key) => toImport[key]);
  if (!hasDbSecret) {
    console.warn(
      `⚠️  Missing database connection secret. At least one of ${REQUIRED_DB_SECRETS.join(' / ')} must be set.`
    );
  }

  // Validate Supavisor pooler URLs include tenant reference
  const validationErrors = [];
  for (const key of REQUIRED_DB_SECRETS) {
    const error = validatePoolerUrl(key, toImport[key]);
    if (error) validationErrors.push(error);
  }

  if (validationErrors.length > 0) {
    console.error('\n' + validationErrors.join('\n\n'));
    console.error(
      '\n💡 Tip: Update POSTGRES_URL/DATABASE_URL in .env.local to include the Supavisor tenant reference.'
    );
    process.exit(1);
  }

  // Build .env format content for flyctl secrets import
  const envContent = Object.entries(toImport)
    .map(([key, value]) => {
      // Escape values that contain newlines or special chars
      if (value.includes('\n') || value.includes('"')) {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${value}`;
    })
    .join('\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — Secrets that would be imported:');
    for (const key of Object.keys(toImport).sort()) {
      const masked = toImport[key].length > 8
        ? toImport[key].slice(0, 4) + '...' + toImport[key].slice(-4)
        : '****';
      const extra = [];
      if (REQUIRED_DB_SECRETS.includes(key) && toImport[key].includes('pooler.supabase.com')) {
        const ok =
          toImport[key].includes(`options=reference%3D${PROJECT_REF}`) ||
          toImport[key].includes(`options%3Dreference%3D${PROJECT_REF}`);
        extra.push(ok ? '✅ options=reference OK' : '❌ missing options=reference');
      }
      console.log(`  ${key}=${masked}${extra.length ? ' ' + extra.join(' ') : ''}`);
    }
    console.log('\n✅ Dry run complete. Run without --dry-run to import.');
    return;
  }

  try {
    console.log('🚀 Importing secrets via flyctl secrets import...');
    // Use a subprocess with stdin to feed env content to flyctl secrets import.
    // This avoids command length limits and prevents secrets from appearing in
    // shell error messages or process listings.
    const result = spawnSync('flyctl', ['secrets', 'import', '--app', APP_NAME], {
      input: envContent,
      stdio: ['pipe', 'inherit', 'inherit'],
      encoding: 'utf-8',
    });
    if (result.status !== 0) {
      throw new Error(`flyctl secrets import exited with code ${result.status}`);
    }
    console.log('\n✅ Secrets imported successfully!');
  } catch (err) {
    console.error('\n❌ Failed to import secrets:', err.message);
    console.error('   Verify that the Fly app exists and that you are logged in to the correct organization.');
    process.exit(1);
  }
}

main();

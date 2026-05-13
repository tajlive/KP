#!/usr/bin/env node
/**
 * Fly.io Secrets Import Script
 * 
 * Reads .env.local and imports secrets to Fly.io app.
 * Usage: node scripts/fly-secrets-import.mjs [--dry-run]
 * 
 * Requires: flyctl login + flyctl app exists
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
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

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — Secrets that would be imported:');
    for (const key of Object.keys(toImport).sort()) {
      const masked = toImport[key].length > 8
        ? toImport[key].slice(0, 4) + '...' + toImport[key].slice(-4)
        : '****';
      console.log(`  ${key}=${masked}`);
    }
    console.log('\n✅ Dry run complete. Run without --dry-run to import.');
    return;
  }

  // Build flyctl secrets set command
  const args = Object.entries(toImport)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  try {
    const cmd = `flyctl secrets set ${args} --app ${APP_NAME}`;
    console.log('🚀 Importing secrets to Fly.io...');
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✅ Secrets imported successfully!');
  } catch (err) {
    console.error('\n❌ Failed to import secrets:', err.message);
    process.exit(1);
  }
}

main();

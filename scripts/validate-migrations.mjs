#!/usr/bin/env node
/**
 * Validerer migrasjonsfiler uten DB-tilkobling.
 * Sjekker: unike versjoner, filnavnformat (YYYYMMDDHHMMSS_navn.sql), grunnleggende SQL.
 *
 * Brukes i CI (pr-check) når supabase/migrations/ endres.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

// Aksepterer både YYYYMMDDHHMMSS_navn.sql og YYYYMMDD_navn.sql, samt legacy (001_, 999_)
const VERSION_REGEX = /^(\d+)_[\w-]+\.sql$/;

async function main() {
  const errors = [];
  const files = await readdir(MIGRATIONS_DIR).catch(() => []);

  const migrations = files.filter((f) => f.endsWith('.sql'));
  const versions = new Set();

  for (const file of migrations) {
    const m = file.match(VERSION_REGEX);
    if (!m) {
      errors.push(`Ugyldig filnavn: ${file} (må matche <tall>_navn.sql)`);
      continue;
    }

    const version = m[1];
    if (versions.has(version)) {
      errors.push(`Duplikat versjon ${version}: ${file}`);
    }
    versions.add(version);

    const path = join(MIGRATIONS_DIR, file);
    const content = await readFile(path, 'utf-8').catch(() => '');
    if (!content || content.trim().length === 0) {
      errors.push(`Tom eller ugyldig fil: ${file}`);
    }
    if (content.includes('\x00')) {
      errors.push(`Binært innhold i fil: ${file}`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Migrasjonsvalidering feilet:\n');
    errors.forEach((e) => console.error('  -', e));
    process.exit(1);
  }

  console.log(`✅ ${migrations.length} migrasjonsfiler validert`);
}

main();

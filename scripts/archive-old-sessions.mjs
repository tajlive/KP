#!/usr/bin/env node
/**
 * 📦 Archive Old Session Snapshots
 *
 * Flytter JSON session snapshots eldre enn N dager fra
 * .knowledge/session/ til .knowledge/session/archive/
 */

import { readdir, rename, mkdir } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const SESSION_DIR = '.knowledge/session';
const ARCHIVE_DIR = `${SESSION_DIR}/archive`;
const MAX_AGE_DAYS = 30;

async function main() {
  console.log('📦 Arkiverer gamle session snapshots...\n');

  if (!existsSync(SESSION_DIR)) {
    console.log('ℹ️  Ingen session-mappe funnet.');
    return;
  }

  if (!existsSync(ARCHIVE_DIR)) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
  }

  const files = (await readdir(SESSION_DIR)).filter(f => f.endsWith('.json'));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);

  let archived = 0;
  let kept = 0;

  for (const file of files) {
    const filepath = join(SESSION_DIR, file);
    const stats = statSync(filepath);
    if (stats.mtime < cutoff) {
      await rename(filepath, join(ARCHIVE_DIR, file));
      archived++;
    } else {
      kept++;
    }
  }

  console.log(`   📤 Arkiverte: ${archived} filer (eldre enn ${MAX_AGE_DAYS} dager)`);
  console.log(`   📁 Beholdt:   ${kept} filer`);
  console.log(`   📂 Arkiv:     ${ARCHIVE_DIR}/`);
}

main().catch(console.error);

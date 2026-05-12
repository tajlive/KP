#!/usr/bin/env node
/**
 * 🏛️ MemPalace Reindex - Tvinger full reindex ved å slette cache
 *
 * MemPalace MCP v3.3.0 auto-reindexerer ved oppstart basert på mtime.
 * Ved å slette cache-filen tvinger vi en full rebuild neste gang
 * KIMI CLI starter MCP-serveren.
 */

import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const CACHE_PATHS = [
  '.mempalace/index-cache-v3.json.gz',
  '.mempalace/index-cache-v3.json',
];

let deleted = 0;
for (const p of CACHE_PATHS) {
  const fullPath = join(process.cwd(), p);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
    console.log(`🗑️  Slettet: ${p}`);
    deleted++;
  }
}

if (deleted === 0) {
  console.log('ℹ️  Ingen cache-filer funnet. Neste MCP-start vil bygge index fra bunnen.');
} else {
  console.log(`✅ ${deleted} cache-fil(er) slettet.`);
}

console.log('📊 Neste KIMI-session med MCP vil auto-reindexere ved oppstart.');

#!/usr/bin/env node
/**
 * Post-build script for Cloudflare Pages
 * Restores all temporarily moved routes
 */

import { renameSync, existsSync } from 'fs';

const moves = [
  { from: 'src/api-temp', to: 'src/app/api', label: 'API routes' },
  { from: 'src/studio-temp', to: 'src/app/studio', label: 'Sanity Studio' },
  { from: 'src/admin-temp', to: 'src/app/[locale]/(admin)', label: 'Admin pages' },
  { from: 'src/dev-temp', to: 'src/app/[locale]/dev', label: 'Dev pages' },
];

for (const { from, to, label } of moves) {
  if (existsSync(from)) {
    renameSync(from, to);
    console.log(`📦 Restored ${label}: ${from}/ → ${to}/`);
  }
}

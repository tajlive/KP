#!/usr/bin/env node
/**
 * Pre-build script for Cloudflare Pages
 * Moves non-essential routes out to reduce bundle size under 100MB
 */

import { renameSync, existsSync } from 'fs';

const moves = [
  { from: 'src/app/api', to: 'src/api-temp', label: 'API routes' },
  { from: 'src/app/studio', to: 'src/studio-temp', label: 'Sanity Studio' },
  { from: 'src/app/[locale]/(admin)', to: 'src/admin-temp', label: 'Admin pages' },
  { from: 'src/app/[locale]/dev', to: 'src/dev-temp', label: 'Dev pages' },
];

for (const { from, to, label } of moves) {
  if (existsSync(from)) {
    renameSync(from, to);
    console.log(`📦 Moved ${label}: ${from}/ → ${to}/`);
  }
}

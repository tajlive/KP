#!/usr/bin/env node
/**
 * Pre-build script for Cloudflare Pages
 * Moves src/app/api/ out of the App Router to avoid edge-runtime errors
 */

import { renameSync, existsSync } from 'fs';

if (existsSync('src/app/api')) {
  renameSync('src/app/api', 'src/api-temp');
  console.log('📦 Moved src/app/api/ → src/api-temp/ for Cloudflare build');
}

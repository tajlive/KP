#!/usr/bin/env node
/**
 * Post-build script for Cloudflare Pages
 * Restores src/app/api/ after Cloudflare build
 */

import { renameSync, existsSync } from 'fs';

if (existsSync('src/api-temp')) {
  renameSync('src/api-temp', 'src/app/api');
  console.log('📦 Restored src/api-temp/ → src/app/api/');
}

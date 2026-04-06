#!/usr/bin/env node
import { execSync } from 'child_process';

const steps = [
  'npm run db:gen-types',
  'npm run type-check',
  'npm run test:critical',
  'npm run build',
];

for (const step of steps) {
  console.log(`Running: ${step}`);
  try {
    execSync(step, { stdio: 'inherit', cwd: '/Users/taj/klarpakke' });
    console.log('✅ PASS');
  } catch (e) {
    console.log('❌ FAIL');
    process.exit(1);
  }
}

console.log('🚀 Trading v3 READY FOR MERGE');
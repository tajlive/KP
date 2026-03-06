#!/usr/bin/env node
/**
 * Enable test access by setting onboarding cookie
 * 
 * Run this, then visit the URL it provides
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('🚀 Quick Fix for Test Access');
console.log('==============================\n');

console.log('Option 1: Visit this URL in your browser (while logged in):');
console.log(`  ${BASE_URL}/api/test/set-onboarding\n`);

console.log('Option 2: Use curl:');
console.log(`  curl ${BASE_URL}/api/test/set-onboarding\n`);

console.log('After running either option:');
console.log('  ✅ You should be able to access all protected pages');
console.log('  ✅ No more redirects to /onboarding');
console.log('  ✅ Cookie valid for 30 days\n');

console.log('Note: This is a temporary fix for testing only.');
console.log('For production, implement proper onboarding flow (KLA-91).\n');

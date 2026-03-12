#!/usr/bin/env node
/**
 * i18n Audit Script
 * Checks for missing translation keys in the codebase
 *
 * Usage:
 *   node scripts/i18n-audit.cjs
 *
 * Exit codes:
 *   0 - All keys present
 *   1 - Missing keys found
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.{tsx,ts}', {ignore: ['node_modules/**','**/*.test.*','**/*.spec.*']});

const usedKeys = new Set();

// Regex to find useTranslations("namespace") calls
const useTranslationsRegex = /useTranslations\(['"]([\w.]+)['"]\)/g;
// Regex to find t("key") calls
const tCallRegex = /\bt\(['"]([\w.]+)['"]/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');

  // Find all useTranslations namespaces in this file
  const namespaces = [];
  let match;
  while ((match = useTranslationsRegex.exec(content)) !== null) {
    namespaces.push(match[1]);
  }

  // If no namespaces found, skip
  if (namespaces.length === 0) return;

  // For simplicity, use the first namespace (most common pattern)
  const namespace = namespaces[0];

  // Find all t() calls
  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[1];
    // Build full key: namespace.key
    const fullKey = namespace + '.' + key;
    usedKeys.add(fullKey);
  }
});

// Helper to flatten nested object keys
function flattenKeys(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).reduce((acc, key) => {
    const full = prefix ? prefix + '.' + key : key;
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return [...acc, ...flattenKeys(val, full)];
    }
    return [...acc, full];
  }, []);
}

// Load all available keys from EN messages
const available = new Set();
const dir = 'messages/en';
fs.readdirSync(dir).forEach(file => {
  if (!file.endsWith('.json')) return;
  const ns = file.replace('.json','');
  const data = JSON.parse(fs.readFileSync(path.join(dir,file),'utf-8'));
  flattenKeys(data).forEach(k => available.add(ns + '.' + k));
});

console.log('🌐 i18n Audit');
console.log('═══════════════════════════════════════════════════════════════\n');

let missing = 0;
const missingByNamespace = {};

usedKeys.forEach(key => {
  if (!available.has(key)) {
    // Extract namespace (first part)
    const parts = key.split('.');
    const ns = parts[0];
    const subKey = parts.slice(1).join('.');

    if (!missingByNamespace[ns]) {
      missingByNamespace[ns] = [];
    }
    missingByNamespace[ns].push(subKey);
    missing++;
  }
});

// Print grouped by namespace
if (missing > 0) {
  console.log('❌ Missing keys found:\n');
  Object.keys(missingByNamespace).sort().forEach(ns => {
    console.log(`   📁 ${ns}.json:`);
    missingByNamespace[ns].sort().forEach(key => {
      console.log(`      - ${key}`);
    });
  });
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`❌ Total missing keys: ${missing}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
} else {
  console.log('✅ All translation keys are present!');
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ i18n audit passed');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

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

// Matches: const t = useTranslations('ns') / const t = await getTranslations('ns')
const translatorAssignmentRegex =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*['"]([\w.]+)['"]\s*\)/g;
// Matches inline usage: useTranslations('ns')('key')
const inlineTranslatorCallRegex =
  /(?:useTranslations|getTranslations)\(\s*['"]([\w.]+)['"]\s*\)\(\s*['"]([\w.]+)['"]/g;
// Matches direct key calls: t('key')
const translatorCallRegex = /\b([A-Za-z_$][\w$]*)\(\s*['"]([\w.]+)['"]/g;
// Matches method calls: t.rich('key'), t.raw('key'), t.markup('key')
const translatorMethodCallRegex =
  /\b([A-Za-z_$][\w$]*)\.(?:rich|raw|markup)\(\s*['"]([\w.]+)['"]/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const translators = new Map();
  let match;

  // Reset regex state for this file
  translatorAssignmentRegex.lastIndex = 0;
  inlineTranslatorCallRegex.lastIndex = 0;
  translatorCallRegex.lastIndex = 0;
  translatorMethodCallRegex.lastIndex = 0;

  while ((match = translatorAssignmentRegex.exec(content)) !== null) {
    const [, varName, namespace] = match;
    translators.set(varName, namespace);
  }

  while ((match = inlineTranslatorCallRegex.exec(content)) !== null) {
    const [, namespace, key] = match;
    usedKeys.add(`${namespace}.${key}`);
  }

  // If no translator bindings in file, skip direct call parsing
  if (translators.size === 0) return;

  while ((match = translatorCallRegex.exec(content)) !== null) {
    const [, varName, key] = match;
    const namespace = translators.get(varName);
    if (!namespace) continue;
    usedKeys.add(`${namespace}.${key}`);
  }

  while ((match = translatorMethodCallRegex.exec(content)) !== null) {
    const [, varName, key] = match;
    const namespace = translators.get(varName);
    if (!namespace) continue;
    usedKeys.add(`${namespace}.${key}`);
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

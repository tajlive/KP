#!/usr/bin/env node
/**
 * i18n Usage Validation
 * Sjekker at alle t("key")-kall i kildekoden har tilsvarende nøkkel i messages/no.json
 *
 * Usage: node scripts/validate-i18n-usage.js
 *        npm run i18n:usage
 *        npm run pre-push (kjører automatisk i gate 1)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, '..', 'src');
const MSG_FILE = path.join(__dirname, '..', 'messages', 'no.json');

function loadJSON(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch (e) {
    console.error(`❌ Failed to load ${fp}: ${e.message}`);
    process.exit(1);
  }
}

function walkDir(dir) {
  const files = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.next', '.git', '__tests__'].includes(entry.name)) {
          files.push(...walkDir(fp));
        }
      } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
        files.push(fp);
      }
    }
  } catch {}
  return files;
}

function keyExists(messages, fullKey) {
  const parts = fullKey.split('.');
  let cur = messages;
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

function findTranslations(content) {
  // Find useTranslations("ns") calls
  const nsMatch = content.match(/useTranslations\s*\(\s*["']([^"']+)["']\s*\)/);
  const namespace = nsMatch ? nsMatch[1] : null;

  // Find ALL t("key") calls — but filter out:
  // - t("key1", "key2") — comma-separated SQL column patterns 
  // - t`key` - template literal without interpolation (valid)
  // - t(`${var}`) — dynamic key (cannot validate)
  const tCalls = [];
  const regex = /(?<=[^./])t\s*\([`'"]([a-zA-Z][^`'",)]+)[`'"]\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1].trim();
    // Filter false positives: SQL column lists, empty strings, multiline
    if (key && !key.includes(',') && !key.includes('\n') && !key.includes('${')) {
      tCalls.push(key);
    }
  }

  return { namespace, keys: tCalls };
}

function isRelevant(relPath) {
  // Skip test files and admin pages
  if (relPath.includes('/__tests__/')) return false;
  if (relPath.includes('.test.')) return false;
  return true;
}

function main() {
  const messages = loadJSON(MSG_FILE);
  const sourceFiles = walkDir(SRC_DIR);
  
  const missing = {}; // namespace → [{ file, key, fullKey }]
  const seen = new Set();
  let checkedWithNs = 0;
  
  for (const fp of sourceFiles) {
    const relPath = path.relative(SRC_DIR, fp);
    if (!isRelevant(relPath)) continue;
    
    const content = fs.readFileSync(fp, 'utf-8');
    const { namespace, keys } = findTranslations(content);
    if (!namespace) continue;
    
    checkedWithNs++;
    
    for (const key of keys) {
      const fullKey = `${namespace}.${key}`;
      if (seen.has(fullKey)) continue;
      seen.add(fullKey);
      
      if (!keyExists(messages, fullKey)) {
        if (!missing[namespace]) missing[namespace] = [];
        missing[namespace].push({ file: relPath, key, fullKey });
      }
    }
  }

  console.log(`\n📊  Sjekket ${checkedWithNs} filer med useTranslations`);
  console.log(`   Totale t() kall funnet: ${seen.size}\n`);

  const totalMissing = Object.values(missing).reduce((sum, arr) => sum + arr.length, 0);

  if (totalMissing === 0) {
    console.log('✅  Alle t("key")-kall har tilsvarende nøkkel i messages/no.json');
    process.exit(0);
  }

  console.log(`❌  Fant ${totalMissing} manglende nøkler (${Object.keys(missing).length} namespaces):\n`);
  
  for (const [ns, items] of Object.entries(missing).sort()) {
    console.log(`  [${ns}] — ${items.length} mangler`);
    for (const item of items.slice(0, 5)) {
      console.log(`    - ${item.fullKey}`);
      console.log(`      ${item.file}`);
    }
    if (items.length > 5) {
      console.log(`      ... og ${items.length - 5} til`);
    }
    console.log('');
  }

  process.exit(1);
}

main();

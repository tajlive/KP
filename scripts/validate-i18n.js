#!/usr/bin/env node
/**
 * i18n Validation Script
 * Sjekker at alle språk har samme struktur og nøkler
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_DIR = path.join(__dirname, '../messages');
const LANGUAGES = ['no', 'en', 'th']; // Kinesisk (zh) er på vent

function loadJSON(filename) {
  const filepath = path.join(MESSAGES_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function getAllKeys(obj, prefix = '') {
  const keys = new Set();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const subKeys = getAllKeys(value, fullKey);
      subKeys.forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  
  return keys;
}

function getValueAtPath(obj, path) {
  const parts = path.split('.');
  let value = obj;
  
  for (const part of parts) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return undefined;
    }
    value = value[part];
  }
  
  return value;
}

function main() {
  console.log('🌐  i18n Validation');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Load all languages
  const translations = {};
  let hasError = false;
  
  for (const lang of LANGUAGES) {
    const data = loadJSON(`${lang}.json`);
    if (!data) {
      hasError = true;
      continue;
    }
    translations[lang] = {
      data,
      keys: getAllKeys(data)
    };
  }
  
  if (hasError) {
    process.exit(1);
  }
  
  // Use Norwegian as reference
  const referenceLang = 'no';
  const reference = translations[referenceLang];
  
  console.log(`📊  Reference language: ${referenceLang.toUpperCase()}`);
  console.log(`   Total keys: ${reference.keys.size}\n`);
  
  // Check each language against reference
  let totalMissing = 0;
  let totalExtra = 0;
  
  for (const lang of LANGUAGES) {
    if (lang === referenceLang) continue;
    
    const current = translations[lang];
    const missing = [];
    const extra = [];
    const empty = [];
    
    // Find missing keys
    for (const key of reference.keys) {
      if (!current.keys.has(key)) {
        missing.push(key);
      } else {
        const value = getValueAtPath(current.data, key);
        if (!value || value === '' || value === 'null' || value === 'undefined') {
          empty.push(key);
        }
      }
    }
    
    // Find extra keys
    for (const key of current.keys) {
      if (!reference.keys.has(key)) {
        extra.push(key);
      }
    }
    
    // Report
    console.log(`🇳🇴  →  ${lang.toUpperCase() === 'EN' ? '🇬🇧' : lang.toUpperCase() === 'TH' ? '🇹🇭' : '🇳🇴'}  ${lang.toUpperCase()}`);
    console.log(`   Keys: ${current.keys.size}/${reference.keys.size}`);
    
    if (missing.length === 0 && extra.length === 0 && empty.length === 0) {
      console.log('   ✅  Perfect match!\n');
    } else {
      if (missing.length > 0) {
        console.log(`   ❌  Missing: ${missing.length} keys`);
        missing.slice(0, 5).forEach(k => console.log(`       - ${k}`));
        if (missing.length > 5) console.log(`       ... and ${missing.length - 5} more`);
      }
      
      if (empty.length > 0) {
        console.log(`   ⚠️   Empty: ${empty.length} keys`);
        empty.slice(0, 3).forEach(k => console.log(`       - ${k}`));
        if (empty.length > 3) console.log(`       ... and ${empty.length - 3} more`);
      }
      
      if (extra.length > 0) {
        console.log(`   📦  Extra: ${extra.length} keys (not in reference)`);
        extra.slice(0, 3).forEach(k => console.log(`       - ${k}`));
        if (extra.length > 3) console.log(`       ... and ${extra.length - 3} more`);
      }
      
      console.log('');
      totalMissing += missing.length;
      totalExtra += extra.length;
    }
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (totalMissing === 0 && totalExtra === 0) {
    console.log('✅  All languages are synchronized!');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.log(`❌  Found ${totalMissing} missing and ${totalExtra} extra keys`);
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

main();

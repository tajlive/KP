#!/usr/bin/env node
/**
 * Fix i18n structure - align EN with NO structure
 */

const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../messages');
const noPath = path.join(messagesDir, 'no.json');
const enPath = path.join(messagesDir, 'en.json');

function loadJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const no = loadJSON(noPath);
let en = loadJSON(enPath);

console.log('🔧 Fixing i18n structure...\n');

// 1. Move misplaced keys from metadata to root
const keysToMove = ['meta', 'base', 'common', 'courses'];
for (const key of keysToMove) {
  if (en.metadata && key in en.metadata) {
    console.log(`📦 Moving metadata.${key} -> ${key}`);
    en[key] = deepCopy(en.metadata[key]);
    delete en.metadata[key];
  }
}

// 2. Remove misplaced keys from metadata
const keysToRemove = ['studyProgram', 'school'];
for (const key of keysToRemove) {
  if (en.metadata && key in en.metadata) {
    console.log(`🗑️  Removing misplaced metadata.${key}`);
    delete en.metadata[key];
  }
}

// 3. Add missing keys to EN (copy from NO)
const missingRootKeys = ['navigation'];
for (const key of missingRootKeys) {
  if (!(key in en) && key in no) {
    console.log(`➕ Adding missing key: ${key}`);
    en[key] = deepCopy(no[key]);
  }
}

// 4. Fix metadata.login structure - add description if missing
if (en.metadata && en.metadata.login) {
  if (!en.metadata.login.description) {
    console.log('📝 Adding metadata.login.description');
    en.metadata.login.description = 'Sign in to your Klarpakke account to access trading courses, paper trading, and automated signals.';
  }
  
  // Move login.dashboard to metadata.dashboard if not exists
  if (en.metadata.login.dashboard && !en.metadata.dashboard) {
    console.log('📦 Moving metadata.login.dashboard -> metadata.dashboard');
    en.metadata.dashboard = deepCopy(en.metadata.login.dashboard);
    delete en.metadata.login.dashboard;
  }
  
  // Move login.courses to metadata.courses if not exists
  if (en.metadata.login.courses && !en.metadata.courses) {
    console.log('📦 Moving metadata.login.courses -> metadata.courses');
    en.metadata.courses = deepCopy(en.metadata.login.courses);
    delete en.metadata.login.courses;
  }
}

// 5. Add missing metadata.courses if not exists
if (!en.metadata.courses && no.metadata.courses) {
  console.log('➕ Adding metadata.courses');
  en.metadata.courses = deepCopy(no.metadata.courses);
}

// 6. Add missing metadata.dashboard if not exists  
if (!en.metadata.dashboard && no.metadata.dashboard) {
  console.log('➕ Adding metadata.dashboard');
  en.metadata.dashboard = deepCopy(no.metadata.dashboard);
}

// Save fixed files
saveJSON(enPath, en);

console.log('\n✅ EN file structure fixed!');
console.log('\n🔍 Running validation...\n');

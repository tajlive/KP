#!/usr/bin/env node
/**
 * i18n Audit Script
 * 
 * Scanner kodebasen for i18n nøkler og sammenligner med messages JSON filer
 * Genererer rapport over manglende nøkler og forslag til oversettelser
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const SRC_DIR = join(ROOT_DIR, "src");
const MESSAGES_DIR = join(ROOT_DIR, "messages");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Recursively find all .tsx files in directory
 */
function findTsxFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes("node_modules") && !item.startsWith(".")) {
      findTsxFiles(fullPath, files);
    } else if (stat.isFile() && item.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract i18n keys from file content
 */
function extractI18nKeys(content, filePath) {
  const keys = [];
  
  // Match useTranslations("namespace") or useTranslations('namespace')
  const useTranslationsRegex = /useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = useTranslationsRegex.exec(content)) !== null) {
    keys.push({
      type: "namespace",
      value: match[1],
      file: relative(ROOT_DIR, filePath),
    });
  }
  
  // Match t("key") or t('key') - includes namespace.key format
  const tFunctionRegex = /t\s*\(\s*["']([^"']+)["']/g;
  while ((match = tFunctionRegex.exec(content)) !== null) {
    // Skip if it's a variable or template literal
    if (!match[1].includes("${")) {
      keys.push({
        type: "key",
        value: match[1],
        file: relative(ROOT_DIR, filePath),
      });
    }
  }
  
  return keys;
}

/**
 * Load JSON file
 */
function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    return {};
  }
}

/**
 * Flatten nested JSON object to dot-notation keys
 */
function flattenKeys(obj, prefix = "") {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Check if key exists in flattened keys
 */
function keyExists(key, flatKeys) {
  // Check exact match
  if (flatKeys.includes(key)) return true;
  
  // Check if key is a parent of existing keys
  return flatKeys.some(k => k.startsWith(`${key}.`));
}

/**
 * Generate translation suggestions
 */
function generateSuggestion(key) {
  // Convert camelCase/Snake_case to readable text
  const readable = key
    .split(/[._]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return readable;
}

/**
 * Main audit function
 */
async function runAudit() {
  log("🌐 i18n Audit", "cyan");
  log("═══════════════════════════════════════════════════════════", "cyan");
  
  // Step 1: Scan all .tsx files
  log("\n📁 Scanning .tsx files...", "blue");
  const tsxFiles = findTsxFiles(SRC_DIR);
  log(`   Found ${tsxFiles.length} .tsx files`, "green");
  
  // Step 2: Extract i18n keys
  log("\n🔍 Extracting i18n keys...", "blue");
  const allKeys = [];
  
  for (const file of tsxFiles) {
    const content = readFileSync(file, "utf-8");
    const keys = extractI18nKeys(content, file);
    allKeys.push(...keys);
  }
  
  // Get unique keys
  const uniqueNamespaces = [...new Set(allKeys
    .filter(k => k.type === "namespace")
    .map(k => k.value))];
  
  const uniqueKeys = [...new Set(allKeys
    .filter(k => k.type === "key")
    .map(k => k.value))];
  
  log(`   Found ${uniqueNamespaces.length} namespaces`, "green");
  log(`   Found ${uniqueKeys.length} translation keys`, "green");
  
  // Step 3: Load ALL message files
  log("\n📂 Loading message files...", "blue");
  
  // Load all JSON files from messages/no/ and messages/en/
  function loadAllMessages(locale) {
    const localeDir = join(MESSAGES_DIR, locale);
    const allMessages = {};
    
    try {
      const files = readdirSync(localeDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const namespace = file.replace('.json', '');
          const content = loadJson(join(localeDir, file));
          allMessages[namespace] = content;
        }
      }
    } catch (e) {
      log(`   Warning: Could not read ${locale} messages`, "yellow");
    }
    
    return allMessages;
  }
  
  const noMessages = loadAllMessages("no");
  const enMessages = loadAllMessages("en");
  
  // Flatten with namespace prefix
  const noFlatKeys = [];
  const enFlatKeys = [];
  
  for (const [namespace, content] of Object.entries(noMessages)) {
    const keys = flattenKeys(content);
    for (const key of keys) {
      noFlatKeys.push(`${namespace}.${key}`);
    }
  }
  
  for (const [namespace, content] of Object.entries(enMessages)) {
    const keys = flattenKeys(content);
    for (const key of keys) {
      enFlatKeys.push(`${namespace}.${key}`);
    }
  }
  
  log(`   NO keys: ${noFlatKeys.length}`, "green");
  log(`   EN keys: ${enFlatKeys.length}`, "green");
  
  // Step 4: Find missing keys (handle namespace.key format)
  log("\n⚠️  Checking for missing keys...", "yellow");
  
  const missingInNo = [];
  const missingInEn = [];
  
  for (const key of uniqueKeys) {
    // Check if key already includes namespace (e.g., "dashboard.title")
    const hasNamespace = key.includes('.');
    const fullKey = hasNamespace ? key : `common.${key}`;
    
    if (!keyExists(fullKey, noFlatKeys)) {
      missingInNo.push({
        key: fullKey,
        files: allKeys
          .filter(k => k.type === "key" && k.value === key)
          .map(k => k.file)
      });
    }
    
    if (!keyExists(fullKey, enFlatKeys)) {
      missingInEn.push({
        key: fullKey,
        files: allKeys
          .filter(k => k.type === "key" && k.value === key)
          .map(k => k.file)
      });
    }
  }
  
  // Step 5: Find orphaned keys (in messages but not in code)
  const codeKeys = new Set(uniqueKeys);
  const orphanedInNo = noFlatKeys.filter(k => !keyExists(k, [...codeKeys]));
  const orphanedInEn = enFlatKeys.filter(k => !keyExists(k, [...codeKeys]));
  
  // Step 6: Generate report
  const report = {
    summary: {
      totalFilesScanned: tsxFiles.length,
      totalNamespaces: uniqueNamespaces.length,
      totalKeys: uniqueKeys.length,
      noKeys: noFlatKeys.length,
      enKeys: enFlatKeys.length,
      missingInNo: missingInNo.length,
      missingInEn: missingInEn.length,
      orphanedInNo: orphanedInNo.length,
      orphanedInEn: orphanedInEn.length,
    },
    namespaces: uniqueNamespaces,
    missing: {
      no: missingInNo,
      en: missingInEn,
    },
    orphaned: {
      no: orphanedInNo,
      en: orphanedInEn,
    },
    suggestions: {},
  };
  
  // Generate suggestions for missing keys
  for (const { key } of [...missingInNo, ...missingInEn]) {
    if (!report.suggestions[key]) {
      report.suggestions[key] = generateSuggestion(key);
    }
  }
  
  // Step 7: Output results
  log("\n📊 Audit Results", "magenta");
  log("═══════════════════════════════════════════════════════════", "magenta");
  
  log(`\n   Files Scanned: ${report.summary.totalFilesScanned}`, "blue");
  log(`   Namespaces: ${report.summary.totalNamespaces}`, "blue");
  log(`   Translation Keys: ${report.summary.totalKeys}`, "blue");
  
  if (missingInNo.length > 0) {
    log(`\n   ❌ Missing in NO: ${missingInNo.length} keys`, "red");
    missingInNo.slice(0, 10).forEach(({ key }) => {
      log(`      - ${key}`, "red");
    });
    if (missingInNo.length > 10) {
      log(`      ... and ${missingInNo.length - 10} more`, "red");
    }
  } else {
    log(`\n   ✅ All keys found in NO`, "green");
  }
  
  if (missingInEn.length > 0) {
    log(`\n   ❌ Missing in EN: ${missingInEn.length} keys`, "red");
    missingInEn.slice(0, 10).forEach(({ key }) => {
      log(`      - ${key}`, "red");
    });
    if (missingInEn.length > 10) {
      log(`      ... and ${missingInEn.length - 10} more`, "red");
    }
  } else {
    log(`\n   ✅ All keys found in EN`, "green");
  }
  
  if (orphanedInNo.length > 0) {
    log(`\n   ⚠️  Orphaned in NO: ${orphanedInNo.length} keys`, "yellow");
    orphanedInNo.slice(0, 5).forEach(key => {
      log(`      - ${key}`, "yellow");
    });
  }
  
  // Save report
  const reportPath = join(ROOT_DIR, "i18n-audit-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n💾 Report saved to: ${relative(ROOT_DIR, reportPath)}`, "cyan");
  
  return report;
}

// Run audit
runAudit().catch(console.error);

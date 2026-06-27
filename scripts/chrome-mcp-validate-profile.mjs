#!/usr/bin/env node
/**
 * Validate Chrome profile import for the Chrome Control MCP server.
 *
 * Checks:
 * - Detected system Chrome profile path
 * - Whether Chrome is currently running (SingletonLock)
 * - Local .chrome-profile/ state and size
 * - Backup directories
 *
 * Usage:
 *   node scripts/chrome-mcp-validate-profile.mjs
 *   node scripts/chrome-mcp-validate-profile.mjs --copy
 */
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import {
  existsSync,
  readdirSync,
  statSync,
  readFileSync,
  cpSync,
  rmSync,
  renameSync,
} from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROFILE_DIR = resolve(ROOT, ".chrome-profile");

function systemChromeProfilePath() {
  if (process.platform === "darwin") {
    return resolve(process.env.HOME, "Library/Application Support/Google/Chrome");
  }
  if (process.platform === "linux") {
    return resolve(process.env.HOME, ".config/google-chrome");
  }
  if (process.platform === "win32") {
    return resolve(process.env.LOCALAPPDATA || "", "Google/Chrome/User Data");
  }
  return null;
}

function isChromeRunning(profilePath) {
  const lock = resolve(profilePath, "SingletonLock");
  if (!existsSync(lock)) return false;
  try {
    const contents = readFileSync(lock, "utf8").trim();
    return contents.length > 0;
  } catch {
    return false;
  }
}

function getDirSize(dirPath) {
  if (!existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const parent = entry.parentPath || entry.path || dirPath;
        total += statSync(resolve(parent, entry.name)).size;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log10(bytes) / 3);
  const value = bytes / Math.pow(1000, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function checkImportantFiles(profilePath) {
  const checks = [
    { name: "Login Data (passwords)", path: resolve(profilePath, "Default/Login Data") },
    { name: "Cookies (legacy)", path: resolve(profilePath, "Default/Cookies") },
    { name: "Network Cookies", path: resolve(profilePath, "Network/Cookies") },
    { name: "Local Storage", path: resolve(profilePath, "Default/Local Storage") },
    { name: "Session Storage", path: resolve(profilePath, "Default/Session Storage") },
    { name: "Preferences", path: resolve(profilePath, "Default/Preferences") },
    { name: "Local State", path: resolve(profilePath, "Local State") },
  ];
  return checks.map((c) => ({ ...c, exists: existsSync(c.path) }));
}

function doCopy() {
  const src = systemChromeProfilePath();
  if (!src || !existsSync(src)) {
    console.error(`❌ System Chrome profile not found at ${src}`);
    process.exit(1);
  }
  if (isChromeRunning(src)) {
    const lock = resolve(src, "SingletonLock");
    const pid = existsSync(lock) ? readFileSync(lock, "utf8").trim() : "unknown";
    console.error(`❌ Chrome is running (SingletonLock pid=${pid}). Close Chrome first.`);
    process.exit(1);
  }

  let backupDir = null;
  if (existsSync(PROFILE_DIR)) {
    backupDir = `${PROFILE_DIR}.backup-${Date.now()}`;
    renameSync(PROFILE_DIR, backupDir);
    console.log(`📦 Backed up existing profile to ${backupDir}`);
  }

  const skip = new Set([
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "lockfile",
    "Code Cache",
    "GPUCache",
    "Cache",
    "GrShaderCache",
    "ShaderCache",
    "blob_storage",
  ]);

  cpSync(src, PROFILE_DIR, {
    recursive: true,
    filter: (srcPath) => {
      const name = basename(srcPath);
      return !skip.has(name);
    },
  });

  const size = getDirSize(PROFILE_DIR);
  console.log(`✅ Copied system profile to ${PROFILE_DIR} (${formatBytes(size)})`);
  return { src, dest: PROFILE_DIR, backupDir };
}

function main() {
  const doCopyFlag = process.argv.includes("--copy");

  console.log("🔍 Chrome Profile Validator for MCP");
  console.log(`Platform: ${process.platform}`);
  console.log("");

  const sysPath = systemChromeProfilePath();
  console.log(`System profile path: ${sysPath || "(unsupported platform)"}`);
  console.log(`System profile exists: ${sysPath ? existsSync(sysPath) : false}`);
  console.log(`System profile running: ${sysPath ? isChromeRunning(sysPath) : false}`);
  console.log("");

  if (sysPath && existsSync(sysPath)) {
    console.log("Important system profile files:");
    for (const check of checkImportantFiles(sysPath)) {
      console.log(`  ${check.exists ? "✅" : "❌"} ${check.name}: ${check.path}`);
    }
    console.log(`  Total size: ${formatBytes(getDirSize(sysPath))}`);
    console.log("");
  }

  console.log(`Local profile path: ${PROFILE_DIR}`);
  console.log(`Local profile exists: ${existsSync(PROFILE_DIR)}`);
  console.log(`Local profile size: ${formatBytes(getDirSize(PROFILE_DIR))}`);
  if (existsSync(PROFILE_DIR)) {
    console.log("Local important files:");
    for (const check of checkImportantFiles(PROFILE_DIR)) {
      console.log(`  ${check.exists ? "✅" : "❌"} ${check.name}: ${check.path}`);
    }
  }
  console.log("");

  const backups = [];
  try {
    const parent = dirname(PROFILE_DIR);
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(".chrome-profile.backup-")) {
        backups.push(resolve(parent, entry.name));
      }
    }
  } catch {
    // ignore
  }
  console.log(`Profile backups found: ${backups.length}`);
  for (const b of backups) {
    console.log(`  - ${b} (${formatBytes(getDirSize(b))})`);
  }
  console.log("");

  if (doCopyFlag) {
    console.log("--copy requested, copying system profile...");
    doCopy();
  } else {
    console.log("Tip: run with --copy to import the system profile now.");
  }
}

main();

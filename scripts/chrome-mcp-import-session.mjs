#!/usr/bin/env node
/**
 * Import the user's system Chrome profile into .chrome-profile/ for session reuse.
 *
 * This is a convenience wrapper around the copy logic used by chrome_start with
 * profileMode='copy' or 'storage'. Use it when you want to refresh the local
 * profile before starting the MCP server.
 *
 * Usage:
 *   node scripts/chrome-mcp-import-session.mjs
 *   node scripts/chrome-mcp-import-session.mjs --mode=storage
 */
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { existsSync, cpSync, rmSync, renameSync, readFileSync } from "fs";

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

function parseArgs() {
  const args = process.argv.slice(2);
  let mode = "copy";
  for (const arg of args) {
    if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length);
    }
  }
  return { mode };
}

function main() {
  const { mode } = parseArgs();
  if (!["copy", "storage"].includes(mode)) {
    console.error(`❌ Invalid mode: ${mode}. Allowed: copy, storage`);
    process.exit(1);
  }

  console.log(`🔄 Importing system Chrome profile (mode: ${mode})...`);

  const src = systemChromeProfilePath();
  if (!src || !existsSync(src)) {
    console.error(`❌ System Chrome profile not found at ${src} (platform: ${process.platform})`);
    process.exit(1);
  }

  if (isChromeRunning(src)) {
    const lock = resolve(src, "SingletonLock");
    const pid = existsSync(lock) ? readFileSync(lock, "utf8").trim() : "unknown";
    console.error(
      `❌ Chrome appears to be running (SingletonLock pid=${pid}). ` +
        `Close Chrome first, or use chrome_start({profileMode: "cdp"}) to attach to the running instance.`,
    );
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

  console.log(`✅ Imported system profile from ${src}`);
  console.log(`   Local profile: ${PROFILE_DIR}`);
  if (backupDir) console.log(`   Backup: ${backupDir}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Start the MCP server: npm run chrome:mcp`);
  console.log(`  2. In KIMI: chrome_start({profileMode: "${mode}"})`);
  console.log(`  3. Navigate to a site where you are already logged in.`);
}

main();

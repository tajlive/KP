#!/usr/bin/env node
// Klassifiserer "use client"-filer som bruker browser-supabase.
// Bruk: node scripts/scan-browser-client.mjs
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync(
  `grep -rl '^"use client"' src --include="*.tsx" --include="*.ts" | grep -v __tests__`,
  { encoding: "utf8" }
).trim().split("\n");

const report = { guard: [], write: [], read: [], realtime: [], clean: [] };

for (const f of files) {
  const src = readFileSync(f, "utf8");
  if (!/createClient|createBrowserClient/.test(src)) { report.clean.push(f); continue; }
  const tags = [];
  if (/auth\.(getUser|getSession)/.test(src)) tags.push("guard");
  if (/\.from\(/.test(src)) tags.push("data");
  if (/\.(insert|upsert|update|delete)\(/.test(src)) tags.push("write");
  if (/\.channel\(|\.subscribe\(/.test(src)) tags.push("realtime");
  const entry = { file: f, tags };
  if (tags.includes("guard")) report.guard.push(entry);
  else if (tags.includes("write")) report.write.push(entry);
  else if (tags.includes("data")) report.read.push(entry);
  else if (tags.includes("realtime")) report.realtime.push(entry);
  else report.clean.push(f);
}

console.error(
  `guard=${report.guard.length} write=${report.write.length} read=${report.read.length} realtime=${report.realtime.length} clean=${report.clean.length}`
);
console.log(JSON.stringify(report, null, 2));

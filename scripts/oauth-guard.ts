#!/usr/bin/env npx tsx
/**
 * OAuth Guard — Automatic OAuth Redirect URI Consistency Checker & Fixer
 *
 * Usage:
 *   npx tsx scripts/oauth-guard.ts           # Check only
 *   npx tsx scripts/oauth-guard.ts --fix     # Auto-fix code issues
 *   npx tsx scripts/oauth-guard.ts --json    # CI-friendly output
 *   npx tsx scripts/oauth-guard.ts --tunnel https://xxxx.trycloudflare.com
 *   npx tsx scripts/oauth-guard.ts --dry-run # Show remote diff, do not change
 *   npx tsx scripts/oauth-guard.ts --apply   # Apply remote diff to Supabase
 *   npx tsx scripts/oauth-guard.ts --open    # Open Google Cloud Console
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { locales, defaultLocale } from "../src/i18n/config";

// ─── Config ───────────────────────────────────────────────────────────────
const SRC_DIR = path.resolve(process.cwd(), "src");
const ENV_FILES = [".env.local", ".env.production", ".env"];
const SNAPSHOT_DIR = path.resolve(process.cwd(), ".kimi/oauth-guard-snapshots");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const MANAGEMENT_API_BASE = "https://api.supabase.com/v1/projects";

const CANONICAL_APP_URL = "https://www.klarpakke.no";
const DEVELOPMENT_APP_ORIGIN = "http://localhost:3000";

const DESIRED_SITE_URL = CANONICAL_APP_URL;
const DESIRED_URI_ALLOW_LIST = [
  ...locales.map((locale) => `${CANONICAL_APP_URL}/${locale}/callback`),
  `${DEVELOPMENT_APP_ORIGIN}/${defaultLocale}/callback`,
];

const SENSITIVE_KEY_RE = /pass|secret|key|token|credential|smtp|apikey/i;

// ─── Types ────────────────────────────────────────────────────────────────
type IssueSeverity = "error" | "warning" | "info";
interface Issue {
  file: string;
  line: number;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
  fix?: { old: string; new: string };
}

interface ManagementAuthConfig {
  site_url?: string;
  uri_allow_list?: string | string[];
  [key: string]: unknown;
}

interface RemoteDiff {
  siteUrlChanged: boolean;
  added: string[];
  removed: string[];
}

interface RemoteResult {
  reachable: boolean;
  projectRef?: string;
  current?: ManagementAuthConfig;
  desired?: { site_url: string; uri_allow_list: string[] };
  diff?: RemoteDiff;
  matchesDesired?: boolean;
  issues: Issue[];
  snapshotPath?: string;
  applyError?: string;
  verificationOk?: boolean;
}

interface GuardResult {
  ok: boolean;
  issues: Issue[];
  remote?: RemoteResult;
  copyPaste?: {
    supabaseUrls: string;
    providerConsole: string;
  };
}

// ─── ANSI Colors ──────────────────────────────────────────────────────────
const C = {
  rst: "\x1b[0m",
  red: "\x1b[31m",
  grn: "\x1b[32m",
  ylw: "\x1b[33m",
  blu: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function* walkDir(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walkDir(full);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      yield full;
    }
  }
}

function readLines(file: string): string[] {
  return fs.readFileSync(file, "utf-8").split(/\r?\n/);
}

function getRelative(file: string): string {
  return path.relative(process.cwd(), file);
}

function getProjectRef(): string | undefined {
  if (!SUPABASE_URL) return undefined;
  const match = SUPABASE_URL.match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i);
  return match?.[1];
}

function parseUriAllowList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function formatUriAllowList(list: string[]): string {
  return list.join("\n");
}

function maskSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSecrets);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? "***" : maskSecrets(v);
    }
    return out;
  }
  return value;
}

function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ─── Scanners ─────────────────────────────────────────────────────────────
function scanCodeFiles(): Issue[] {
  const issues: Issue[] = [];

  for (const file of walkDir(SRC_DIR)) {
    const rel = getRelative(file);
    const lines = readLines(file);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comments that document the old path
      if (line.includes("Without this: /auth + /callback") ||
          line.includes("prevent /auth/callback") ||
          line.includes("Previously bypassed callback")) {
        continue;
      }

      // 1. Hardcoded /auth/callback in strings/URLs
      if (line.includes("/auth/callback") && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
        const suggestion = "Replace /auth/callback with /callback (e.g. /no/callback) or use getCallbackUrl()";
        let fixNew = line.replace(/\/auth\/callback/g, "/no/callback");

        if (rel.includes("dynamic-redirects") || rel.includes("diagnose") || rel.includes("OAuthDebug")) {
          fixNew = line.replace(/"/g, "").includes("/auth/callback")
            ? line.replace(/"\/auth\/callback"/g, "\"/callback\"")
            : line.replace(/\/auth\/callback/g, "/callback");
        }

        issues.push({
          file: rel,
          line: lineNum,
          severity: "error",
          message: `Hardcoded /auth/callback found`,
          suggestion,
          fix: { old: line, new: fixNew },
        });
      }

      // 2. Recovery links going to callback instead of update-password
      if (line.includes("type=recovery") && line.includes("callback")) {
        const fixNew = line.replace(/`.+?\?type=recovery`/g, "`/no/update-password`")
                           .replace(/".+?\?type=recovery"/g, "\"/no/update-password\"");
        issues.push({
          file: rel,
          line: lineNum,
          severity: "error",
          message: `Password recovery redirect goes to callback instead of /no/update-password`,
          suggestion: "Use /no/update-password for password reset flow",
          fix: { old: line, new: fixNew },
        });
      }

      // 3. Warn if redirectTo is built manually with window.location in client components
      if (line.includes("redirectTo") && line.includes("window.location.origin") && line.includes("/callback")) {
        issues.push({
          file: rel,
          line: lineNum,
          severity: "warning",
          message: "Client-side redirectTo uses window.location.origin + hardcoded path",
          suggestion: "Consider importing getCallbackUrl() from @/lib/auth/config for consistency",
        });
      }
    }
  }

  return issues;
}

function scanEnvFiles(): Issue[] {
  const issues: Issue[] = [];

  for (const envName of ENV_FILES) {
    const envPath = path.resolve(process.cwd(), envName);
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("NEXT_PUBLIC_APP_URL=")) continue;

      const value = line.slice("NEXT_PUBLIC_APP_URL=".length).trim();

      if (value.includes("\\n")) {
        issues.push({
          file: envName,
          line: i + 1,
          severity: "error",
          message: `NEXT_PUBLIC_APP_URL contains literal \\n which corrupts OAuth redirect URIs`,
          suggestion: "Remove the \\n from the URL",
          fix: { old: line, new: `NEXT_PUBLIC_APP_URL=${value.replace(/\\n/g, "")}` },
        });
      }

      if (value.endsWith("/")) {
        issues.push({
          file: envName,
          line: i + 1,
          severity: "warning",
          message: `NEXT_PUBLIC_APP_URL has trailing slash`,
          suggestion: "Remove trailing slash to avoid double slashes in callback URLs",
          fix: { old: line, new: `NEXT_PUBLIC_APP_URL=${value.replace(/\/$/, "")}` },
        });
      }

      let validUrl = true;
      try {
        const url = new URL(value.replace(/^"|"$/g, ""));
        if (url.protocol !== "https:" && !value.includes("localhost")) {
          issues.push({
            file: envName,
            line: i + 1,
            severity: "warning",
            message: `NEXT_PUBLIC_APP_URL does not use HTTPS`,
            suggestion: "Use https:// in production",
          });
        }
      } catch {
        validUrl = false;
        issues.push({
          file: envName,
          line: i + 1,
          severity: "error",
          message: `NEXT_PUBLIC_APP_URL is not a valid URL`,
          suggestion: "Set a valid canonical URL like https://www.klarpakke.no",
        });
      }

      if (validUrl) {
        const isProdContext =
          process.env.NODE_ENV === "production" || envName === ".env.production";
        const cleanValue = value.replace(/^"|"$/g, "").replace(/\\n/g, "");
        if (isProdContext && cleanValue !== CANONICAL_APP_URL && !cleanValue.includes("localhost")) {
          issues.push({
            file: envName,
            line: i + 1,
            severity: "error",
            message: `NEXT_PUBLIC_APP_URL must be ${CANONICAL_APP_URL} in production`,
            suggestion: `Set NEXT_PUBLIC_APP_URL=${CANONICAL_APP_URL}`,
          });
        }
      }
    }
  }

  return issues;
}

// ─── Supabase Management API ──────────────────────────────────────────────
async function fetchAuthConfig(ref: string): Promise<{ ok: boolean; data?: ManagementAuthConfig; error?: string }> {
  try {
    const res = await fetch(`${MANAGEMENT_API_BASE}/${ref}/config/auth`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return { ok: false, error: `GET ${res.status} ${res.statusText}` };
    }

    const data = await res.json() as ManagementAuthConfig;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function patchAuthConfig(
  ref: string,
  body: { site_url: string; uri_allow_list: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${MANAGEMENT_API_BASE}/${ref}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `PATCH ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function computeRemoteDiff(current: ManagementAuthConfig): RemoteDiff {
  const currentSiteUrl = current.site_url ?? "";
  const currentUris = new Set(parseUriAllowList(current.uri_allow_list));
  const desiredUris = new Set(DESIRED_URI_ALLOW_LIST);

  return {
    siteUrlChanged: currentSiteUrl !== DESIRED_SITE_URL,
    added: DESIRED_URI_ALLOW_LIST.filter((u) => !currentUris.has(u)),
    removed: [...currentUris].filter((u) => !desiredUris.has(u)),
  };
}

function providerIssues(config: ManagementAuthConfig): Issue[] {
  const issues: Issue[] = [];
  const providers: { enabledKey: string; clientIdKey: string; name: string }[] = [
    { enabledKey: "external_google_enabled", clientIdKey: "external_google_client_id", name: "Google" },
    { enabledKey: "external_azure_enabled", clientIdKey: "external_azure_client_id", name: "Microsoft" },
  ];

  for (const { enabledKey, clientIdKey, name } of providers) {
    const enabled = config[enabledKey] === true;
    const clientId = config[clientIdKey];
    if (enabled && !clientId) {
      issues.push({
        file: "Supabase Auth Dashboard",
        line: 0,
        severity: "warning",
        message: `${name} provider is enabled in Supabase but missing client_id`,
        suggestion: `Configure ${name} client_id in Authentication → Providers`,
      });
    }
  }

  return issues;
}

function writeSnapshot(ref: string, current: ManagementAuthConfig): string {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const fileName = `${nowTimestamp()}.json`;
  const filePath = path.join(SNAPSHOT_DIR, fileName);

  const snapshot = {
    timestamp: new Date().toISOString(),
    projectRef: ref,
    desired: {
      site_url: DESIRED_SITE_URL,
      uri_allow_list: DESIRED_URI_ALLOW_LIST,
    },
    rollback: {
      site_url: current.site_url ?? "",
      uri_allow_list: parseUriAllowList(current.uri_allow_list),
    },
    current: maskSecrets(current),
  };

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
  return filePath;
}

async function checkRemote(requireEnv: boolean, apply: boolean): Promise<RemoteResult> {
  const ref = getProjectRef();

  if (!SUPABASE_URL || !ref || !SUPABASE_ACCESS_TOKEN) {
    const missing = [
      !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
      !SUPABASE_ACCESS_TOKEN && "SUPABASE_ACCESS_TOKEN",
    ].filter(Boolean);
    const message = `Missing environment variable(s): ${missing.join(", ")}`;

    if (requireEnv) {
      return {
        reachable: false,
        issues: [{
          file: "scripts/oauth-guard.ts",
          line: 0,
          severity: "error",
          message,
          suggestion: "Set the required variables and re-run the command",
        }],
      };
    }

    return {
      reachable: false,
      issues: [{
        file: "scripts/oauth-guard.ts",
        line: 0,
        severity: "info",
        message: `${message} — skipping remote Supabase check`,
        suggestion: "Set the variables to enable remote config verification",
      }],
    };
  }

  const { ok, data, error } = await fetchAuthConfig(ref);
  if (!ok || !data) {
    return {
      reachable: false,
      projectRef: ref,
      issues: [{
        file: "Supabase Management API",
        line: 0,
        severity: requireEnv ? "error" : "warning",
        message: `Could not read Supabase Auth config${error ? `: ${error}` : ""}`,
        suggestion: "Verify your SUPABASE_ACCESS_TOKEN and project ref",
      }],
    };
  }

  const diff = computeRemoteDiff(data);
  const matchesDesired = !diff.siteUrlChanged && diff.added.length === 0 && diff.removed.length === 0;
  const issues: Issue[] = [...providerIssues(data)];

  if (!matchesDesired && !apply) {
    issues.push({
      file: "Supabase Auth Dashboard",
      line: 0,
      severity: "warning",
      message: "Supabase Auth URL configuration does not match desired values",
      suggestion: "Run with --apply to update remote config, or --dry-run to preview",
    });
  }

  let snapshotPath: string | undefined;
  let applyError: string | undefined;
  let verificationOk: boolean | undefined;

  if (apply) {
    snapshotPath = writeSnapshot(ref, data);
    printDiff(diff, data);

    console.log(`${C.blu}Applying changes to Supabase...${C.rst}\n`);
    const patchBody = {
      site_url: DESIRED_SITE_URL,
      uri_allow_list: formatUriAllowList(DESIRED_URI_ALLOW_LIST),
    };
    const patch = await patchAuthConfig(ref, patchBody);

    if (!patch.ok) {
      applyError = patch.error;
      issues.push({
        file: "Supabase Management API",
        line: 0,
        severity: "error",
        message: `Failed to apply config: ${patch.error}`,
        suggestion: "Check the snapshot and retry, or revert manually",
      });
    } else {
      console.log(`${C.grn}✓ PATCH succeeded${C.rst}\n`);
      console.log(`${C.blu}Verifying...${C.rst}`);
      const verify = await fetchAuthConfig(ref);
      if (!verify.ok || !verify.data) {
        verificationOk = false;
        issues.push({
          file: "Supabase Management API",
          line: 0,
          severity: "error",
          message: `Could not verify config after apply${verify.error ? `: ${verify.error}` : ""}`,
          suggestion: "Check the Supabase Dashboard manually",
        });
      } else {
        const verifyDiff = computeRemoteDiff(verify.data);
        verificationOk = !verifyDiff.siteUrlChanged && verifyDiff.added.length === 0 && verifyDiff.removed.length === 0;
        if (!verificationOk) {
          issues.push({
            file: "Supabase Auth Dashboard",
            line: 0,
            severity: "error",
            message: "Verification failed: remote config does not match desired values after apply",
            suggestion: "Check the Supabase Dashboard and logs",
          });
        } else {
          console.log(`${C.grn}✓ Verified${C.rst}\n`);
        }
      }
    }

    if (snapshotPath) {
      console.log(`${C.dim}Snapshot saved to:${C.rst} ${snapshotPath}`);
      console.log(`${C.ylw}Rollback:${C.rst} npx tsx scripts/oauth-guard.ts --rollback ${snapshotPath}\n`);
    }
  }

  return {
    reachable: true,
    projectRef: ref,
    current: data,
    desired: { site_url: DESIRED_SITE_URL, uri_allow_list: DESIRED_URI_ALLOW_LIST },
    diff,
    matchesDesired,
    issues,
    snapshotPath,
    applyError,
    verificationOk,
  };
}

function printDiff(diff: RemoteDiff, current: ManagementAuthConfig): void {
  const currentSiteUrl = current.site_url ?? "";

  console.log(`${C.blu}Remote configuration diff:${C.rst}\n`);
  if (diff.siteUrlChanged) {
    console.log(`  Site URL:`);
    console.log(`    ${C.red}-${currentSiteUrl || "(empty)"}${C.rst}`);
    console.log(`    ${C.grn}+${DESIRED_SITE_URL}${C.rst}`);
  } else {
    console.log(`  Site URL: ${C.grn}${currentSiteUrl}${C.rst} (no change)`);
  }

  console.log(`\n  Additional Redirect URLs:`);
  if (diff.added.length === 0 && diff.removed.length === 0) {
    console.log(`    ${C.grn}(no changes)${C.rst}`);
  } else {
    for (const u of diff.added) console.log(`    ${C.grn}+ ${u}${C.rst}`);
    for (const u of diff.removed) console.log(`    ${C.red}- ${u}${C.rst}`);
  }
  console.log("");
}

// ─── Fix Engine ───────────────────────────────────────────────────────────
function applyFixes(issues: Issue[]): number {
  let fixedCount = 0;
  const byFile = new Map<string, Issue[]>();

  for (const issue of issues) {
    if (!issue.fix) continue;
    if (!byFile.has(issue.file)) byFile.set(issue.file, []);
    byFile.get(issue.file)!.push(issue);
  }

  for (const [rel, fileIssues] of byFile) {
    const filePath = path.resolve(process.cwd(), rel);
    const lines = readLines(filePath);
    let changed = false;

    for (const issue of fileIssues) {
      const idx = issue.line - 1;
      if (lines[idx] === issue.fix!.old) {
        lines[idx] = issue.fix!.new;
        changed = true;
        fixedCount++;
        console.log(`${C.grn}✓ Fixed${C.rst} ${C.dim}${rel}:${issue.line}${C.rst} — ${issue.message}`);
      } else {
        console.log(`${C.ylw}⚠ Could not fix${C.rst} ${C.dim}${rel}:${issue.line}${C.rst} — line changed since scan`);
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
    }
  }

  return fixedCount;
}

// ─── Copy-Paste Generator ─────────────────────────────────────────────────
function generateCopyPaste(projectRef?: string): GuardResult["copyPaste"] {
  const providerCallback = projectRef
    ? `https://${projectRef}.supabase.co/auth/v1/callback`
    : "https://<project-ref>.supabase.co/auth/v1/callback";

  const supabaseUrls = [
    "=== Supabase Auth URL Configuration ===",
    "",
    `Site URL: ${DESIRED_SITE_URL}`,
    "",
    "Additional Redirect URLs:",
    ...DESIRED_URI_ALLOW_LIST.map((u) => `  ${u}`),
  ].join("\n");

  const providerConsole = [
    "=== Google Cloud Console / Microsoft Entra ===",
    "",
    "Supabase provider callback (add to Authorized redirect URIs):",
    `  ${providerCallback}`,
    "",
    "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID",
    "Microsoft Entra → App registrations → Authentication → Redirect URIs",
  ].join("\n");

  return { supabaseUrls, providerConsole };
}

// ─── Tunnel Updater ────────────────────────────────────────────────────────
function updateEnvForTunnel(tunnelUrl: string): void {
  const clean = tunnelUrl.replace(/\/$/, "");
  let updated = false;

  for (const envName of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), envName);
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, "utf-8");
    if (content.includes("NEXT_PUBLIC_APP_URL=")) {
      const newContent = content.replace(
        /NEXT_PUBLIC_APP_URL=.*/,
        `NEXT_PUBLIC_APP_URL=${clean}`
      );
      fs.writeFileSync(envPath, newContent, "utf-8");
      console.log(`${C.grn}✓ Updated${C.rst} ${envName} → NEXT_PUBLIC_APP_URL=${clean}`);
      updated = true;
    }
  }

  if (!updated) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    fs.writeFileSync(envPath, `NEXT_PUBLIC_APP_URL=${clean}\n`, { flag: "a" });
    console.log(`${C.grn}✓ Created${C.rst} .env.local → NEXT_PUBLIC_APP_URL=${clean}`);
  }
}

// ─── Rollback ─────────────────────────────────────────────────────────────
interface SnapshotFile {
  projectRef: string;
  rollback?: { site_url?: string; uri_allow_list?: string | string[] };
}

async function runRollback(snapshotPath: string): Promise<void> {
  if (!fs.existsSync(snapshotPath)) {
    console.error(`${C.red}Snapshot not found:${C.rst} ${snapshotPath}`);
    process.exit(1);
  }

  let snapshot: SnapshotFile | undefined;
  try {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as SnapshotFile;
  } catch {
    console.error(`${C.red}Invalid snapshot file:${C.rst} ${snapshotPath}`);
    process.exit(1);
  }

  if (!snapshot) {
    console.error(`${C.red}Invalid snapshot file:${C.rst} ${snapshotPath}`);
    process.exit(1);
  }

  if (!SUPABASE_ACCESS_TOKEN) {
    console.error(`${C.red}SUPABASE_ACCESS_TOKEN is required for rollback${C.rst}`);
    process.exit(1);
  }

  const ref = snapshot.projectRef;
  const rollback = snapshot.rollback ?? {};
  const body = {
    site_url: rollback.site_url ?? "",
    uri_allow_list: formatUriAllowList(parseUriAllowList(rollback.uri_allow_list)),
  };

  console.log(`${C.blu}Rolling back Supabase Auth config for ${ref}...${C.rst}\n`);
  const result = await patchAuthConfig(ref, body);
  if (!result.ok) {
    console.error(`${C.red}Rollback failed:${C.rst} ${result.error}`);
    process.exit(1);
  }
  console.log(`${C.grn}✓ Rollback applied${C.rst}`);
  process.exit(0);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes("--fix");
  const jsonOutput = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");
  const openConsole = args.includes("--open");
  const rollbackIdx = args.indexOf("--rollback");
  const rollbackFile = rollbackIdx >= 0 ? args[rollbackIdx + 1] : undefined;
  const tunnelIdx = args.indexOf("--tunnel");
  const tunnelUrl = tunnelIdx >= 0 ? args[tunnelIdx + 1] : undefined;

  if (dryRun && apply) {
    console.error(`${C.red}--dry-run and --apply are mutually exclusive${C.rst}`);
    process.exit(1);
  }

  if (rollbackFile) {
    await runRollback(rollbackFile);
    return;
  }

  if (tunnelUrl) {
    updateEnvForTunnel(tunnelUrl);
  }

  const codeIssues = scanCodeFiles();
  const envIssues = scanEnvFiles();
  let issues = [...codeIssues, ...envIssues];

  if (apply && issues.some((i) => i.severity === "error")) {
    if (!jsonOutput) {
      console.error(`${C.red}Aborting --apply because local code/env errors exist.${C.rst}`);
    }
    if (!jsonOutput) printIssues(issues);
    process.exit(1);
  }

  const remote = await checkRemote(dryRun || apply, apply);
  issues = [...issues, ...remote.issues];

  const errors = issues.filter((i) => i.severity === "error");
  const remoteMismatch = remote.reachable && !remote.matchesDesired;
  const ok = errors.length === 0 && !remoteMismatch;

  const result: GuardResult = {
    ok,
    issues,
    remote,
    copyPaste: generateCopyPaste(remote.projectRef),
  };

  const fixedCount = shouldFix ? applyFixes(issues) : 0;

  if (jsonOutput) {
    console.log(JSON.stringify(maskResultForJson(result), null, 2));
    process.exit(ok ? 0 : 1);
  }

  // Pretty output
  console.log(`\n${C.bold}${C.blu}╔════════════════════════════════════════════════════════════╗${C.rst}`);
  console.log(`${C.bold}${C.blu}║           OAuth Guard — Redirect URI Consistency Check      ║${C.rst}`);
  console.log(`${C.bold}${C.blu}╚════════════════════════════════════════════════════════════╝${C.rst}\n`);

  printIssues(issues);

  if (shouldFix) {
    console.log(`${C.grn}Fixed ${fixedCount} line(s).${C.rst}\n`);
  }

  if (remote.reachable && remote.diff && !apply) {
    printDiff(remote.diff, remote.current!);
  }

  if (result.copyPaste) {
    console.log(`${C.dim}────────────────────────────────────────────────────────────${C.rst}`);
    console.log(result.copyPaste.supabaseUrls);
    console.log("");
    console.log(result.copyPaste.providerConsole);
    console.log(`${C.dim}────────────────────────────────────────────────────────────${C.rst}\n`);
  }

  if (openConsole) {
    const url = "https://console.cloud.google.com/apis/credentials";
    console.log(`${C.blu}Opening Google Cloud Console...${C.rst} ${url}\n`);
    try {
      spawn("open", [url], { stdio: "ignore", detached: true });
    } catch {
      // Ignore open failures
    }
  }

  process.exit(ok ? 0 : 1);
}

function printIssues(issues: Issue[]): void {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  if (errors.length === 0 && warnings.length === 0 && infos.length === 0) {
    console.log(`${C.grn}✅ No OAuth redirect URI issues found!${C.rst}\n`);
    return;
  }

  if (errors.length > 0) {
    console.log(`${C.red}❌ ${errors.length} error(s) found:${C.rst}\n`);
    for (const issue of errors) {
      console.log(`  ${C.red}●${C.rst} ${C.dim}${issue.file}:${issue.line}${C.rst}`);
      console.log(`    ${issue.message}`);
      console.log(`    ${C.ylw}→${C.rst} ${issue.suggestion}\n`);
    }
  }

  if (warnings.length > 0) {
    console.log(`${C.ylw}⚠️  ${warnings.length} warning(s):${C.rst}\n`);
    for (const issue of warnings) {
      console.log(`  ${C.ylw}●${C.rst} ${C.dim}${issue.file}:${issue.line}${C.rst}`);
      console.log(`    ${issue.message}`);
      console.log(`    ${C.ylw}→${C.rst} ${issue.suggestion}\n`);
    }
  }

  if (infos.length > 0) {
    for (const issue of infos) {
      console.log(`  ${C.blu}ℹ${C.rst} ${C.dim}${issue.file}:${issue.line}${C.rst}`);
      console.log(`    ${issue.message}`);
      console.log(`    ${C.ylw}→${C.rst} ${issue.suggestion}\n`);
    }
  }
}

function maskResultForJson(result: GuardResult): unknown {
  return {
    ...result,
    remote: result.remote
      ? {
          ...result.remote,
          current: result.remote.current ? maskSecrets(result.remote.current) : undefined,
        }
      : undefined,
  };
}

main().catch((err) => {
  console.error(`${C.red}Fatal error:${C.rst}`, err);
  process.exit(1);
});

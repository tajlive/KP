#!/usr/bin/env npx tsx
/**
 * OAuth Guard — Automatic OAuth Redirect URI Consistency Checker & Fixer
 *
 * Usage:
 *   npx tsx scripts/oauth-guard.ts           # Check only
 *   npx tsx scripts/oauth-guard.ts --fix     # Auto-fix code issues
 *   npx tsx scripts/oauth-guard.ts --json    # CI-friendly output
 *   npx tsx scripts/oauth-guard.ts --tunnel https://xxxx.trycloudflare.com
 *
 * What it checks:
 *   1. No hardcoded `/auth/callback` paths remain in source code
 *   2. All OAuth redirects use `/no/callback` or `getCallbackUrl()`
 *   3. Password recovery redirects go to `/no/update-password`
 *   4. Supabase Auth URL Configuration matches code (requires service key)
 *   5. Environment files have valid NEXT_PUBLIC_APP_URL (no trailing \n)
 */

import * as fs from "fs";
import * as path from "path";
import { locales, defaultLocale } from "../src/i18n/config";

// ─── Config ───────────────────────────────────────────────────────────────
const SRC_DIR = path.resolve(process.cwd(), "src");
const ENV_FILES = [".env.local", ".env.production", ".env"];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vuxbjlykgmzskxbclquf.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

interface GuardResult {
  ok: boolean;
  issues: Issue[];
  supabase?: {
    reachable: boolean;
    siteUrl?: string;
    redirectUrls?: string[];
    googleEnabled?: boolean;
  };
  copyPaste?: {
    googleConsole: string;
    supabaseUrls: string;
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

function color(sev: IssueSeverity): string {
  return sev === "error" ? C.red : sev === "warning" ? C.ylw : C.blu;
}

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
        // Determine best fix based on context
        let suggestion = "Replace /auth/callback with /callback (e.g. /no/callback) or use getCallbackUrl()";
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
        issues.push({
          file: envName,
          line: i + 1,
          severity: "error",
          message: `NEXT_PUBLIC_APP_URL is not a valid URL`,
          suggestion: "Set a valid canonical URL like https://www.klarpakke.no",
        });
      }
    }
  }

  return issues;
}

// ─── Supabase Remote Check ────────────────────────────────────────────────
async function checkSupabaseRemote(): Promise<GuardResult["supabase"]> {
  if (!SUPABASE_SERVICE_KEY) return undefined;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/config`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return { reachable: false };
    }

    const data = await res.json() as {
      site_url?: string;
      uri_allow_list?: string[];
      external_providers?: Array<{ name: string; enabled: boolean }>;
    };

    return {
      reachable: true,
      siteUrl: data.site_url,
      redirectUrls: data.uri_allow_list,
      googleEnabled: data.external_providers?.find(p => p.name === "google")?.enabled ?? false,
    };
  } catch {
    return { reachable: false };
  }
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
function generateCopyPaste(appUrl: string): GuardResult["copyPaste"] {
  const base = appUrl.replace(/\/$/, "");

  const origins = [base];
  if (base.includes("www.")) {
    origins.push(base.replace("www.", ""));
  } else {
    origins.push(base.replace(/^(https?:\/\/)/, "$1www."));
  }

  const redirectUris = locales.map(l => `${base}/${l}/callback`);

  const googleConsole = [
    "=== GOOGLE CLOUD CONSOLE ===",
    "",
    "Authorized JavaScript origins:",
    ...origins.map(o => `  ${o}`),
    "",
    "Authorized redirect URIs:",
    ...redirectUris.map(u => `  ${u}`),
    "",
    "NOTE: URIs must match EXACTLY (no trailing slashes)",
  ].join("\n");

  const supabaseUrls = [
    "=== SUPABASE AUTH URL CONFIGURATION ===",
    "",
    `Site URL: ${base}/${defaultLocale}/callback`,
    "",
    "Additional Redirect URLs:",
    ...redirectUris.map(u => `  ${u}`),
    "  https://*.vercel.app/no/callback",
    "  http://localhost:3000/no/callback",
  ].join("\n");

  return { googleConsole, supabaseUrls };
}

// ─── Tunnel Updater ───────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes("--fix");
  const jsonOutput = args.includes("--json");
  const tunnelIdx = args.indexOf("--tunnel");
  const tunnelUrl = tunnelIdx >= 0 ? args[tunnelIdx + 1] : undefined;

  if (tunnelUrl) {
    updateEnvForTunnel(tunnelUrl);
  }

  const codeIssues = scanCodeFiles();
  const envIssues = scanEnvFiles();
  const issues = [...codeIssues, ...envIssues];

  // Determine app URL for copy-paste
  let appUrl = "https://www.klarpakke.no";
  for (const envName of ENV_FILES) {
    const envPath = path.resolve(process.cwd(), envName);
    if (!fs.existsSync(envPath)) continue;
    const match = fs.readFileSync(envPath, "utf-8").match(/NEXT_PUBLIC_APP_URL=(.+)/);
    if (match) {
      appUrl = match[1].trim().replace(/^"|"$/g, "").replace(/\\n/g, "");
      break;
    }
  }

  const supabase = await checkSupabaseRemote();

  // Cross-check remote config if available
  if (supabase?.reachable && supabase.redirectUrls) {
    const expectedUris = locales.map(l => `${appUrl}/${l}/callback`);
    for (const expected of expectedUris) {
      if (!supabase.redirectUrls!.some(u => u.replace(/\/$/, "") === expected)) {
        issues.push({
          file: "Supabase Auth Dashboard",
          line: 0,
          severity: "warning",
          message: `Missing redirect URL in Supabase: ${expected}`,
          suggestion: "Add it to Authentication → URL Configuration",
        });
      }
    }
  }

  const result: GuardResult = {
    ok: issues.filter(i => i.severity === "error").length === 0,
    issues,
    supabase,
    copyPaste: generateCopyPaste(appUrl),
  };

  // Apply fixes
  let fixedCount = 0;
  if (shouldFix) {
    fixedCount = applyFixes(issues);
  }

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  // Pretty output
  console.log(`\n${C.bold}${C.blu}╔════════════════════════════════════════════════════════════╗${C.rst}`);
  console.log(`${C.bold}${C.blu}║           OAuth Guard — Redirect URI Consistency Check      ║${C.rst}`);
  console.log(`${C.bold}${C.blu}╚════════════════════════════════════════════════════════════╝${C.rst}\n`);

  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${C.grn}✅ No OAuth redirect URI issues found!${C.rst}\n`);
  } else {
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
  }

  if (shouldFix) {
    console.log(`${C.grn}Fixed ${fixedCount} line(s).${C.rst}\n`);
  }

  if (supabase) {
    console.log(`${C.blu}Supabase Auth:${C.rst} ${supabase.reachable ? (supabase.googleEnabled ? `${C.grn}✅ reachable, Google enabled` : `${C.ylw}⚠️ reachable, Google disabled`) : `${C.ylw}⚠️ unreachable (set SUPABASE_SERVICE_ROLE_KEY to check)`}${C.rst}\n`);
  }

  if (result.copyPaste) {
    console.log(`${C.dim}────────────────────────────────────────────────────────────${C.rst}`);
    console.log(result.copyPaste.googleConsole);
    console.log("");
    console.log(result.copyPaste.supabaseUrls);
    console.log(`${C.dim}────────────────────────────────────────────────────────────${C.rst}\n`);
  }

  process.exit(result.ok ? 0 : 1);
}

main().catch(err => {
  console.error(`${C.red}Fatal error:${C.rst}`, err);
  process.exit(1);
});

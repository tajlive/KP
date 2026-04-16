#!/usr/bin/env npx tsx
/**
 * Google OAuth Live Verification for Klarpakke
 *
 * This script does three things:
 *   1. Compares code expectations against what you should have in Google Cloud Console
 *   2. Tests if Supabase Auth can initiate Google OAuth without redirect_uri_mismatch
 *   3. Optionally opens Google Cloud Console so you can verify/fix config manually
 *
 * Usage:
 *   npx tsx scripts/google-oauth-live-verify.ts
 *   npx tsx scripts/google-oauth-live-verify.ts --open   # opens console in browser
 */

import { execSync } from "child_process";
import { getGoogleConsoleConfig } from "../src/lib/auth/dynamic-redirects";
import { getCallbackUrl } from "../src/lib/auth/config";

const C = {
  rst: "\x1b[0m",
  red: "\x1b[31m",
  grn: "\x1b[32m",
  ylw: "\x1b[33m",
  blu: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

function loadEnvFile(file: string): void {
  try {
    const content = require("fs").readFileSync(file, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // ignore missing env file
  }
}

// Load local env if present (same precedence as Next.js dev)
loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vuxbjlykgmzskxbclquf.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function log(msg: string, color: string = C.rst) {
  console.log(`${color}${msg}${C.rst}`);
}

// ─── 1. Code expectations ────────────────────────────────────────────────
function printCodeExpectations() {
  const cfg = getGoogleConsoleConfig();
  log("\n📋 EXPECTED GOOGLE CLOUD CONSOLE CONFIG (from codebase)", C.bold);
  log("═══════════════════════════════════════════════════════════", C.dim);

  log("\nAuthorized JavaScript Origins:", C.blu);
  cfg.authorizedJavaScriptOrigins.forEach((o) => log(`  ✓ ${o}`));

  log("\nAuthorized Redirect URIs:", C.blu);
  cfg.authorizedRedirectUris.forEach((u) => log(`  ✓ ${u}`));

  log("\nNotes:", C.ylw);
  cfg.notes.forEach((n) => log(`  • ${n}`, C.ylw));
}

// ─── 2. gcloud status ────────────────────────────────────────────────────
function getGcloudStatus(): { loggedIn: boolean; email?: string; project?: string } {
  try {
    const email = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    const project = execSync("gcloud config get-value project", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    return { loggedIn: !!email, email, project };
  } catch {
    return { loggedIn: false };
  }
}

function printGcloudStatus(status: ReturnType<typeof getGcloudStatus>) {
  log("\n☁️  GOOGLE CLOUD CLI STATUS", C.bold);
  log("═══════════════════════════════════════════════════════════", C.dim);

  if (!status.loggedIn) {
    log("  ❌ Not logged in. Run: gcloud auth login", C.red);
    return;
  }

  log(`  ✅ Logged in as ${status.email}`, C.grn);
  if (status.project) {
    log(`  ✅ Active project: ${status.project}`, C.grn);
    log(`\n  🔗 Direct link to credentials:`, C.blu);
    log(`  https://console.cloud.google.com/apis/credentials?project=${status.project}`, C.dim);
  } else {
    log("  ⚠️  No active project. Run: gcloud config set project <PROJECT_ID>", C.ylw);
  }
}

// ─── 3. Test Supabase OAuth init ────────────────────────────────────────
async function testSupabaseOAuthInit(): Promise<{
  ok: boolean;
  status: number;
  location?: string;
  error?: string;
}> {
  if (!SUPABASE_ANON_KEY) {
    return { ok: false, status: 0, error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set" };
  }

  const redirectTo = getCallbackUrl("no");
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      redirect: "manual",
    });

    const location = res.headers.get("location") || undefined;

    // If we get 302/307 and location starts with accounts.google.com, Supabase accepted our redirect URI
    if ((res.status === 302 || res.status === 307) && location?.includes("accounts.google.com")) {
      return { ok: true, status: res.status, location };
    }

    // If we get 302/307 but location is an error page, something is wrong
    if ((res.status === 302 || res.status === 307) && location?.includes("error")) {
      return { ok: false, status: res.status, location, error: "Redirect contains error" };
    }

    // Try to read body for more info
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, location, error: body || `Unexpected status ${res.status}` };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function printSupabaseTest() {
  log("\n🧪 SUPABASE OAUTH INIT TEST", C.bold);
  log("═══════════════════════════════════════════════════════════", C.dim);

  const result = await testSupabaseOAuthInit();

  if (result.ok) {
    log("  ✅ Supabase accepted the redirect URI", C.grn);
    log(`  ✅ Got ${result.status} redirect to Google`, C.grn);
    log(`     ${C.dim}${result.location?.slice(0, 80)}...${C.rst}`, C.dim);
    log("\n  This means the redirect URI in Supabase URL Configuration is correct.", C.grn);
  } else {
    log(`  ❌ Supabase OAuth init failed (${result.status})`, C.red);
    if (result.error) {
      log(`  Error: ${result.error.slice(0, 200)}`, C.red);
    }
    if (result.location) {
      log(`  Location header: ${result.location}`, C.ylw);
    }
    log("\n  Likely causes:", C.ylw);
    log("  • Redirect URI is missing in Supabase Auth → URL Configuration", C.ylw);
    log("  • NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid or missing", C.ylw);
  }
}

// ─── 4. Remote Supabase config check ────────────────────────────────────
async function checkSupabaseRemoteConfig(): Promise<{
  reachable: boolean;
  siteUrl?: string;
  redirectUrls?: string[];
  googleClientId?: string;
}> {
  if (!SUPABASE_SERVICE_KEY) {
    return { reachable: false };
  }

  try {
    // Try admin config endpoint
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/config`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return { reachable: false };

    const data = await res.json() as {
      site_url?: string;
      uri_allow_list?: string[];
      external_providers?: Array<{ name: string; client_id?: string }>;
    };

    return {
      reachable: true,
      siteUrl: data.site_url,
      redirectUrls: data.uri_allow_list,
      googleClientId: data.external_providers?.find((p) => p.name === "google")?.client_id,
    };
  } catch {
    return { reachable: false };
  }
}

async function printRemoteConfig() {
  log("\n🗄️  SUPABASE AUTH REMOTE CONFIG", C.bold);
  log("═══════════════════════════════════════════════════════════", C.dim);

  const remote = await checkSupabaseRemoteConfig();

  if (!remote.reachable) {
    log("  ℹ️  Could not fetch remote config (set SUPABASE_SERVICE_ROLE_KEY to enable)", C.ylw);
    return;
  }

  log(`  Site URL: ${remote.siteUrl || "(not set)"}`, remote.siteUrl ? C.grn : C.red);

  const expected = getGoogleConsoleConfig().authorizedRedirectUris;
  if (remote.redirectUrls) {
    log("  Redirect URLs configured:", C.blu);
    remote.redirectUrls.forEach((u) => {
      const isExpected = expected.some((e) => u.replace(/\/$/, "") === e);
      log(`    ${isExpected ? "✅" : "⚠️"} ${u}`, isExpected ? C.grn : C.ylw);
    });

    const missing = expected.filter((e) => !remote.redirectUrls!.some((u) => u.replace(/\/$/, "") === e));
    if (missing.length > 0) {
      log("\n  ❌ Missing in Supabase:", C.red);
      missing.forEach((u) => log(`    - ${u}`, C.red));
    }
  }

  if (remote.googleClientId) {
    log(`\n  🔑 Google Client ID: ${remote.googleClientId.substring(0, 15)}...`, C.grn);
  } else {
    log("  ⚠️  Google provider Client ID not visible via admin API", C.ylw);
  }
}

// ─── 5. Direct Google test (if we can get client_id) ────────────────────
async function testGoogleRedirectUri(): Promise<void> {
  log("\n🔍 GOOGLE REDIRECT URI VALIDATION", C.bold);
  log("═══════════════════════════════════════════════════════════", C.dim);

  // We need the Google Client ID to test this directly.
  // Try to get it from Supabase first.
  const remote = await checkSupabaseRemoteConfig();
  const clientId = remote.googleClientId;

  if (!clientId) {
    log("  ℹ️  Skipping direct Google test (need Google Client ID)", C.ylw);
    log("  Set SUPABASE_SERVICE_ROLE_KEY to auto-detect, or run with --client-id <ID>", C.dim);
    return;
  }

  const redirectUri = getCallbackUrl("no");
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", "test");

  try {
    const res = await fetch(googleAuthUrl.toString(), {
      method: "GET",
      redirect: "manual",
    });

    if (res.status === 302 || res.status === 307) {
      const location = res.headers.get("location") || "";
      if (location.includes("accounts.google.com")) {
        log(`  ✅ Google accepted redirect URI: ${redirectUri}`, C.grn);
        return;
      }
    }

    const body = await res.text().catch(() => "");
    if (body.includes("redirect_uri_mismatch")) {
      log(`  ❌ Google rejected redirect URI: ${redirectUri}`, C.red);
      log("  Error: redirect_uri_mismatch", C.red);
      log("\n  Fix: Add the exact URI above to Google Cloud Console → APIs & Services → Credentials", C.ylw);
    } else {
      log(`  ⚠️  Unexpected response from Google (${res.status})`, C.ylw);
      log(`  Body: ${body.slice(0, 200)}`, C.dim);
    }
  } catch (e) {
    log(`  ⚠️  Could not reach Google: ${e instanceof Error ? e.message : String(e)}`, C.ylw);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldOpen = args.includes("--open");

  printCodeExpectations();

  const gcloudStatus = getGcloudStatus();
  printGcloudStatus(gcloudStatus);

  await printSupabaseTest();
  await printRemoteConfig();
  await testGoogleRedirectUri();

  log("\n📋 ACTION CHECKLIST", C.bold);
  log("═══════════════════════════════════════════════════════════", C.dim);
  log("  1. Open Google Cloud Console → APIs & Services → Credentials", C.blu);
  log("  2. Click your OAuth 2.0 Client ID", C.blu);
  log("  3. Ensure ALL origins and redirect URIs above are listed exactly", C.blu);
  log("  4. Go to OAuth consent screen → ensure status is 'IN PRODUCTION'", C.blu);
  log("  5. Open Supabase Dashboard → Auth → URL Configuration", C.blu);
  log("  6. Ensure Site URL and Redirect URLs match the code expectations", C.blu);

  if (shouldOpen && gcloudStatus.loggedIn && gcloudStatus.project) {
    const consoleUrl = `https://console.cloud.google.com/apis/credentials?project=${gcloudStatus.project}`;
    log(`\n🌐 Opening Google Cloud Console...`, C.grn);
    try {
      execSync(`open "${consoleUrl}"`, { stdio: "ignore" });
    } catch {
      log(`  Could not open browser. URL: ${consoleUrl}`, C.ylw);
    }
  }

  log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

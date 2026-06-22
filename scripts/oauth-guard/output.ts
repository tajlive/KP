/**
 * OAuth Guard — console output, copy-paste helpers, and JSON masking
 */

import { spawn } from "child_process";
import { C, DESIRED_SITE_URL, DESIRED_URI_ALLOW_LIST, maskSecrets } from "./config";
import type { Issue, GuardResult, RemoteDiff, ManagementAuthConfig } from "./types";

export function printIssues(issues: Issue[]): void {
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

export function printDiff(diff: RemoteDiff, current: ManagementAuthConfig): void {
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

export function generateCopyPaste(
  projectRef: string | undefined
): GuardResult["copyPaste"] {
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

export function maskResultForJson(result: GuardResult): unknown {
  return {
    ...result,
    remote: result.remote
      ? {
          ...result.remote,
          current: result.remote.current
            ? maskSecrets(result.remote.current)
            : undefined,
        }
      : undefined,
  };
}

export function openGoogleCloudConsole(): void {
  const url = "https://console.cloud.google.com/apis/credentials";
  console.log(`${C.blu}Opening Google Cloud Console...${C.rst} ${url}\n`);
  try {
    spawn("open", [url], { stdio: "ignore", detached: true });
  } catch {
    // Ignore open failures
  }
}

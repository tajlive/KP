/**
 * OAuth Guard — Supabase Management API client
 */

import {
  MANAGEMENT_API_BASE,
  SUPABASE_ACCESS_TOKEN,
  SUPABASE_URL,
  DESIRED_SITE_URL,
  DESIRED_URI_ALLOW_LIST,
  C,
  parseUriAllowList,
  formatUriAllowList,
} from "./config";
import type {
  Issue,
  ManagementAuthConfig,
  RemoteDiff,
  RemoteResult,
} from "./types";
import { printDiff } from "./output";
import { writeSnapshot } from "./snapshot";

export function extractProjectRef(url: string): string | undefined {
  const match = url.match(/https?:\/\/([a-z0-9]{20})\.supabase\.co/i);
  return match?.[1];
}

export async function getAuthConfig(
  projectRef: string,
  pat: string
): Promise<{ ok: boolean; data?: ManagementAuthConfig; error?: string }> {
  try {
    const res = await fetch(
      `${MANAGEMENT_API_BASE}/${projectRef}/config/auth`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return { ok: false, error: `GET ${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as ManagementAuthConfig;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function patchAuthConfig(
  projectRef: string,
  pat: string,
  body: { site_url: string; uri_allow_list: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${MANAGEMENT_API_BASE}/${projectRef}/config/auth`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `PATCH ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function computeRemoteDiff(
  current: ManagementAuthConfig
): RemoteDiff {
  const currentSiteUrl = current.site_url ?? "";
  const currentUris = new Set(parseUriAllowList(current.uri_allow_list));
  const desiredUris = new Set(DESIRED_URI_ALLOW_LIST);

  return {
    siteUrlChanged: currentSiteUrl !== DESIRED_SITE_URL,
    added: DESIRED_URI_ALLOW_LIST.filter((u) => !currentUris.has(u)),
    removed: [...currentUris].filter((u) => !desiredUris.has(u)),
  };
}

export function providerIssues(config: ManagementAuthConfig): Issue[] {
  const issues: Issue[] = [];
  const providers: {
    enabledKey: string;
    clientIdKey: string;
    name: string;
  }[] = [
    {
      enabledKey: "external_google_enabled",
      clientIdKey: "external_google_client_id",
      name: "Google",
    },
    {
      enabledKey: "external_azure_enabled",
      clientIdKey: "external_azure_client_id",
      name: "Microsoft",
    },
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

export async function checkRemote(
  requireEnv: boolean,
  apply: boolean
): Promise<RemoteResult> {
  const ref = SUPABASE_URL ? extractProjectRef(SUPABASE_URL) : undefined;

  if (!SUPABASE_URL || !ref || !SUPABASE_ACCESS_TOKEN) {
    const missing = [
      !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
      !SUPABASE_ACCESS_TOKEN && "SUPABASE_ACCESS_TOKEN",
    ].filter(Boolean);
    const message = `Missing environment variable(s): ${missing.join(", ")}`;

    if (requireEnv) {
      return {
        reachable: false,
        issues: [
          {
            file: "scripts/oauth-guard.ts",
            line: 0,
            severity: "error",
            message,
            suggestion: "Set the required variables and re-run the command",
          },
        ],
      };
    }

    return {
      reachable: false,
      issues: [
        {
          file: "scripts/oauth-guard.ts",
          line: 0,
          severity: "info",
          message: `${message} — skipping remote Supabase check`,
          suggestion: "Set the variables to enable remote config verification",
        },
      ],
    };
  }

  const { ok, data, error } = await getAuthConfig(ref, SUPABASE_ACCESS_TOKEN);
  if (!ok || !data) {
    return {
      reachable: false,
      projectRef: ref,
      issues: [
        {
          file: "Supabase Management API",
          line: 0,
          severity: requireEnv ? "error" : "warning",
          message: `Could not read Supabase Auth config${error ? `: ${error}` : ""}`,
          suggestion: "Verify your SUPABASE_ACCESS_TOKEN and project ref",
        },
      ],
    };
  }

  const diff = computeRemoteDiff(data);
  const matchesDesired =
    !diff.siteUrlChanged && diff.added.length === 0 && diff.removed.length === 0;
  const issues: Issue[] = [...providerIssues(data)];

  if (!matchesDesired && !apply) {
    issues.push({
      file: "Supabase Auth Dashboard",
      line: 0,
      severity: "warning",
      message: "Supabase Auth URL configuration does not match desired values",
      suggestion:
        "Run with --apply to update remote config, or --dry-run to preview",
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
    const patch = await patchAuthConfig(ref, SUPABASE_ACCESS_TOKEN, patchBody);

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
      const verify = await getAuthConfig(ref, SUPABASE_ACCESS_TOKEN);
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
        verificationOk =
          !verifyDiff.siteUrlChanged &&
          verifyDiff.added.length === 0 &&
          verifyDiff.removed.length === 0;
        if (!verificationOk) {
          issues.push({
            file: "Supabase Auth Dashboard",
            line: 0,
            severity: "error",
            message:
              "Verification failed: remote config does not match desired values after apply",
            suggestion: "Check the Supabase Dashboard and logs",
          });
        } else {
          console.log(`${C.grn}✓ Verified${C.rst}\n`);
        }
      }
    }

    if (snapshotPath) {
      console.log(`${C.dim}Snapshot saved to:${C.rst} ${snapshotPath}`);
      console.log(
        `${C.ylw}Rollback:${C.rst} npx tsx scripts/oauth-guard.ts --rollback ${snapshotPath}\n`
      );
    }
  }

  return {
    reachable: true,
    projectRef: ref,
    current: data,
    desired: {
      site_url: DESIRED_SITE_URL,
      uri_allow_list: DESIRED_URI_ALLOW_LIST,
    },
    diff,
    matchesDesired,
    issues,
    snapshotPath,
    applyError,
    verificationOk,
  };
}

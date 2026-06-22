/**
 * OAuth Guard — constants, env helpers, allowed origins/locales
 */

import * as fs from "fs";
import * as path from "path";
import { locales, defaultLocale } from "../../src/i18n/config";

export const SRC_DIR = path.resolve(process.cwd(), "src");
export const ENV_FILES = [".env.local", ".env.production", ".env"];
export const SNAPSHOT_DIR = path.resolve(
  process.cwd(),
  ".kimi/oauth-guard-snapshots"
);

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
export const MANAGEMENT_API_BASE = "https://api.supabase.com/v1/projects";

export const CANONICAL_APP_URL = "https://www.klarpakke.no";
export const DEVELOPMENT_APP_ORIGIN = "http://localhost:3000";

export const DESIRED_SITE_URL = CANONICAL_APP_URL;
export const DESIRED_URI_ALLOW_LIST = [
  ...locales.map((locale) => `${CANONICAL_APP_URL}/${locale}/callback`),
  `${DEVELOPMENT_APP_ORIGIN}/${defaultLocale}/callback`,
];

export const SENSITIVE_KEY_RE = /pass|secret|key|token|credential|smtp|apikey/i;

export const C = {
  rst: "\x1b[0m",
  red: "\x1b[31m",
  grn: "\x1b[32m",
  ylw: "\x1b[33m",
  blu: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

export function getProjectRef(): string | undefined {
  if (!SUPABASE_URL) return undefined;
  const match = SUPABASE_URL.match(
    /https?:\/\/([a-z0-9]{20})\.supabase\.co/i
  );
  return match?.[1];
}

export function parseUriAllowList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function formatUriAllowList(list: string[]): string {
  return list.join("\n");
}

export function maskSecrets(value: unknown): unknown {
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

export function updateEnvForTunnel(tunnelUrl: string): void {
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

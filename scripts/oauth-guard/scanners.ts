/**
 * OAuth Guard — local code and env scanners
 */

import * as fs from "fs";
import * as path from "path";
import { SRC_DIR, ENV_FILES, C, CANONICAL_APP_URL } from "./config";
import type { Issue } from "./types";

export function* walkDir(dir: string): Generator<string> {
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

export function readLines(file: string): string[] {
  return fs.readFileSync(file, "utf-8").split(/\r?\n/);
}

export function getRelative(file: string): string {
  return path.relative(process.cwd(), file);
}

export function scanCodeFiles(): Issue[] {
  const issues: Issue[] = [];

  for (const file of walkDir(SRC_DIR)) {
    const rel = getRelative(file);
    const lines = readLines(file);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comments that document the old path
      if (
        line.includes("Without this: /auth + /callback") ||
        line.includes("prevent /auth/callback") ||
        line.includes("Previously bypassed callback")
      ) {
        continue;
      }

      // 1. Hardcoded /auth/callback in strings/URLs
      if (
        line.includes("/auth/callback") &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
      ) {
        const suggestion =
          "Replace /auth/callback with /callback (e.g. /no/callback) or use getCallbackUrl()";
        let fixNew = line.replace(/\/auth\/callback/g, "/no/callback");

        if (
          rel.includes("dynamic-redirects") ||
          rel.includes("diagnose") ||
          rel.includes("OAuthDebug")
        ) {
          fixNew = line.replace(/"/g, "").includes("/auth/callback")
            ? line.replace(/"\/auth\/callback"/g, '"/callback"')
            : line.replace(/\/auth\/callback/g, "/callback");
        }

        issues.push({
          file: rel,
          line: lineNum,
          severity: "error",
          message: "Hardcoded /auth/callback found",
          suggestion,
          fix: { old: line, new: fixNew },
        });
      }

      // 2. Recovery links going to callback instead of update-password
      if (line.includes("type=recovery") && line.includes("callback")) {
        const fixNew = line
          .replace(/`.+?\?type=recovery`/g, "`/no/update-password`")
          .replace(/".+?\?type=recovery"/g, '"/no/update-password"');
        issues.push({
          file: rel,
          line: lineNum,
          severity: "error",
          message:
            "Password recovery redirect goes to callback instead of /no/update-password",
          suggestion: "Use /no/update-password for password reset flow",
          fix: { old: line, new: fixNew },
        });
      }

      // 3. Warn if redirectTo is built manually with window.location in client components
      if (
        line.includes("redirectTo") &&
        line.includes("window.location.origin") &&
        line.includes("/callback")
      ) {
        issues.push({
          file: rel,
          line: lineNum,
          severity: "warning",
          message:
            "Client-side redirectTo uses window.location.origin + hardcoded path",
          suggestion:
            "Consider importing getCallbackUrl() from @/lib/auth/config for consistency",
        });
      }
    }
  }

  return issues;
}

export function scanEnvFiles(): Issue[] {
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
          fix: {
            old: line,
            new: `NEXT_PUBLIC_APP_URL=${value.replace(/\\n/g, "")}`,
          },
        });
      }

      if (value.endsWith("/")) {
        issues.push({
          file: envName,
          line: i + 1,
          severity: "warning",
          message: "NEXT_PUBLIC_APP_URL has trailing slash",
          suggestion:
            "Remove trailing slash to avoid double slashes in callback URLs",
          fix: {
            old: line,
            new: `NEXT_PUBLIC_APP_URL=${value.replace(/\/$/, "")}`,
          },
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
            message: "NEXT_PUBLIC_APP_URL does not use HTTPS",
            suggestion: "Use https:// in production",
          });
        }
      } catch {
        validUrl = false;
        issues.push({
          file: envName,
          line: i + 1,
          severity: "error",
          message: "NEXT_PUBLIC_APP_URL is not a valid URL",
          suggestion: "Set a valid canonical URL like https://www.klarpakke.no",
        });
      }

      if (validUrl) {
        const isProdContext =
          process.env.NODE_ENV === "production" || envName === ".env.production";
        const cleanValue = value
          .replace(/^"|"$/g, "")
          .replace(/\\n/g, "");
        if (
          isProdContext &&
          cleanValue !== CANONICAL_APP_URL &&
          !cleanValue.includes("localhost")
        ) {
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

export function applyFixes(issues: Issue[]): number {
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
        console.log(
          `${C.grn}✓ Fixed${C.rst} ${C.dim}${rel}:${issue.line}${C.rst} — ${issue.message}`
        );
      } else {
        console.log(
          `${C.ylw}⚠ Could not fix${C.rst} ${C.dim}${rel}:${issue.line}${C.rst} — line changed since scan`
        );
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
    }
  }

  return fixedCount;
}

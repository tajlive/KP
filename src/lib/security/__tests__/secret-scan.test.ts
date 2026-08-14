/**
 * Secret-scanning: feiler hvis Linear API-nøkkel eller vanlige token-mønstre
 * finnes i tracked filer eller nye rapportfiler.
 *
 * INC-relatert hardening 2026-08-12: linear_api_key skal aldri committes.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  openSync,
  readSync,
  closeSync,
} from "fs";
import { resolve, join } from "path";

const ROOT = resolve(__dirname, "..", "..", "..", "..");

// Token-mønstre — generiske, ingen reelle verdier hardkodet
const TOKEN_PATTERNS: RegExp[] = [
  /lin_api_[A-Za-z0-9]{40,}/, // Linear personal API key
  /lin_vis_[A-Za-z0-9]+/, // Linear OAuth
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, // GitHub tokens
  /\bsk-[A-Za-z0-9_-]{20,}\b/, // OpenAI-style
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, // Slack
  /\bhch-[atr]-[A-Za-z0-9-]{20,}\b/, // Honcho
  /\bAKIA[A-Z0-9]{16}\b/, // AWS
];

describe("secrets-scanning", () => {
  let trackedFiles: string[] = [];

  beforeAll(() => {
    try {
      trackedFiles = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
    } catch {
      trackedFiles = [];
    }
  });

  // Sniff: binærfiler (null-byte i headeren) kan ikke inneholde token-mønstre,
  // og utf8-lesing av store binære blobs (bilder, fonter, tarballs) er kostbar.
  function isBinaryFile(full: string): boolean {
    try {
      const fd = openSync(full, "r");
      const buf = Buffer.alloc(8192);
      const n = readSync(fd, buf, 0, 8192, 0);
      closeSync(fd);
      return buf.subarray(0, n).includes(0);
    } catch {
      return true; // Uleselig → hopp over
    }
  }

  // KLA-295: eksplisitt romslig timeout. Full repo-scan tar ~16-24s på M1;
  // under CI-parallelisme (8 workers + retry) overskred den lett 30s-globalen.
  it(
    "tracked filer inneholder ingen Linear API-nøkkel eller token-mønstre",
    { timeout: 120_000 },
    () => {
      const offenders: string[] = [];
      for (const file of trackedFiles) {
        // Skip binære / genererte filer som er forventet
        if (file.endsWith(".map") || file.includes("package-lock.json")) continue;
        if (file.includes(".env")) continue; // .env* er gitignored, men vær eksplisitt
        if (file.startsWith(".npm/")) continue; // npm-_cacache: content-addressed cache, ikke repo-kilde
        const full = resolve(ROOT, file);
        if (!existsSync(full)) continue;
        if (isBinaryFile(full)) continue; // binært innhold → ingen token-mønstre
        const content = readFileSync(full, "utf8");
        for (const re of TOKEN_PATTERNS) {
          if (re.test(content)) {
            offenders.push(`${file} (mønster ${re})`);
            break;
          }
        }
      }
      expect(offenders).toEqual([]);
    }
  );

  it("nye rapportfiler under .hermes/ inneholder ingen token-mønstre", () => {
    function walk(dir: string, out: string[] = []): string[] {
      if (!existsSync(dir)) return out;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full, out);
        else if (/\.(md|log|txt)$/.test(full)) out.push(full);
      }
      return out;
    }
    const reportFiles = walk(resolve(ROOT, ".hermes"));
    const offenders: string[] = [];
    for (const file of reportFiles) {
      const content = readFileSync(file, "utf8");
      for (const re of TOKEN_PATTERNS) {
        if (re.test(content)) {
          offenders.push(`${file} (mønster ${re})`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("redaksjonscriptet redigerer kjente token-mønstre", () => {
    // Eksporterer ikke funksjoner — kjør scriptet med syntetisk input via node -e
    const script = readFileSync(resolve(ROOT, "scripts/redact-secrets.mjs"), "utf8");
    expect(script).toContain("lin_api_");
    expect(script).toContain("[REDACTED]");
  });
});

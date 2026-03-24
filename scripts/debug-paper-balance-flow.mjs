#!/usr/bin/env node
/**
 * Kjører Playwright-spor for dashboard / handelshistorikk / paper balance API.
 *
 * Forutsetninger: `npm run dev` (eller annen base URL), ev. `npm run test:e2e:prepare` + `.auth/user.json`.
 * Miljø: `PLAYWRIGHT_TEST_BASE_URL` / `BASE_URL` — standard: http://localhost:3000
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "e2e/debug/paper-balance-trace.spec.ts",
    "--project=debug-chromium",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env },
  },
);

process.exit(result.status === null ? 1 : result.status);

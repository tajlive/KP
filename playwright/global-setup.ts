

import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";
import path from "node:path";

const WARMUP_TIMEOUT_MS = 90_000;

function getBaseUrl(): string {
  return (
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000"
  );
}

function httpGet(url: string, timeoutMs: number): Promise<{ statusCode: number | undefined }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after ${timeoutMs}ms`));
    });
  });
}

async function warmupPath(baseUrl: string, path: string): Promise<void> {
  const url = new URL(path, baseUrl).toString();
  console.log(`Warming up Next.js dev server: ${path} (${url})`);
  const start = Date.now();
  try {
    const { statusCode } = await httpGet(url, WARMUP_TIMEOUT_MS);
    const elapsed = Date.now() - start;
    console.log(`  → ${statusCode} in ${elapsed}ms`);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`  → failed after ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

export default async function globalSetup(): Promise<void> {
  const baseUrl = getBaseUrl();
  await warmupPath(baseUrl, "/no/dashboard");
  await warmupPath(baseUrl, "/no/dashboard/metrics");
}

// Allow running directly via `tsx playwright/global-setup.ts`
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  globalSetup().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}

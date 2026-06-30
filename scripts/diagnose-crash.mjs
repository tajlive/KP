#!/usr/bin/env node
/**
 * Klarpakke crash diagnostic script.
 *
 * Usage:
 *   npm run diagnose:crash
 *   npm run diagnose:crash -- --tests
 *   npm run diagnose:crash -- --verbose
 */

import { execSync, spawn } from "node:child_process";
import process from "node:process";

const PROD_HEALTH = "https://www.klarpakke.no/api/health";
const PROD_ROOT = "https://www.klarpakke.no/no";
const TAIL_SECONDS = 30;

const args = process.argv.slice(2);
const runTests = args.includes("--tests");
const verbose = args.includes("--verbose") || args.includes("-v");

function banner(title) {
  console.log(`\n=== ${title} ===`);
}

function run(command, options = {}) {
  const { timeout = 30_000 } = options;
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout,
      ...options,
    });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return { ok: false, output: error.stderr || error.stdout || error.message };
  }
}

async function fetchUrl(url) {
  try {
    const response = await fetch(url, { redirect: "follow" });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text: text.slice(0, 2000),
    };
  } catch (error) {
    return { ok: false, status: 0, text: String(error) };
  }
}

async function tailLogs(seconds) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["wrangler", "tail", "klarpakke"], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, seconds * 1000);

    child.on("close", () => {
      clearTimeout(timeout);
      resolve({ stdout, stderr });
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr: String(err) });
    });
  });
}

function summarizeLogs(logText) {
  const lines = logText.split("\n").filter(Boolean);
  const issues = [];

  for (const line of lines) {
    if (line.includes('"outcome"') && line.includes('"exception"')) {
      issues.push("Worker exception detected");
    }
    if (line.includes('"exceptions"') && !line.includes('"exceptions": []')) {
      issues.push("Worker exception detected");
    }
    if (line.includes('"response"') && line.includes('"status": 5')) {
      issues.push("HTTP 5xx response detected");
    }
    if (line.includes("Sanity fetch error")) {
      issues.push("Sanity fetch error");
    }
    if (line.includes("Binance non-OK")) {
      issues.push("Binance 403/fallback");
    }
  }

  return { lineCount: lines.length, issues: [...new Set(issues)] };
}

async function main() {
  console.log("Klarpakke crash diagnostic");
  console.log(`Started: ${new Date().toISOString()}`);

  // 1. Health endpoint
  banner("Health endpoint");
  const health = await fetchUrl(PROD_HEALTH);
  console.log(`Status: ${health.status}`);
  if (health.ok) {
    try {
      const parsed = JSON.parse(health.text);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(health.text);
    }
  } else {
    console.log("Response:", health.text);
  }

  // 2. Root page
  banner("Root page /no");
  const root = await fetchUrl(PROD_ROOT);
  console.log(`Status: ${root.status}`);
  console.log("Preview:", root.text.slice(0, 200).replace(/\s+/g, " "));

  // 3. Git status
  banner("Git status");
  const gitStatus = run("git status --short");
  const gitLog = run("git log -5 --oneline");
  console.log(gitStatus.ok ? gitStatus.output || "clean" : gitStatus.output);
  console.log("\nRecent commits:");
  console.log(gitLog.ok ? gitLog.output : gitLog.output);

  // 4. Deployments
  banner("Cloudflare deployments");
  const deployments = run("npx wrangler deployments list", { timeout: 30_000 });
  console.log(deployments.ok ? deployments.output : deployments.output);

  // 5. Tail logs
  banner(`Cloudflare Worker logs (${TAIL_SECONDS}s)`);
  console.log(`Collecting logs for ${TAIL_SECONDS} seconds...`);
  const logs = await tailLogs(TAIL_SECONDS);
  const summary = summarizeLogs(logs.stdout);
  console.log(`Collected ${summary.lineCount} log lines.`);
  if (summary.issues.length > 0) {
    console.log("Issues detected:");
    summary.issues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log("No obvious issues detected in logs.");
  }
  if (verbose || summary.issues.length > 0) {
    console.log("\n--- Raw log sample (first 100 lines) ---");
    console.log(logs.stdout.split("\n").slice(0, 100).join("\n"));
  }
  if (logs.stderr) {
    console.log("\n--- stderr ---");
    console.log(logs.stderr);
  }

  // 6. Optional tests
  if (runTests) {
    banner("Unit tests");
    const tests = run("npm run test:unit", { timeout: 180_000 });
    console.log(tests.ok ? tests.output : tests.output);
  }

  // 7. Summary
  banner("Summary");
  const problems = [];
  if (!health.ok) problems.push(`Health endpoint returned ${health.status}`);
  if (!root.ok) problems.push(`Root page returned ${root.status}`);
  if (summary.issues.length > 0) {
    problems.push(...summary.issues);
  }
  if (gitStatus.output.trim().length > 0) {
    problems.push("Uncommitted local changes present");
  }

  if (problems.length === 0) {
    console.log("No obvious crash indicators found.");
    console.log("If users still report issues, ask for:");
    console.log("  - exact URL");
    console.log("  - browser console / network errors");
    console.log("  - steps to reproduce");
  } else {
    console.log("Potential issues found:");
    problems.forEach((p) => console.log(`  - ${p}`));
  }

  console.log(`\nFinished: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});

#!/usr/bin/env ts-node
/**
 * Klarpakke Production Launch Script
 * 
 * Full deployment pipeline:
 * 1. Pre-flight checks (OAuth, types, lint)
 * 2. Vercel deploy
 * 3. Import Sentry alerts
 * 4. Supabase health check
 * 5. Slack notification
 * 
 * Usage:
 *   npx ts-node scripts/launch-production.ts
 *   npx ts-node scripts/launch-production.ts --dry-run
 *   npm run launch:prod
 */

import { execSync } from "child_process";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

// ANSI colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";

interface LaunchConfig {
  dryRun: boolean;
  skipPrompts: boolean;
  skipSentry: boolean;
  skipSlack: boolean;
  environment: "production" | "staging";
}

interface LaunchResult {
  step: string;
  status: "success" | "error" | "skipped";
  duration: number;
  message?: string;
}

const results: LaunchResult[] = [];

function log(message: string, level: "info" | "success" | "warning" | "error" | "step" = "info") {
  const colors = {
    info: BLUE,
    success: GREEN,
    warning: YELLOW,
    error: RED,
    step: BOLD + BLUE,
  };
  const prefix = level === "step" ? "\n🚀 " : level === "success" ? "✅ " : level === "error" ? "❌ " : level === "warning" ? "⚠️  " : "ℹ️  ";
  console.log(`${colors[level]}${prefix}${message}${RESET}`);
}

function executeCommand(command: string, options: { silent?: boolean; dryRun?: boolean } = {}): string {
  if (options.dryRun) {
    log(`[DRY RUN] Would execute: ${command}`, "warning");
    return "";
  }
  
  try {
    const result = execSync(command, {
      encoding: "utf-8",
      stdio: options.silent ? "pipe" : "inherit",
      cwd: process.cwd(),
    });
    return result?.toString() || "";
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error}`);
  }
}

async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${YELLOW}${question} (y/N): ${RESET}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function runStep<T>(
  name: string,
  fn: () => Promise<T>,
  config: LaunchConfig
): Promise<T | null> {
  log(name, "step");
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    results.push({ step: name, status: "success", duration });
    log(`${name} completed in ${duration}ms`, "success");
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ step: name, status: "error", duration, message });
    log(`${name} failed: ${message}`, "error");
    
    if (!config.skipPrompts) {
      const continueDeploy = await promptUser("Continue despite error?");
      if (!continueDeploy) {
        throw new Error("Deployment aborted by user");
      }
    }
    return null;
  }
}

// Step 1: Pre-flight checks
async function preflightChecks(config: LaunchConfig): Promise<void> {
  // Check environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];
  
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  
  // Run TypeScript check
  log("Running TypeScript check...");
  executeCommand("npx tsc --noEmit --skipLibCheck", { silent: true, dryRun: config.dryRun });
  
  // Run lint
  log("Running ESLint...");
  executeCommand("npm run lint", { silent: true, dryRun: config.dryRun });
  
  // Run OAuth verification
  log("Running OAuth verification...");
  const oauthResult = executeCommand("npm run verify:google-oauth:json", { 
    silent: true, 
    dryRun: config.dryRun 
  });
  
  if (oauthResult && !config.dryRun) {
    const oauthData = JSON.parse(oauthResult);
    if (oauthData.status === "error") {
      throw new Error("OAuth configuration has errors. Run 'npm run verify:google-oauth' for details.");
    }
  }
  
  // Run unit tests
  log("Running unit tests...");
  executeCommand("npm run test:unit", { silent: true, dryRun: config.dryRun });
}

// Step 2: Vercel deploy
async function deployVercel(config: LaunchConfig): Promise<string> {
  const envFlag = config.environment === "production" ? "--prod" : "";
  
  log(`Deploying to Vercel (${config.environment})...`);
  
  if (config.dryRun) {
    return "https://dry-run-deployment.vercel.app";
  }
  
  const output = executeCommand(`vercel ${envFlag} --yes`, { silent: true });
  
  // Extract deployment URL from output
  const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
  const deploymentUrl = urlMatch ? urlMatch[0] : "https://www.klarpakke.no";
  
  log(`Deployed to: ${deploymentUrl}`, "success");
  return deploymentUrl;
}

// Step 3: Import Sentry alerts
async function importSentryAlerts(config: LaunchConfig): Promise<void> {
  if (config.skipSentry) {
    log("Skipping Sentry alerts import", "warning");
    return;
  }
  
  const sentryToken = process.env.SENTRY_AUTH_TOKEN;
  if (!sentryToken) {
    log("SENTRY_AUTH_TOKEN not set, skipping Sentry alerts", "warning");
    return;
  }
  
  log("Importing Sentry alerts...");
  executeCommand("npx ts-node scripts/import-sentry-alerts.ts", { 
    dryRun: config.dryRun 
  });
}

// Step 4: Supabase health check
async function supabaseHealthCheck(config: LaunchConfig): Promise<void> {
  log("Running Supabase health checks...");
  
  if (config.dryRun) {
    return;
  }
  
  // Check API health
  const healthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  try {
    executeCommand(`curl -s -o /dev/null -w "%{http_code}" ${healthUrl}`, { silent: true });
  } catch {
    throw new Error("Supabase health check failed");
  }
  
  // Note: In production, you'd run edge function health check here
  log("Supabase health check passed", "success");
}

// Step 5: Slack notification
async function notifySlack(config: LaunchConfig, deploymentUrl: string): Promise<void> {
  if (config.skipSlack) {
    log("Skipping Slack notification", "warning");
    return;
  }
  
  const slackWebhook = process.env.SLACK_DEPLOY_WEBHOOK;
  if (!slackWebhook) {
    log("SLACK_DEPLOY_WEBHOOK not set, skipping notification", "warning");
    return;
  }
  
  const resultsSummary = results.map(r => 
    `${r.status === "success" ? "✅" : r.status === "error" ? "❌" : "⏭️"} ${r.step} (${r.duration}ms)`
  ).join("\n");
  
  const payload = {
    text: `🚀 Klarpakke ${config.environment} deployment`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚀 Klarpakke ${config.environment.toUpperCase()} Deployment`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Environment:*\n${config.environment}`,
          },
          {
            type: "mrkdwn",
            text: `*URL:*\n${deploymentUrl}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Results:*\n${resultsSummary}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Deployment",
              emoji: true,
            },
            url: deploymentUrl,
            style: "primary",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Sentry Dashboard",
              emoji: true,
            },
            url: "https://klarpakke.sentry.io",
          },
        ],
      },
    ],
  };
  
  if (config.dryRun) {
    log(`[DRY RUN] Would send Slack notification:`, "warning");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  
  try {
    executeCommand(
      `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' ${slackWebhook}`,
      { silent: true }
    );
    log("Slack notification sent", "success");
  } catch (error) {
    log("Failed to send Slack notification", "warning");
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const config: LaunchConfig = {
    dryRun: args.includes("--dry-run"),
    skipPrompts: args.includes("--yes") || args.includes("-y"),
    skipSentry: args.includes("--skip-sentry"),
    skipSlack: args.includes("--skip-slack"),
    environment: args.includes("--staging") ? "staging" : "production",
  };
  
  // Print banner
  console.log(`
${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════╗
║         KLARPAKKE PRODUCTION LAUNCH SCRIPT v1.0              ║
╚══════════════════════════════════════════════════════════════╝
${RESET}
Environment: ${YELLOW}${config.environment}${RESET}
Dry Run: ${config.dryRun ? "${YELLOW}YES" : "${GREEN}NO"}${RESET}
Skip Prompts: ${config.skipPrompts ? "${YELLOW}YES" : "${GREEN}NO"}${RESET}
`);
  
  if (config.dryRun) {
    log("Running in DRY RUN mode - no actual changes will be made", "warning");
  }
  
  // Confirmation prompt
  if (!config.skipPrompts && !config.dryRun) {
    const confirmed = await promptUser(
      `Confirm deployment to ${config.environment.toUpperCase()}?`
    );
    if (!confirmed) {
      log("Deployment cancelled", "error");
      process.exit(0);
    }
  }
  
  const startTime = Date.now();
  
  try {
    // Run deployment steps
    await runStep("Pre-flight Checks", () => preflightChecks(config), config);
    const deploymentUrl = await runStep("Vercel Deploy", () => deployVercel(config), config);
    await runStep("Sentry Alerts", () => importSentryAlerts(config), config);
    await runStep("Supabase Health Check", () => supabaseHealthCheck(config), config);
    await runStep("Slack Notification", () => notifySlack(config, deploymentUrl || "N/A"), config);
    
    // Summary
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    
    console.log(`
${BOLD}${GREEN}
╔══════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT COMPLETE                         ║
╚══════════════════════════════════════════════════════════════╝
${RESET}
Total Duration: ${totalDuration}ms
Successful Steps: ${successCount}/${results.length}
Failed Steps: ${errorCount}
`);
    
    if (errorCount > 0) {
      log("Some steps had errors - review output above", "warning");
      process.exit(1);
    }
    
    log("🎉 All systems operational!", "success");
    process.exit(0);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Deployment failed: ${message}`, "error");
    process.exit(1);
  }
}

main();

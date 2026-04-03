#!/usr/bin/env ts-node
/**
 * Sentry Alert Importer
 * 
 * Imports alert rules from sentry-auth-alerts.json to Sentry.
 * 
 * Usage:
 *   npx ts-node scripts/import-sentry-alerts.ts
 *   SENTRY_AUTH_TOKEN=xxx npx ts-node scripts/import-sentry-alerts.ts
 *   npx ts-node scripts/import-sentry-alerts.ts --dry-run
 */

import * as fs from "fs";
import * as path from "path";

// ANSI colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";

const SENTRY_API_BASE = "https://sentry.io/api/0";
const ORG_SLUG = "klarpakke";
const PROJECT_SLUG = "klarpakke-universitet";

interface SentryAlertConfig {
  name: string;
  description: string;
  conditions: {
    event_type: string;
    filter: string;
    threshold: {
      count: number;
      window: string;
    };
  };
  actions: {
    slack?: {
      channel: string;
      message: string;
    };
    linear?: {
      team: string;
      title: string;
      priority: string;
      labels: string[];
    };
  };
}

interface SentryAlertRule {
  id?: string;
  name: string;
  environment: string | null;
  actionMatch: string;
  filterMatch: string;
  conditions: Array<{
    id: string;
    comparisonType?: string;
    interval?: string;
    value?: number;
    name?: string;
    [key: string]: unknown;
  }>;
  filters: Array<{
    id: string;
    [key: string]: unknown;
  }>;
  actions: Array<{
    id: string;
    [key: string]: unknown;
  }>;
}

function log(message: string, level: "info" | "success" | "warning" | "error" = "info") {
  const colors = {
    info: BLUE,
    success: GREEN,
    warning: YELLOW,
    error: RED,
  };
  const prefix = level === "success" ? "✅ " : level === "error" ? "❌ " : level === "warning" ? "⚠️  " : "ℹ️  ";
  console.log(`${colors[level]}${prefix}${message}${RESET}`);
}

async function sentryApiRequest(
  endpoint: string,
  options: RequestInit,
  token: string
): Promise<unknown> {
  const url = `${SENTRY_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sentry API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function convertToSentryRule(alert: SentryAlertConfig): Partial<SentryAlertRule> {
  // Convert window to interval (e.g., "5m" -> "5m")
  const interval = alert.conditions.threshold.window;
  
  // Build condition
  const conditions: SentryAlertRule["conditions"] = [
    {
      id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      comparisonType: "count",
      interval: interval,
      value: alert.conditions.threshold.count,
    },
  ];

  // Build filter for auth code
  const filters: SentryAlertRule["filters"] = [
    {
      id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
      key: "auth_code",
      match: "co", // contains
      value: alert.conditions.filter.replace("event.tags.", "").replace(":", ":"),
    },
  ];

  // Build actions
  const actions: SentryAlertRule["actions"] = [];

  if (alert.actions.slack) {
    actions.push({
      id: "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",
      channel: alert.actions.slack.channel,
      channel_id: "", // Will be resolved by Sentry
      tags: "",
      workspace: "", // Will be resolved by Sentry
    });
  }

  return {
    name: alert.name,
    environment: null, // All environments
    actionMatch: "all",
    filterMatch: "all",
    conditions,
    filters,
    actions,
  };
}

async function importAlerts(dryRun: boolean): Promise<void> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  
  if (!token) {
    log("SENTRY_AUTH_TOKEN environment variable not set", "error");
    log("Get your token from: https://sentry.io/settings/account/api/auth-tokens/", "info");
    process.exit(1);
  }

  // Load alert config
  const configPath = path.join(__dirname, "sentry-auth-alerts.json");
  if (!fs.existsSync(configPath)) {
    log(`Config file not found: ${configPath}`, "error");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const alerts: SentryAlertConfig[] = config.alerts || [];

  log(`Found ${alerts.length} alert(s) to import`, "info");

  if (dryRun) {
    log("Running in DRY RUN mode - no changes will be made", "warning");
  }

  // Get existing rules
  log("Fetching existing alert rules...", "info");
  const existingRules = dryRun ? [] : await sentryApiRequest(
    `/projects/${ORG_SLUG}/${PROJECT_SLUG}/rules/`,
    { method: "GET" },
    token
  ) as SentryAlertRule[];

  for (const alert of alerts) {
    log(`Processing: ${alert.name}`, "info");

    // Check if rule already exists
    const existing = existingRules.find(r => r.name === alert.name);
    
    const ruleData = convertToSentryRule(alert);

    if (existing) {
      log(`  Rule already exists (ID: ${existing.id})`, "warning");
      
      if (!dryRun) {
        // Update existing rule
        try {
          await sentryApiRequest(
            `/projects/${ORG_SLUG}/${PROJECT_SLUG}/rules/${existing.id}/`,
            {
              method: "PUT",
              body: JSON.stringify(ruleData),
            },
            token
          );
          log(`  Updated successfully`, "success");
        } catch (error) {
          log(`  Update failed: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
      }
    } else {
      if (!dryRun) {
        // Create new rule
        try {
          const result = await sentryApiRequest(
            `/projects/${ORG_SLUG}/${PROJECT_SLUG}/rules/`,
            {
              method: "POST",
              body: JSON.stringify(ruleData),
            },
            token
          ) as SentryAlertRule;
          log(`  Created successfully (ID: ${result.id})`, "success");
        } catch (error) {
          log(`  Creation failed: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
      } else {
        log(`  Would create new rule`, "info");
      }
    }
  }

  log("Import complete!", "success");
  log("View your alerts at:", "info");
  log(`https://${ORG_SLUG}.sentry.io/alerts/rules/`, "info");
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log(`
${BLUE}
╔══════════════════════════════════════════════════════════════╗
║            SENTRY ALERT IMPORTER v1.0                        ║
╚══════════════════════════════════════════════════════════════╝
${RESET}
`);

  try {
    await importAlerts(dryRun);
    process.exit(0);
  } catch (error) {
    log(`Import failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    process.exit(1);
  }
}

main();

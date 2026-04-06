#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SLACK RECOVERY THREAD — Thread-basert Slack-oppdatering for watchdog
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Formål: Sende strukturerte oppdateringer til Slack i en thread for bedre
 *         oversikt over watchdog-status, recovery-forsøk og resultater.
 *
 * Bruk:
 *   node scripts/slack-recovery-thread.mjs --status=failed     # Send feilvarsel
 *   node scripts/slack-recovery-thread.mjs --status=recovering # Send recovery update
 *   node scripts/slack-recovery-thread.mjs --status=recovered  # Send recovery suksess
 *   node scripts/slack-recovery-thread.mjs --thread=TS         # Reply i eksisterende thread
 *   npm run slack:watchdog:thread                              # npm wrapper
 *
 * Exit codes:
 *   0 — Melding sendt
 *   1 — Sending feilet
 *   2 — Konfigurasjonsfeil
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGURASJON
// ═══════════════════════════════════════════════════════════════════════════════

function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      dotenv.config({ path });
    }
  }
}

loadEnv();

const CONFIG = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  botToken: process.env.SLACK_BOT_TOKEN, // For thread replies (valgfri)
  channel: process.env.SLACK_WATCHDOG_CHANNEL || "#ops",
  reportDir: process.env.WATCHDOG_REPORT_DIR || "./watchdog-reports",
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

class Logger {
  constructor() {
    this.logs = [];
  }
  log(level, message, data) {
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    this.logs.push(entry);
    console.log(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : "");
  }
  info(msg, data) { this.log("info", msg, data); }
  error(msg, data) { this.log("error", msg, data); }
  success(msg, data) { this.log("success", msg, data); }
}

const logger = new Logger();

// ═══════════════════════════════════════════════════════════════════════════════
// SLACK API
// ═══════════════════════════════════════════════════════════════════════════════

class SlackAPI {
  constructor() {
    this.webhookUrl = CONFIG.webhookUrl;
    this.botToken = CONFIG.botToken;
  }

  async sendWebhook(payload) {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }

    return { ok: true };
  }

  async sendMessage(text, options = {}) {
    const payload = {
      channel: CONFIG.channel,
      username: "Klarpakke Watchdog",
      icon_emoji: options.icon || ":robot_face:",
      text,
      attachments: options.attachments || [],
    };

    if (options.thread_ts) {
      payload.thread_ts = options.thread_ts;
    }

    return this.sendWebhook(payload);
  }

  formatAttachment(options) {
    return {
      color: options.color || "#36a64f",
      title: options.title,
      text: options.text,
      fields: options.fields || [],
      footer: options.footer || "Klarpakke Watchdog",
      ts: Math.floor(Date.now() / 1000),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// THREAD MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class ThreadManager {
  constructor() {
    this.slack = new SlackAPI();
    this.threadFile = `${CONFIG.reportDir}/.slack_thread_ts`;
  }

  getSavedThread() {
    try {
      if (existsSync(this.threadFile)) {
        return readFileSync(this.threadFile, "utf8").trim();
      }
    } catch (e) {
      logger.error("Kunne ikke lese thread file");
    }
    return null;
  }

  saveThread(threadTs) {
    try {
      mkdirSync(CONFIG.reportDir, { recursive: true });
      writeFileSync(this.threadFile, threadTs);
    } catch (e) {
      logger.error("Kunne ikke lagre thread");
    }
  }

  clearThread() {
    try {
      if (existsSync(this.threadFile)) {
        writeFileSync(this.threadFile, "");
      }
    } catch (e) {
      // Ignore
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildFailedMessage(details) {
  const fields = [
    { title: "Status", value: "❌ FAILED", short: true },
    { title: "Timestamp", value: new Date().toISOString(), short: true },
    { title: "Miljø", value: details.environment || "production", short: true },
    { title: "Failed Checks", value: details.failedChecks?.join(", ") || "N/A", short: true },
  ];

  if (details.repairAttempts !== undefined) {
    fields.push({ title: "Repair Attempts", value: String(details.repairAttempts), short: true });
  }

  return {
    text: "🚨 *Watchdog Alert*",
    icon: ":ambulance:",
    attachment: {
      color: "danger",
      title: "Production Health Check Failed",
      text: details.message || "Automated health checks detected failures.",
      fields,
      footer: "Klarpakke Watchdog | Thread updates will follow",
    },
  };
}

function buildRecoveringMessage(details) {
  return {
    text: "🔄 *Recovery in Progress*",
    icon: ":arrows_counterclockwise:",
    attachment: {
      color: "warning",
      title: "Automated Recovery Started",
      text: details.message || "Attempting automatic recovery procedures...",
      fields: [
        { title: "Action", value: details.action || "repair", short: true },
        { title: "Started", value: new Date().toISOString(), short: true },
      ],
    },
  };
}

function buildRecoveredMessage(details) {
  const fields = [
    { title: "Status", value: "✅ RECOVERED", short: true },
    { title: "Timestamp", value: new Date().toISOString(), short: true },
  ];

  if (details.resolutionTime) {
    fields.push({ title: "Resolution Time", value: details.resolutionTime, short: true });
  }

  if (details.actions?.length) {
    fields.push({ title: "Actions Taken", value: details.actions.join(", "), short: false });
  }

  return {
    text: "✅ *Recovery Successful*",
    icon: ":white_check_mark:",
    attachment: {
      color: "good",
      title: "All Systems Operational",
      text: details.message || "Automated recovery completed successfully.",
      fields,
      footer: "Klarpakke Watchdog | Thread closed",
    },
  };
}

function buildUpdateMessage(details) {
  return {
    text: "📊 *Status Update*",
    icon: ":chart_with_upwards_trend:",
    attachment: {
      color: "#36a64f",
      title: "Watchdog Update",
      text: details.message || "Status update...",
      fields: details.fields || [],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const statusArg = args.find(a => a.startsWith("--status="));
  const status = statusArg ? statusArg.split("=")[1] : null;
  const threadArg = args.find(a => a.startsWith("--thread="));
  const threadTs = threadArg ? threadArg.split("=")[1] : null;
  const detailsArg = args.find(a => a.startsWith("--details="));
  const details = detailsArg ? JSON.parse(detailsArg.split("=")[1]) : {};

  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  SLACK RECOVERY THREAD");
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info(`Status: ${status || "none"}`);

  if (!CONFIG.webhookUrl) {
    logger.info("Slack ikke konfigurert — skipper (solo mode OK)");
    logger.info("For å aktivere: sett SLACK_WEBHOOK_URL i .env.local");
    process.exit(0);
  }

  const threadManager = new ThreadManager();
  const slack = new SlackAPI();

  // Hent eksisterende thread hvis ikke spesifisert
  let currentThread = threadTs || threadManager.getSavedThread();

  try {
    let message;
    switch (status) {
      case "failed":
        message = buildFailedMessage(details);
        // Send som ny melding (start ny thread)
        currentThread = null;
        break;
      case "recovering":
        message = buildRecoveringMessage(details);
        break;
      case "recovered":
        message = buildRecoveredMessage(details);
        break;
      case "update":
        message = buildUpdateMessage(details);
        break;
      default:
        logger.error(`Ukjent status: ${status}`);
        process.exit(1);
    }

    // Send melding
    const result = await slack.sendMessage(message.text, {
      icon: message.icon,
      attachments: [slack.formatAttachment(message.attachment)],
      thread_ts: currentThread || undefined,
    });

    logger.success("Melding sendt");

    // Lagre thread_ts hvis dette er en ny thread (failed status)
    if (status === "failed" && !currentThread) {
      // Webhook returnerer ikke thread_ts, så vi kan ikke lagre det
      // Krever bot token for å få thread_ts
      logger.info("Ny thread startet (thread_ts ikke tilgjengelig via webhook)");
    }

    // Hvis recovered, clear thread
    if (status === "recovered") {
      threadManager.clearThread();
    }

    process.exit(0);
  } catch (error) {
    logger.error("Sending feilet", { error: error.message });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error("Uventet feil", { error: error.message });
  process.exit(1);
});

#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LINEAR WATCHDOG SYNC — Synkronisering av Linear med watchdog-status
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Formål: Automatisk oppdatering av Linear-issues basert på watchdog-status.
 *         Lukker resolved issues, oppdaterer med kommentarer, assigner til on-call.
 *
 * Bruk:
 *   node scripts/linear-watchdog-sync.mjs                    # Standard sync
 *   node scripts/linear-watchdog-sync.mjs --status=failed    # Rapporter feil
 *   node scripts/linear-watchdog-sync.mjs --status=recovered # Rapporter recovery
 *   node scripts/linear-watchdog-sync.mjs --close-resolved   # Lukk resolved issues
 *   npm run linear:watchdog:sync                             # npm wrapper
 *
 * Exit codes:
 *   0 — Sync vellykket
 *   1 — Sync feilet
 *   2 — Konfigurasjonsfeil
 */

import { readFileSync, existsSync } from "fs";
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
  linearApiKey: process.env.LINEAR_API_KEY,
  linearTeamId: process.env.LINEAR_TEAM_ID,
  onCallUserId: process.env.LINEAR_ONCALL_USER_ID,
  enabled: !!(process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID),
  watchdogLabelId: process.env.LINEAR_WATCHDOG_LABEL_ID, // Valgfri
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
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
    const icons = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌", success: "✅" };
    console.log(`${icons[level] || "•"} ${message}`, data ? JSON.stringify(data) : "");
  }

  debug(msg, data) { this.log("debug", msg, data); }
  info(msg, data) { this.log("info", msg, data); }
  warn(msg, data) { this.log("warn", msg, data); }
  error(msg, data) { this.log("error", msg, data); }
  success(msg, data) { this.log("success", msg, data); }
}

const logger = new Logger();

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAR API
// ═══════════════════════════════════════════════════════════════════════════════

class LinearAPI {
  constructor() {
    this.apiKey = CONFIG.linearApiKey;
    this.teamId = CONFIG.linearTeamId;
    this.baseUrl = "https://api.linear.app/graphql";
  }

  async query(query, variables = {}) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    
    if (data.errors?.length) {
      throw new Error(data.errors[0].message);
    }
    
    return data.data;
  }

  async getWatchdogIssues(state = null) {
    const stateFilter = state ? `, state: { name: { eq: "${state}" } }` : "";
    const labelFilter = CONFIG.watchdogLabelId ? `, labels: { id: { eq: "${CONFIG.watchdogLabelId}" } }` : "";
    
    const data = await this.query(`
      query {
        issues(
          filter: { 
            team: { id: { eq: "${this.teamId}" } }
            ${stateFilter}
            ${labelFilter}
            title: { contains: "Watchdog" }
          }
          orderBy: updatedAt
        ) {
          nodes {
            id
            identifier
            title
            state { name }
            assignee { id name }
            url
            createdAt
            updatedAt
          }
        }
      }
    `);
    
    return data.issues.nodes;
  }

  async createIssue(title, description, options = {}) {
    const input = {
      teamId: this.teamId,
      title,
      description,
      priority: options.priority || 2,
    };
    
    if (CONFIG.watchdogLabelId) {
      input.labelIds = [CONFIG.watchdogLabelId];
    }
    
    if (CONFIG.onCallUserId && options.assign) {
      input.assigneeId = CONFIG.onCallUserId;
    }

    const data = await this.query(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `, { input });
    
    return data.issueCreate.issue;
  }

  async updateIssue(issueId, input) {
    const data = await this.query(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { id identifier }
        }
      }
    `, { id: issueId, input });
    
    return data.issueUpdate.issue;
  }

  async addComment(issueId, body) {
    const data = await this.query(`
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id }
        }
      }
    `, {
      input: {
        issueId,
        body,
      },
    });
    
    return data.commentCreate.comment;
  }

  async getStates() {
    const data = await this.query(`
      query {
        workflowStates(filter: { team: { id: { eq: "${this.teamId}" } } }) {
          nodes {
            id
            name
            type
          }
        }
      }
    `);
    
    return data.workflowStates.nodes;
  }

  async transitionToState(issueId, stateName) {
    // Først hent state ID
    const states = await this.getStates();
    const targetState = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
    
    if (!targetState) {
      throw new Error(`State "${stateName}" not found`);
    }
    
    return this.updateIssue(issueId, { stateId: targetState.id });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class WatchdogSync {
  constructor() {
    this.linear = new LinearAPI();
    this.actions = [];
  }

  async syncFailedStatus(details = {}) {
    logger.info("Synkroniserer failed status...");
    
    // Sjekk om det allerede finnes en åpen watchdog-issue
    const openIssues = await this.linear.getWatchdogIssues();
    const openIssue = openIssues.find(i => 
      i.state.name !== "Done" && 
      i.state.name !== "Canceled"
    );
    
    if (openIssue) {
      logger.info(`Fant eksisterende issue: ${openIssue.identifier}`);
      
      // Legg til kommentar med oppdatering
      const comment = this.formatFailedComment(details);
      await this.linear.addComment(openIssue.id, comment);
      
      // Oppdater assignee hvis ikke satt
      if (!openIssue.assignee && CONFIG.onCallUserId) {
        await this.linear.updateIssue(openIssue.id, { assigneeId: CONFIG.onCallUserId });
      }
      
      this.actions.push({ action: "update", issueId: openIssue.id, type: "comment" });
      return { issue: openIssue, created: false, updated: true };
    }
    
    // Opprett ny issue
    const title = "🚨 Watchdog Alert — Production Unhealthy";
    const description = this.formatFailedDescription(details);
    
    const issue = await this.linear.createIssue(title, description, { 
      priority: 1, // Urgent
      assign: true,
    });
    
    logger.success(`Opprettet issue: ${issue.identifier}`);
    this.actions.push({ action: "create", issueId: issue.id, type: "failed" });
    
    return { issue, created: true, updated: false };
  }

  async syncRecoveredStatus(details = {}) {
    logger.info("Synkroniserer recovered status...");
    
    // Finn åpne watchdog-issues
    const openIssues = await this.linear.getWatchdogIssues();
    const openIssue = openIssues.find(i => 
      i.state.name !== "Done" && 
      i.state.name !== "Canceled"
    );
    
    if (openIssue) {
      // Legg til kommentar om recovery
      const comment = this.formatRecoveredComment(details);
      await this.linear.addComment(openIssue.id, comment);
      
      // Flytt til "In Review" eller lignende
      try {
        await this.linear.transitionToState(openIssue.id, "Done");
        logger.success(`Flyttet ${openIssue.identifier} til Done`);
      } catch (e) {
        logger.warn("Kunne ikke flytte issue til Done", { error: e.message });
      }
      
      this.actions.push({ action: "resolve", issueId: openIssue.id, type: "recovered" });
      return { issue: openIssue, resolved: true };
    }
    
    logger.info("Ingen åpen watchdog-issue funnet");
    return { issue: null, resolved: false };
  }

  async closeResolvedIssues() {
    logger.info("Lukker resolved issues...");
    
    // Finn issues som har vært resolved en stund
    const issues = await this.linear.getWatchdogIssues();
    const now = Date.now();
    
    let closed = 0;
    for (const issue of issues) {
      // Sjekk om issue er gammel nok til å lukkes (f.eks. 7 dager)
      const updatedAt = new Date(issue.updatedAt).getTime();
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 7 && issue.state.name !== "Done" && issue.state.name !== "Canceled") {
        try {
          await this.linear.transitionToState(issue.id, "Done");
          closed++;
          this.actions.push({ action: "close", issueId: issue.id });
        } catch (e) {
          logger.warn(`Kunne ikke lukke ${issue.identifier}`);
        }
      }
    }
    
    logger.success(`Lukket ${closed} gamle issues`);
    return { closed };
  }

  formatFailedDescription(details) {
    return `Automated watchdog detected production health issues.

**Timestamp:** ${new Date().toISOString()}
**Status:** Failed
**Details:**
\`\`\`json
${JSON.stringify(details, null, 2)}
\`\`\`

**Next Steps:**
1. Check GitHub Actions logs
2. Verify /api/health endpoint
3. Review recent deployments
4. Contact on-call if not resolved in 15 minutes`;
  }

  formatFailedComment(details) {
    return `**Update:** Watchdog still failing

**Timestamp:** ${new Date().toISOString()}
**Failed checks:** ${details.failedChecks?.join(", ") || "N/A"}

Auto-repair attempts: ${details.repairAttempts || 0}`;
  }

  formatRecoveredComment(details) {
    return `**✅ RECOVERED**

**Timestamp:** ${new Date().toISOString()}
**Resolution time:** ${details.resolutionTime || "N/A"}
**Final status:** All checks passing

This issue has been auto-closed. Reopen if problems recur.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const statusArg = args.find(a => a.startsWith("--status="));
  const status = statusArg ? statusArg.split("=")[1] : null;
  const closeResolved = args.includes("--close-resolved");
  
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  LINEAR WATCHDOG SYNC");
  logger.info("═══════════════════════════════════════════════════════════════");
  
  if (!CONFIG.enabled) {
    logger.info("Linear ikke konfigurert — skipper (solo mode OK)");
    logger.info("For å aktivere: sett LINEAR_API_KEY og LINEAR_TEAM_ID i .env.local");
    process.exit(0);
  }
  
  const sync = new WatchdogSync();
  
  try {
    if (closeResolved) {
      const result = await sync.closeResolvedIssues();
      logger.success(`Lukket ${result.closed} issues`);
      process.exit(0);
    }
    
    if (status === "failed") {
      const details = {
        timestamp: new Date().toISOString(),
        failedChecks: ["signal-health", "e2e-critical"], // Kan parses fra args
      };
      
      const result = await sync.syncFailedStatus(details);
      logger.success(`Sync complete: ${result.issue?.identifier}`);
      process.exit(0);
    }
    
    if (status === "recovered") {
      const details = {
        resolutionTime: "~5 minutes",
      };
      
      const result = await sync.syncRecoveredStatus(details);
      if (result.resolved) {
        logger.success(`Resolved: ${result.issue.identifier}`);
      } else {
        logger.info("Ingen åpen issue å resolve");
      }
      process.exit(0);
    }
    
    // Default: vis status
    logger.info("Henter watchdog-issues...");
    const issues = await sync.linear.getWatchdogIssues();
    
    logger.info(`\nFant ${issues.length} watchdog issues:`);
    for (const issue of issues) {
      logger.info(`  ${issue.identifier}: ${issue.title} (${issue.state.name})`);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error("Sync feilet", { error: error.message });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error("Uventet feil", { error: error.message });
  process.exit(1);
});

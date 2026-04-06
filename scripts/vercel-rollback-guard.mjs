#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERCEL ROLLBACK GUARD — Automatisk rollback ved P0-feil
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Formål: Automatisk rollback til siste known-good deploy ved kritiske feil
 *         i produksjon. Integrert med GitHub Actions og Linear.
 *
 * Bruk:
 *   node scripts/vercel-rollback-guard.mjs                    # Sjekk og rollback ved behov
 *   node scripts/vercel-rollback-guard.mjs --check            # Kun sjekk deploy-status
 *   node scripts/vercel-rollback-guard.mjs --force            # Tving rollback
 *   node scripts/vercel-rollback-guard.mjs --to=<deploy-id>   # Rollback til spesifikk deploy
 *   npm run vercel:rollback:guard                             # npm wrapper
 *
 * Exit codes:
 *   0 — Ingen rollback nødvendig / rollback vellykket
 *   1 — Rollback feilet
 *   2 — Konfigurasjonsfeil
 *
 * Integrasjon:
 *   - Kjøres fra hourly-watchdog ved total failure
 *   - Kan trigges fra GitHub Actions
 *   - Oppretter Linear-issue og Slack-varsel
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
  const envFiles = [".env.local", ".env", ".env.vercel"];
  for (const file of envFiles) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      dotenv.config({ path });
    }
  }
}

loadEnv();

const CONFIG = {
  vercelToken: process.env.VERCEL_TOKEN,
  projectId: process.env.VERCEL_PROJECT_ID,
  teamId: process.env.VERCEL_ORG_ID || process.env.VERCEL_TEAM_ID,
  productionUrl: "https://www.klarpakke.no",
  healthEndpoint: "https://www.klarpakke.no/api/health",
  reportDir: process.env.WATCHDOG_REPORT_DIR || "./watchdog-reports",
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  linearApiKey: process.env.LINEAR_API_KEY,
  linearTeamId: process.env.LINEAR_TEAM_ID,
  // Terskler
  maxFailedPings: 3,
  pingTimeoutMs: 10000,
  healthCheckRetries: 3,
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
    const icons = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌", success: "✅", cmd: "💲" };
    console.log(`${icons[level] || "•"} ${message}`, data ? JSON.stringify(data) : "");
  }

  debug(msg, data) { this.log("debug", msg, data); }
  info(msg, data) { this.log("info", msg, data); }
  warn(msg, data) { this.log("warn", msg, data); }
  error(msg, data) { this.log("error", msg, data); }
  success(msg, data) { this.log("success", msg, data); }

  getReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.logs.length,
        errors: this.logs.filter(l => l.level === "error").length,
      },
      logs: this.logs,
    };
  }
}

const logger = new Logger();

// ═══════════════════════════════════════════════════════════════════════════════
// VERCEL API
// ═══════════════════════════════════════════════════════════════════════════════

class VercelAPI {
  constructor() {
    this.token = CONFIG.vercelToken;
    this.baseUrl = "https://api.vercel.com";
    this.teamParam = CONFIG.teamId ? `?teamId=${CONFIG.teamId}` : "";
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}${endpoint.includes("?") ? "&" : "?"}${this.teamParam.slice(1)}`;
    
    logger.debug(`API Request: ${options.method || "GET"} ${endpoint}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel API ${response.status}: ${error}`);
    }
    
    return response.json();
  }

  async getDeployments(limit = 10) {
    const projectId = CONFIG.projectId;
    if (!projectId) {
      throw new Error("VERCEL_PROJECT_ID ikke satt");
    }
    
    const data = await this.request(`/v6/deployments?projectId=${projectId}&limit=${limit}`);
    return data.deployments || [];
  }

  async getDeployment(deployId) {
    return this.request(`/v13/deployments/${deployId}`);
  }

  async redeploy(deployId) {
    // Vercel støtter ikke direkte "rollback", men vi kan redeploye en gammel commit
    const deployment = await this.getDeployment(deployId);
    
    // Create new deployment with same commit
    const projectId = CONFIG.projectId;
    const data = await this.request(`/v13/deployments?projectId=${projectId}`, {
      method: "POST",
      body: JSON.stringify({
        name: deployment.name,
        gitSource: deployment.gitSource,
        target: "production",
      }),
    });
    
    return data;
  }

  async cancelDeployment(deployId) {
    return this.request(`/v12/deployments/${deployId}/cancel`, {
      method: "PATCH",
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECKER
// ═══════════════════════════════════════════════════════════════════════════════

class HealthChecker {
  async pingProduction() {
    logger.info("Pinger produksjon...");
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.pingTimeoutMs);
      
      const response = await fetch(CONFIG.healthEndpoint, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      
      clearTimeout(timeout);
      
      const data = await response.json().catch(() => null);
      
      return {
        ok: response.ok && data?.status === "healthy",
        status: response.status,
        data,
        responseTime: Date.now(), // TODO: faktisk timing
      };
    } catch (error) {
      logger.error("Health check feilet", { error: error.message });
      return { ok: false, error: error.message };
    }
  }

  async verifyMultiplePings(count = CONFIG.healthCheckRetries) {
    logger.info(`Verifiserer med ${count} pings...`);
    
    const results = [];
    for (let i = 0; i < count; i++) {
      const result = await this.pingProduction();
      results.push(result);
      
      if (!result.ok) {
        logger.warn(`Ping ${i + 1} feilet`);
      }
      
      // Vent litt mellom pings
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    const failedCount = results.filter(r => !r.ok).length;
    const successRate = (results.length - failedCount) / results.length;
    
    return {
      results,
      failedCount,
      successRate,
      healthy: failedCount === 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLBACK ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class RollbackEngine {
  constructor(vercel) {
    this.vercel = vercel;
    this.actions = [];
  }

  async findLastGoodDeploy() {
    logger.info("Leter etter siste known-good deploy...");
    
    const deployments = await this.vercel.getDeployments(20);
    
    // Finn siste READY deploy med god health
    for (const deploy of deployments) {
      if (deploy.state === "READY" && deploy.target === "production") {
        logger.info(`Fant kandidat: ${deploy.uid} (${deploy.created})`);
        
        // Sjekk om denne faktisk var good
        // (Vi kan sjekke GitHub status eller tidligere health checks)
        const isKnownGood = await this.verifyDeployHealth(deploy.uid);
        
        if (isKnownGood) {
          logger.success(`Known-good deploy funnet: ${deploy.uid}`);
          return deploy;
        }
      }
    }
    
    logger.error("Ingen known-good deploy funnet");
    return null;
  }

  async verifyDeployHealth(deployId) {
    // Forenklet: anta at READY state + production = good
    // I en mer avansert versjon kan vi sjekke historiske health checks
    return true;
  }

  async executeRollback(targetDeployId = null) {
    logger.info("Executer rollback...");
    
    let targetDeploy = targetDeployId ? 
      await this.vercel.getDeployment(targetDeployId) : 
      await this.findLastGoodDeploy();
    
    if (!targetDeploy) {
      throw new Error("Ingen target deploy for rollback");
    }
    
    logger.info(`Rollback til: ${targetDeploy.uid}`);
    
    // Redeploy denne versjonen
    const newDeploy = await this.vercel.redeploy(targetDeploy.uid);
    
    logger.success(`Rollback initiert: ${newDeploy.id}`);
    this.actions.push({
      action: "rollback",
      from: "current",
      to: targetDeploy.uid,
      newDeployId: newDeploy.id,
    });
    
    return newDeploy;
  }

  async waitForDeploy(deployId, timeoutMs = 300000) {
    logger.info(`Venter på deploy ${deployId}...`);
    
    const start = Date.now();
    const checkInterval = 10000;
    
    while (Date.now() - start < timeoutMs) {
      const deploy = await this.vercel.getDeployment(deployId);
      
      logger.info(`Status: ${deploy.state}`);
      
      if (deploy.state === "READY") {
        logger.success("Deploy READY!");
        return { ready: true, deploy };
      }
      
      if (deploy.state === "ERROR") {
        logger.error("Deploy feilet");
        return { ready: false, error: "deploy_error", deploy };
      }
      
      await new Promise(r => setTimeout(r, checkInterval));
    }
    
    return { ready: false, error: "timeout" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function notify(message, options = {}) {
  if (CONFIG.slackWebhook) {
    try {
      await fetch(CONFIG.slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "#ops",
          username: "Vercel Rollback Guard",
          icon_emoji: options.icon || ":rocket:",
          attachments: [{
            color: options.color || "warning",
            title: options.title || "Vercel Rollback",
            text: message,
            fields: options.fields || [],
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });
      logger.info("Slack-varsel sendt");
    } catch (e) {
      logger.error("Kunne ikke sende Slack-varsel");
    }
  }
}

async function createLinearIncident(title, description) {
  if (!CONFIG.linearApiKey || !CONFIG.linearTeamId) {
    return null;
  }
  
  try {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: CONFIG.linearApiKey,
      },
      body: JSON.stringify({
        query: `
          mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue { id identifier url }
            }
          }
        `,
        variables: {
          input: {
            teamId: CONFIG.linearTeamId,
            title,
            description,
            priority: 1, // Urgent
          },
        },
      }),
    });
    
    const data = await response.json();
    return data.data?.issueCreate?.issue;
  } catch (e) {
    logger.error("Kunne ikke opprette Linear issue");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const force = args.includes("--force");
  const targetArg = args.find(a => a.startsWith("--to="));
  const targetDeployId = targetArg ? targetArg.split("=")[1] : null;
  
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  VERCEL ROLLBACK GUARD");
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info(`Modus: ${checkOnly ? "check-only" : force ? "force-rollback" : "auto-guard"}`);
  
  if (!CONFIG.vercelToken) {
    logger.error("Mangler VERCEL_TOKEN");
    process.exit(2);
  }
  
  const vercel = new VercelAPI();
  const health = new HealthChecker();
  const rollback = new RollbackEngine(vercel);
  
  // 1. Sjekk nåværende health
  logger.info("\n--- Health Check ---");
  const healthStatus = await health.verifyMultiplePings();
  
  logger.info(`Success rate: ${(healthStatus.successRate * 100).toFixed(0)}%`);
  logger.info(`Failed pings: ${healthStatus.failedCount}/${healthStatus.results.length}`);
  
  if (healthStatus.healthy && !force) {
    logger.success("\n✅ Produksjon er healthy — ingen rollback nødvendig");
    
    const report = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      health: healthStatus,
      actions: [],
    };
    
    saveReport(report);
    process.exit(0);
  }
  
  if (checkOnly) {
    logger.warn("\n⚠️  Produksjon unhealthy (check-only mode)");
    
    await notify(
      `Produksjon unhealthy: ${healthStatus.failedCount}/${healthStatus.results.length} pings feilet`,
      { title: "⚠️ Production Unhealthy", color: "danger", icon: ":ambulance:" }
    );
    
    process.exit(1);
  }
  
  // 2. ROLLBACK MODE
  logger.info("\n--- Executing Rollback ---");
  
  try {
    // Finn og deploy rollback
    const newDeploy = await rollback.executeRollback(targetDeployId);
    
    // Vent på at deploy blir ready
    const deployResult = await rollback.waitForDeploy(newDeploy.id);
    
    if (!deployResult.ready) {
      throw new Error("Rollback deploy feilet");
    }
    
    // Verifiser at det faktisk fungerer
    logger.info("\n--- Verifying Rollback ---");
    await new Promise(r => setTimeout(r, 5000)); // Vent litt på DNS
    
    const verifyHealth = await health.verifyMultiplePings();
    
    const success = verifyHealth.healthy;
    
    const report = {
      timestamp: new Date().toISOString(),
      status: success ? "rollback_success" : "rollback_failed",
      initialHealth: healthStatus,
      finalHealth: verifyHealth,
      deploy: {
        id: newDeploy.id,
        state: deployResult.deploy.state,
      },
      actions: rollback.actions,
    };
    
    saveReport(report);
    
    if (success) {
      logger.success("\n✅ Rollback vellykket!");
      
      await notify(
        `Rollback vellykket til ${newDeploy.id}. Health: ${(verifyHealth.successRate * 100).toFixed(0)}%`,
        { title: "✅ Rollback Successful", color: "good", icon: ":white_check_mark:" }
      );
      
      await createLinearIncident(
        "🚨 Automatisk rollback utført",
        `Produksjon var unhealthy. Automatisk rollback utført til deploy ${newDeploy.id}.\n\nHealth før: ${(healthStatus.successRate * 100).toFixed(0)}%\nHealth etter: ${(verifyHealth.successRate * 100).toFixed(0)}%`
      );
      
      process.exit(0);
    } else {
      throw new Error("Rollback deploy var successful, men health fortsatt dårlig");
    }
  } catch (error) {
    logger.error("\n❌ Rollback feilet", { error: error.message });
    
    await notify(
      `Rollback feilet: ${error.message}`,
      { title: "🚨 Rollback Failed", color: "danger", icon: ":rotating_light:" }
    );
    
    await createLinearIncident(
      "🚨 Rollback feilet",
      `Automatisk rollback feilet: ${error.message}. Manuel intervensjon nødvendig.`
    );
    
    process.exit(1);
  }
}

function saveReport(report) {
  try {
    mkdirSync(CONFIG.reportDir, { recursive: true });
    const reportFile = `${CONFIG.reportDir}/rollback-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`Rapport lagret: ${reportFile}`);
  } catch (error) {
    logger.error("Kunne ikke lagre rapport");
  }
}

main().catch(error => {
  logger.error("Uventet feil", { error: error.message });
  process.exit(1);
});

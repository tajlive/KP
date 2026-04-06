#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HEALTH RECOVERY — Automatisk gjenoppretting av signal-pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Formål: Automatisk restart av signal-engine ved stale heartbeat,
 *         rensing av Redis-cache ved feil, og verifisering av health-endpoint.
 *
 * Bruk:
 *   node scripts/health-recovery.mjs                    # Standard recovery
 *   node scripts/health-recovery.mjs --check-only       # Kun sjekk
 *   node scripts/health-recovery.mjs --force            # Tving restart selv om OK
 *   node scripts/health-recovery.mjs --max-age=30       # Custom threshold (min)
 *   npm run health:recover                              # npm wrapper
 *
 * Exit codes:
 *   0 — Health OK (eller reparert)
 *   1 — Recovery feilet / fortsatt unhealthy
 *   2 — Konfigurasjonsfeil
 *
 * Integrasjon:
 *   - Kjøres fra hourly-watchdog ved stale signaler
 *   - Kan trigges fra GitHub Actions
 *   - Integrert med Linear for incident-tracking
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGURASJON
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULTS = {
  maxAgeMinutes: 20,
  healthUrl: "https://www.klarpakke.no/api/health",
  signalEngineFunction: "signal-engine",
  reportDir: process.env.WATCHDOG_REPORT_DIR || "./watchdog-reports",
  retryAttempts: 3,
  retryDelayMs: 5000,
  verificationTimeoutMs: 120000, // 2 minutter
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

class Logger {
  constructor() {
    this.logs = [];
  }

  log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    this.logs.push(entry);
    
    const icons = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌", success: "✅" };
    console.log(`${icons[level] || "•"} [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : "");
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
        warnings: this.logs.filter(l => l.level === "warn").length,
      },
      logs: this.logs,
    };
  }
}

const logger = new Logger();

// ═══════════════════════════════════════════════════════════════════════════════
// ENV LOADING
// ═══════════════════════════════════════════════════════════════════════════════

function loadEnv() {
  const envFiles = [".env.local", ".env", ".env.production.local"];
  for (const file of envFiles) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      dotenv.config({ path });
      logger.debug(`Loaded env from ${file}`);
    }
  }
}

loadEnv();

const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  accessToken: process.env.SUPABASE_ACCESS_TOKEN, // For Management API
  projectRef: process.env.SUPABASE_PROJECT_REF || 
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)/)?.[1],
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  linearApiKey: process.env.LINEAR_API_KEY,
  linearTeamId: process.env.LINEAR_TEAM_ID,
  ...DEFAULTS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENTS
// ═══════════════════════════════════════════════════════════════════════════════

function createSupabaseClient() {
  if (!CONFIG.supabaseUrl || !CONFIG.serviceRoleKey) {
    logger.error("Manglende Supabase konfigurasjon");
    process.exit(2);
  }
  return createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

class HealthChecker {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async checkSignalEngineHealth(maxAgeMinutes = CONFIG.maxAgeMinutes) {
    logger.info("Sjekker signal-engine health...");
    
    const { data: botRow, error } = await this.supabase
      .from("bot_health")
      .select("last_heartbeat, updated_at, status, last_error")
      .eq("bot_name", "signal-engine")
      .maybeSingle();
    
    if (error) {
      logger.error("Feil ved henting av bot_health", { error: error.message });
      return { healthy: false, error, reason: "query_failed" };
    }
    
    if (!botRow) {
      logger.warn("Ingen bot_health rad funnet for signal-engine");
      return { healthy: false, reason: "no_row" };
    }
    
    const heartbeatAt = botRow.last_heartbeat || botRow.updated_at;
    if (!heartbeatAt) {
      logger.warn("Ingen heartbeat timestamp funnet");
      return { healthy: false, reason: "no_heartbeat", status: botRow.status };
    }
    
    const ageMinutes = (Date.now() - new Date(heartbeatAt).getTime()) / 60000;
    
    logger.info(`Signal-engine status: ${botRow.status}, heartbeat: ${ageMinutes.toFixed(1)} min gammel`);
    
    if (botRow.status === "error") {
      return {
        healthy: false,
        reason: "status_error",
        status: botRow.status,
        lastError: botRow.last_error,
        heartbeatAge: ageMinutes,
      };
    }
    
    if (ageMinutes > maxAgeMinutes) {
      return {
        healthy: false,
        reason: "stale_heartbeat",
        status: botRow.status,
        heartbeatAge: ageMinutes,
        maxAge: maxAgeMinutes,
      };
    }
    
    return {
      healthy: true,
      status: botRow.status,
      heartbeatAge: ageMinutes,
    };
  }

  async checkLatestSignal(maxAgeMinutes = CONFIG.maxAgeMinutes) {
    logger.info("Sjekker siste signal...");
    
    const { data: signal, error } = await this.supabase
      .from("trading_signals")
      .select("id, created_at, status, symbol, action")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      logger.error("Feil ved henting av siste signal", { error: error.message });
      return { exists: false, error };
    }
    
    if (!signal) {
      logger.warn("Ingen trading_signals funnet");
      return { exists: false };
    }
    
    const ageMinutes = (Date.now() - new Date(signal.created_at).getTime()) / 60000;
    
    logger.info(`Siste signal: ${signal.action} ${signal.symbol}, ${ageMinutes.toFixed(1)} min gammel`);
    
    return {
      exists: true,
      signal,
      ageMinutes,
      isStale: ageMinutes > maxAgeMinutes,
    };
  }

  async checkApiHealth() {
    logger.info("Sjekker API health endpoint...");
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(CONFIG.healthUrl, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      const data = await response.json().catch(() => null);
      
      return {
        reachable: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        overallStatus: data?.status || "unknown",
        tradingEnabled: data?.tradingEnabled,
      };
    } catch (error) {
      logger.error("Health endpoint ikke tilgjengelig", { error: error.message });
      return { reachable: false, error: error.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOVERY ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

class RecoveryEngine {
  constructor(supabase) {
    this.supabase = supabase;
    this.actions = [];
  }

  async redeploySignalEngine() {
    logger.info("Redeployer signal-engine edge function...");
    
    // Sjekk om vi har Management API access
    if (!CONFIG.accessToken || !CONFIG.projectRef) {
      logger.warn("Mangler Supabase Management API token — kan ikke redeploye automatisk");
      logger.info("Manuell kommando: supabase functions deploy signal-engine");
      return { success: false, reason: "no_management_api" };
    }
    
    try {
      // Trigg redeploy via Supabase Management API
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${CONFIG.projectRef}/functions/signal-engine/deploy`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CONFIG.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entrypoint_path: "index.ts",
            // Andre deploy-options ved behov
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Deploy failed: ${response.status} ${error}`);
      }
      
      logger.success("Signal-engine redeploy initiert");
      this.actions.push({ action: "redeploy", target: "signal-engine", success: true });
      return { success: true };
    } catch (error) {
      logger.error("Redeploy feilet", { error: error.message });
      this.actions.push({ action: "redeploy", target: "signal-engine", success: false, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async invokeSignalEngine() {
    logger.info("Invoking signal-engine via pg_cron...");
    
    try {
      // Forsøk å trigge signal-engine via database-funksjon
      const { data, error } = await this.supabase.rpc("invoke_signal_engine", {});
      
      if (error) {
        // Fallback: direkte HTTP call hvis RPC ikke finnes
        logger.warn("RPC ikke tilgjengelig, prøver direkte HTTP...");
        return await this.invokeViaHttp();
      }
      
      logger.success("Signal-engine invoked via RPC");
      this.actions.push({ action: "invoke", target: "signal-engine", method: "rpc", success: true });
      return { success: true };
    } catch (error) {
      logger.error("Invoke feilet", { error: error.message });
      this.actions.push({ action: "invoke", target: "signal-engine", success: false, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async invokeViaHttp() {
    try {
      // Edge function URL
      const functionUrl = `${CONFIG.supabaseUrl}/functions/v1/signal-engine`;
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONFIG.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manual: true, source: "health-recovery" }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      logger.success("Signal-engine invoked via HTTP");
      this.actions.push({ action: "invoke", target: "signal-engine", method: "http", success: true });
      return { success: true };
    } catch (error) {
      logger.error("HTTP invoke feilet", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async clearRedisCache() {
    if (!CONFIG.redisUrl || !CONFIG.redisToken) {
      logger.debug("Redis ikke konfigurert — hopper over cache-clear");
      return { success: true, skipped: true };
    }
    
    logger.info("Renser Redis-cache...");
    
    try {
      // Hvis vi har Upstash Redis
      const response = await fetch(`${CONFIG.redisUrl}/flushall`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONFIG.redisToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Redis flush failed: ${response.status}`);
      }
      
      logger.success("Redis-cache renset");
      this.actions.push({ action: "clear_cache", target: "redis", success: true });
      return { success: true };
    } catch (error) {
      logger.warn("Kunne ikke rense Redis", { error: error.message });
      this.actions.push({ action: "clear_cache", target: "redis", success: false, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async seedTouchBotHealth() {
    logger.info("Seeder touch_bot_health for å trigge refresh...");
    
    try {
      // Kall touch-funksjonen som oppdaterer bot_health
      const { data, error } = await this.supabase.rpc("touch_bot_health", {
        bot_name: "signal-engine",
      });
      
      if (error) throw error;
      
      logger.success("touch_bot_health kjørt");
      this.actions.push({ action: "seed_touch", target: "bot_health", success: true });
      return { success: true };
    } catch (error) {
      logger.warn("touch_bot_health feilet (kan være OK hvis funksjonen ikke finnes)");
      return { success: false, error: error.message };
    }
  }

  async waitForRecovery(checker, maxWaitMs = CONFIG.verificationTimeoutMs) {
    logger.info(`Venter på recovery (maks ${maxWaitMs / 1000}s)...`);
    
    const start = Date.now();
    const checkInterval = 10000; // Sjekk hvert 10. sekund
    
    while (Date.now() - start < maxWaitMs) {
      const health = await checker.checkSignalEngineHealth();
      
      if (health.healthy) {
        logger.success("Signal-engine recovered!");
        return { recovered: true, waitedMs: Date.now() - start };
      }
      
      logger.info(`Fortsatt unhealthy, venter... (${Math.round((Date.now() - start) / 1000)}s)`);
      await new Promise(r => setTimeout(r, checkInterval));
    }
    
    logger.error("Recovery timeout — fortsatt unhealthy");
    return { recovered: false, waitedMs: maxWaitMs };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendNotification(message, options = {}) {
  if (CONFIG.slackWebhook) {
    try {
      await fetch(CONFIG.slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "#ops",
          username: "Health Recovery",
          icon_emoji: options.icon || ":stethoscope:",
          attachments: [{
            color: options.color || "warning",
            title: options.title || "Health Recovery",
            text: message,
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });
      logger.info("Slack-varsel sendt");
    } catch (error) {
      logger.error("Kunne ikke sende Slack-varsel", { error: error.message });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check-only");
  const force = args.includes("--force");
  const maxAgeArg = args.find(a => a.startsWith("--max-age="));
  const maxAge = maxAgeArg ? parseInt(maxAgeArg.split("=")[1]) : CONFIG.maxAgeMinutes;
  
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  HEALTH RECOVERY");
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info(`Modus: ${checkOnly ? "check-only" : force ? "force-recovery" : "auto-recovery"}`);
  logger.info(`Max age: ${maxAge} minutter`);
  
  const supabase = createSupabaseClient();
  const checker = new HealthChecker(supabase);
  const recovery = new RecoveryEngine(supabase);
  
  // Initial health check
  const health = await checker.checkSignalEngineHealth(maxAge);
  const apiHealth = await checker.checkApiHealth();
  const signal = await checker.checkLatestSignal(maxAge);
  
  logger.info("\n--- Initial Status ---");
  logger.info(`Signal-engine: ${health.healthy ? "✅ Healthy" : "❌ Unhealthy"}`, {
    reason: health.reason,
    age: health.heartbeatAge?.toFixed(1),
  });
  logger.info(`API Health: ${apiHealth.reachable ? "✅ Reachable" : "❌ Unreachable"}`, {
    status: apiHealth.status,
    overall: apiHealth.overallStatus,
  });
  logger.info(`Latest signal: ${signal.exists ? (signal.isStale ? "⚠️ Stale" : "✅ Fresh") : "❌ Missing"}`, {
    age: signal.ageMinutes?.toFixed(1),
  });
  
  // Hvis alt er OK og ikke force, avslutt
  if (health.healthy && apiHealth.reachable && !signal.isStale && !force) {
    logger.success("\n✅ All systems healthy — ingen recovery nødvendig");
    
    const report = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: { health, apiHealth, signal },
      actions: [],
    };
    
    saveReport(report);
    process.exit(0);
  }
  
  if (checkOnly) {
    logger.warn("\n⚠️  System unhealthy (check-only mode)");
    
    await sendNotification(
      "System unhealthy — manual intervention required (check-only mode)",
      { title: "⚠️ Health Check Failed", color: "danger", icon: ":ambulance:" }
    );
    
    const report = {
      timestamp: new Date().toISOString(),
      status: "unhealthy",
      checks: { health, apiHealth, signal },
      actions: [],
    };
    
    saveReport(report);
    process.exit(1);
  }
  
  // RECOVERY MODE
  logger.info("\n--- Starting Recovery ---");
  
  // 1. Prøv å trigge signal-engine
  await recovery.seedTouchBotHealth();
  await recovery.invokeSignalEngine();
  
  // 2. Hvis fortsatt problemer, redeploy
  if (!health.healthy && health.reason !== "status_error") {
    await recovery.redeploySignalEngine();
  }
  
  // 3. Clear cache hvis API issues
  if (!apiHealth.reachable || apiHealth.overallStatus === "unhealthy") {
    await recovery.clearRedisCache();
  }
  
  // 4. Vent og verifiser
  logger.info("\n--- Verifying Recovery ---");
  const verification = await recovery.waitForRecovery(checker);
  
  // Final check
  const finalHealth = await checker.checkSignalEngineHealth(maxAge);
  const finalApiHealth = await checker.checkApiHealth();
  
  const success = finalHealth.healthy && finalApiHealth.reachable;
  
  const report = {
    timestamp: new Date().toISOString(),
    status: success ? "recovered" : "failed",
    initialChecks: { health, apiHealth, signal },
    finalChecks: { health: finalHealth, apiHealth: finalApiHealth },
    actions: recovery.actions,
    verification,
  };
  
  saveReport(report);
  
  if (success) {
    logger.success("\n✅ Recovery successful!");
    await sendNotification(
      `Health recovered after ${verification.waitedMs / 1000}s`,
      { title: "✅ Health Recovered", color: "good", icon: ":white_check_mark:" }
    );
    process.exit(0);
  } else {
    logger.error("\n❌ Recovery failed — manual intervention required");
    await sendNotification(
      "Health recovery failed — manual intervention required",
      { title: "🚨 Health Recovery Failed", color: "danger", icon: ":ambulance:" }
    );
    process.exit(1);
  }
}

function saveReport(report) {
  try {
    mkdirSync(CONFIG.reportDir, { recursive: true });
    const reportFile = `${CONFIG.reportDir}/recovery-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`Rapport lagret: ${reportFile}`);
  } catch (error) {
    logger.error("Kunne ikke lagre rapport", { error: error.message });
  }
}

main().catch(error => {
  logger.error("Uventet feil", { error: error.message, stack: error.stack });
  process.exit(1);
});

#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DB DRIFT AUTO-FIX — Automatisk reparasjon av migrasjonsdrift
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Formål: Automatisk deteksjon og reparasjon av migrasjonsdrift mellom
 *         lokalt repo og Supabase remote. Inkluderer repair --status reverted
 *         og push av manglende migrasjoner.
 *
 * Bruk:
 *   node scripts/db-drift-auto.mjs                    # Standard auto-fix
 *   node scripts/db-drift-auto.mjs --check-only       # Kun sjekk
 *   node scripts/db-drift-auto.mjs --dry-run          # Simuler uten endringer
 *   node scripts/db-drift-auto.mjs --repair-only      # Kun repair, ikke push
 *   npm run db:drift:auto                             # npm wrapper
 *
 * Exit codes:
 *   0 — Ingen drift / drift reparert
 *   1 — Drift kunne ikke repareres
 *   2 — Konfigurasjonsfeil
 *
 * Sikkerhet:
 *   - Krever SUPABASE_ACCESS_TOKEN (PAT) for management API
 *   - Logger ALDRI service role key eller tokens
 *   - Dry-run mode som standard ved tvil
 */

import { execSync, spawn } from "child_process";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ═══════════════════════════════════════════════════════════════════════════════
// KONFIGURASJON
// ═══════════════════════════════════════════════════════════════════════════════

function loadEnv() {
  const envFiles = [".env.local", ".env", ".env.production.local"];
  for (const file of envFiles) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      dotenv.config({ path });
    }
  }
}

loadEnv();

const CONFIG = {
  projectRef: process.env.SUPABASE_PROJECT_REF || 
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([^.]+)/)?.[1],
  accessToken: process.env.SUPABASE_ACCESS_TOKEN,
  reportDir: process.env.WATCHDOG_REPORT_DIR || "./watchdog-reports",
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  linearApiKey: process.env.LINEAR_API_KEY,
  linearTeamId: process.env.LINEAR_TEAM_ID,
  maxRepairAttempts: 3,
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
  cmd(msg, data) { this.log("cmd", msg, data); }

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
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════

function runCommand(command, options = {}) {
  logger.cmd(`$ ${command}`);
  
  try {
    const result = execSync(command, {
      encoding: "utf8",
      cwd: root,
      stdio: options.silent ? "pipe" : "inherit",
      timeout: options.timeout || 120000,
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      exitCode: error.status,
    };
  }
}

async function runCommandAsync(command, args = [], options = {}) {
  logger.cmd(`$ ${command} ${args.join(" ")}`);
  
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: options.silent ? "pipe" : "inherit",
      env: { ...process.env, ...options.env },
    });
    
    let stdout = "";
    let stderr = "";
    
    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
        if (!options.silent) process.stdout.write(data);
      });
    }
    
    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
        if (!options.silent) process.stderr.write(data);
      });
    }
    
    child.on("close", (code) => {
      resolve({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr,
      });
    });
    
    child.on("error", (error) => {
      resolve({
        success: false,
        error: error.message,
        stdout,
        stderr,
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

class DriftAnalyzer {
  async getMigrationStatus() {
    logger.info("Henter migrasjonsstatus...");
    
    const result = await runCommandAsync("npx", ["supabase", "migration", "list", "--linked", "--format", "json"], {
      silent: true,
    });
    
    if (!result.success) {
      logger.error("Kunne ikke hente migrasjonsstatus", { error: result.stderr });
      return { success: false, error: result.stderr };
    }
    
    try {
      // Parse output - supabase CLI output kan være tricky
      const lines = result.stdout.split("\n").filter(l => l.trim());
      const migrations = [];
      
      for (const line of lines) {
        // Match format: 20260325080000 | 2026-03-25 08:00:00 | public | 2026-03-25 08:05:00
        const match = line.match(/(\d{14})\s*\|\s*([^|]+)\|([^|]+)\|([^|]+)/);
        if (match) {
          migrations.push({
            version: match[1].trim(),
            name: match[1].trim(),
            local: match[2].trim(),
            remote: match[4]?.trim() || null,
            status: match[4] ? "applied" : "pending",
          });
        }
      }
      
      return { success: true, migrations };
    } catch (error) {
      logger.error("Kunne ikke parse migrasjonsstatus", { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async getDbDiff() {
    logger.info("Sjekker database diff...");
    
    const result = await runCommandAsync("npx", ["supabase", "db", "diff", "--linked", "--schema", "public"], {
      silent: true,
      timeout: 60000,
    });
    
    // db diff returnerer exit 1 hvis det finnes forskjeller (expected behavior)
    const hasDiff = result.exitCode === 1 && result.stdout?.includes("create table") || 
                    result.stdout?.includes("alter table") ||
                    result.stdout?.includes("create policy");
    
    return {
      hasDiff: hasDiff || false,
      output: result.stdout || "",
      error: result.stderr || "",
    };
  }

  analyzeDrift(migrations) {
    const drift = {
      remoteOnly: [],    // På remote, ikke lokalt
      localOnly: [],     // Lokalt, ikke på remote
      mismatched: [],    // Forskjell i timestamp
      ok: [],            // I sync
    };
    
    for (const m of migrations) {
      if (m.remote && !m.local) {
        drift.remoteOnly.push(m);
      } else if (m.local && !m.remote) {
        drift.localOnly.push(m);
      } else if (m.local && m.remote && m.local !== m.remote) {
        drift.mismatched.push(m);
      } else {
        drift.ok.push(m);
      }
    }
    
    return drift;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

class RepairEngine {
  constructor(options = {}) {
    this.options = options;
    this.actions = [];
  }

  async repairRemoteOnly(migrations) {
    logger.info(`Reparerer ${migrations.length} remote-only migrasjoner...`);
    
    for (const m of migrations) {
      logger.info(`Reparerer: ${m.version}`);
      
      if (this.options.dryRun) {
        logger.warn(`[DRY-RUN] Ville kjørt: migration repair --status reverted ${m.version}`);
        this.actions.push({ action: "repair", version: m.version, dryRun: true });
        continue;
      }
      
      const result = await runCommandAsync("npx", [
        "supabase",
        "migration",
        "repair",
        "--linked",
        "--status",
        "reverted",
        m.version,
      ], { silent: true });
      
      if (result.success) {
        logger.success(`Reparert: ${m.version}`);
        this.actions.push({ action: "repair", version: m.version, success: true });
      } else {
        logger.error(`Kunne ikke reparere: ${m.version}`, { error: result.stderr });
        this.actions.push({ action: "repair", version: m.version, success: false, error: result.stderr });
      }
    }
  }

  async pushLocalMigrations() {
    logger.info("Pusher lokale migrasjoner...");
    
    if (this.options.dryRun) {
      logger.warn("[DRY-RUN] Ville kjørt: db push --linked --include-all");
      this.actions.push({ action: "push", dryRun: true });
      return { success: true, dryRun: true };
    }

    const result = await runCommandAsync("npx", [
      "supabase",
      "db",
      "push",
      "--linked",
      "--include-all",
      "--yes",
    ], { timeout: 300000 });
    
    if (result.success) {
      logger.success("Migrasjoner pushet");
      this.actions.push({ action: "push", success: true });
    } else {
      logger.error("Push feilet", { error: result.stderr });
      this.actions.push({ action: "push", success: false, error: result.stderr });
    }
    
    return result;
  }

  async resetAndPush() {
    logger.warn("Tvinger reset og push...");
    
    if (this.options.dryRun) {
      logger.warn("[DRY-RUN] Ville kjørt: db reset + db push");
      return { success: true, dryRun: true };
    }
    
    // Dette er farlig - kun for staging/dev
    logger.error("Reset ikke implementert - gjøres manuelt");
    return { success: false, error: "not_implemented" };
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
          username: "DB Drift Auto-Fix",
          icon_emoji: options.icon || ":database:",
          attachments: [{
            color: options.color || "warning",
            title: options.title || "DB Drift",
            text: message,
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });
    } catch (e) {
      logger.error("Kunne ikke sende Slack-varsel");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check-only");
  const dryRun = args.includes("--dry-run");
  const repairOnly = args.includes("--repair-only");
  
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  DB DRIFT AUTO-FIX");
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info(`Modus: ${checkOnly ? "check-only" : dryRun ? "dry-run" : repairOnly ? "repair-only" : "full-auto"}`);
  
  if (!CONFIG.accessToken) {
    logger.error("Mangler SUPABASE_ACCESS_TOKEN (PAT)");
    logger.info("Hent token fra: https://supabase.com/dashboard/account/tokens");
    process.exit(2);
  }
  
  const analyzer = new DriftAnalyzer();
  const repair = new RepairEngine({ dryRun, checkOnly });
  
  // 1. Hent migrasjonsstatus
  const status = await analyzer.getMigrationStatus();
  if (!status.success) {
    logger.error("Kunne ikke hente migrasjonsstatus");
    process.exit(1);
  }
  
  logger.info(`Fant ${status.migrations.length} migrasjoner`);
  
  // 2. Analyser drift
  const drift = analyzer.analyzeDrift(status.migrations);
  
  logger.info("\n--- Drift Analysis ---");
  logger.info(`OK: ${drift.ok.length}`);
  logger.info(`Remote only: ${drift.remoteOnly.length}`);
  logger.info(`Local only: ${drift.localOnly.length}`);
  logger.info(`Mismatched: ${drift.mismatched.length}`);
  
  if (drift.remoteOnly.length > 0) {
    logger.info("Remote only:", drift.remoteOnly.map(m => m.version));
  }
  if (drift.localOnly.length > 0) {
    logger.info("Local only:", drift.localOnly.map(m => m.version));
  }
  
  // 3. Sjekk diff
  const diff = await analyzer.getDbDiff();
  if (diff.hasDiff) {
    logger.warn("Database diff funnet — schema ikke i sync");
  }
  
  // 4. Hvis ingen drift, avslutt
  const hasDrift = drift.remoteOnly.length > 0 || 
                   drift.localOnly.length > 0 || 
                   drift.mismatched.length > 0 ||
                   diff.hasDiff;
  
  if (!hasDrift) {
    logger.success("\n✅ Ingen drift funnet — databasen er i sync");
    
    const report = {
      timestamp: new Date().toISOString(),
      status: "ok",
      drift: { remoteOnly: 0, localOnly: 0, mismatched: 0 },
      actions: [],
    };
    
    saveReport(report);
    process.exit(0);
  }
  
  // 5. Hvis check-only, rapporter og avslutt
  if (checkOnly) {
    logger.warn("\n⚠️  Drift oppdaget (check-only mode)");
    
    await notify(
      `Migrasjonsdrift oppdaget: ${drift.remoteOnly.length} remote-only, ${drift.localOnly.length} local-only`,
      { title: "⚠️ DB Drift Detected", color: "danger" }
    );
    
    const report = {
      timestamp: new Date().toISOString(),
      status: "drift_detected",
      drift: {
        remoteOnly: drift.remoteOnly.length,
        localOnly: drift.localOnly.length,
        mismatched: drift.mismatched.length,
        details: drift,
      },
      actions: [],
    };
    
    saveReport(report);
    process.exit(1);
  }
  
  // 6. REPAIR MODE
  logger.info("\n--- Starting Repair ---");
  
  // Repair remote-only først
  if (drift.remoteOnly.length > 0) {
    await repair.repairRemoteOnly(drift.remoteOnly);
  }
  
  // Push local-only hvis ikke repair-only
  if (!repairOnly && drift.localOnly.length > 0) {
    await repair.pushLocalMigrations();
  }
  
  // Hvis diff, push igjen
  if (!repairOnly && diff.hasDiff) {
    logger.info("Pusher schema-endringer...");
    await repair.pushLocalMigrations();
  }
  
  // 7. Verifiser
  logger.info("\n--- Verifying Repair ---");
  const finalStatus = await analyzer.getMigrationStatus();
  const finalDrift = analyzer.analyzeDrift(finalStatus.migrations);
  const finalDiff = await analyzer.getDbDiff();
  
  const success = finalDrift.remoteOnly.length === 0 && 
                  finalDrift.mismatched.length === 0 &&
                  !finalDiff.hasDiff;
  
  const report = {
    timestamp: new Date().toISOString(),
    status: success ? "repaired" : "failed",
    initialDrift: {
      remoteOnly: drift.remoteOnly.length,
      localOnly: drift.localOnly.length,
      mismatched: drift.mismatched.length,
    },
    finalDrift: {
      remoteOnly: finalDrift.remoteOnly.length,
      localOnly: finalDrift.localOnly.length,
      mismatched: finalDrift.mismatched.length,
    },
    actions: repair.actions,
  };
  
  saveReport(report);
  
  if (success) {
    logger.success("\n✅ Drift reparert!");
    await notify("Migrasjonsdrift reparert", { title: "✅ DB Drift Repaired", color: "good" });
    process.exit(0);
  } else {
    logger.error("\n❌ Drift kunne ikke repareres fullstendig");
    logger.info(`Gjenstående: ${finalDrift.remoteOnly.length} remote-only, ${finalDrift.mismatched.length} mismatched`);
    await notify("Migrasjonsdrift kunne ikke repareres", { title: "🚨 DB Drift Repair Failed", color: "danger" });
    process.exit(1);
  }
}

function saveReport(report) {
  try {
    mkdirSync(CONFIG.reportDir, { recursive: true });
    const reportFile = `${CONFIG.reportDir}/db-drift-${Date.now()}.json`;
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

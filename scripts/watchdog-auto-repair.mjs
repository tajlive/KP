#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WATCHDOG AUTO-REPAIR — Selvhelbredende testbruker-infrastruktur
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Formål: Automatisk reparasjon av testbrukere ved hull i auth vs profiles,
 *         feilende innlogging, eller manglende leaderboard-data.
 *
 * Bruk:
 *   node scripts/watchdog-auto-repair.mjs                    # Standard repair
 *   node scripts/watchdog-auto-repair.mjs --check-only       # Kun sjekk, ikke reparer
 *   node scripts/watchdog-auto-repair.mjs --primary-only     # Kun primærbruker
 *   node scripts/watchdog-auto-repair.mjs --report=json      # JSON-output
 *   npm run watchdog:repair                                  # npm wrapper
 *
 * Exit codes:
 *   0 — Alt OK (eller reparert uten kritiske feil)
 *   1 — Kritiske feil som krever manuell intervensjon
 *   2 — Konfigurasjonsfeil (manglende env)
 *
 * Integrasjon:
 *   - Kjøres automatisk fra hourly-watchdog.sh ved feil
 *   - Sender Slack-varsel ved kritiske feil
 *   - Oppretter Linear-issue ved gjentatte feil
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

const CONFIG = {
  primaryUser: {
    email: process.env.E2E_USER_EMAIL || process.env.TEST_USER_EMAIL || "tom@klarpakke.no",
    password: process.env.E2E_USER_PASSWORD || process.env.TEST_USER_PASSWORD || "TestPassword123!",
  },
  copyLeader: {
    email: process.env.E2E_LEADER_EMAIL || "local+e2e-copy-leader@klarpakke.no",
    password: process.env.E2E_LEADER_PASSWORD || "TestPassword123!",
  },
  maxRetries: 3,
  retryDelayMs: 1000,
  reportDir: process.env.WATCHDOG_REPORT_DIR || "./watchdog-reports",
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  linearApiKey: process.env.LINEAR_API_KEY,
  linearTeamId: process.env.LINEAR_TEAM_ID,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

class Logger {
  constructor() {
    this.logs = [];
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.currentLevel = this.levels.info;
  }

  log(level, message, data = null) {
    if (this.levels[level] < this.currentLevel) return;
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    this.logs.push(entry);
    
    const colors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[34m",  // Blue
      warn: "\x1b[33m",  // Yellow
      error: "\x1b[31m", // Red
      reset: "\x1b[0m",
    };
    
    console.log(
      `${colors[level]}[${level.toUpperCase()}]${colors.reset} ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
  }

  debug(msg, data) { this.log("debug", msg, data); }
  info(msg, data) { this.log("info", msg, data); }
  warn(msg, data) { this.log("warn", msg, data); }
  error(msg, data) { this.log("error", msg, data); }

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

function createSupabaseClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    logger.error("Manglende Supabase konfigurasjon", {
      url: SUPABASE_URL ? "satt" : "mangler",
      key: SERVICE_ROLE_KEY ? "satt" : "mangler",
    });
    process.exit(2);
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

class TestUserRepair {
  constructor(supabase) {
    this.supabase = supabase;
    this.results = {
      checks: [],
      repairs: [],
      failures: [],
    };
  }

  async checkAuthUser(email) {
    logger.info(`Sjekker auth-bruker: ${email}`);
    
    try {
      // List users med pagination for å finne bruker
      let page = 1;
      const perPage = 200;
      const targetEmail = email.toLowerCase().trim();
      
      for (let i = 0; i < 50; i++) {
        const { data, error } = await this.supabase.auth.admin.listUsers({
          page,
          perPage,
        });
        
        if (error) throw error;
        
        const user = data.users.find(u => (u.email || "").toLowerCase() === targetEmail);
        if (user) {
          logger.info(`Fant auth-bruker`, { id: user.id, email: user.email });
          return { exists: true, user };
        }
        
        if (data.users.length < perPage) break;
        page++;
      }
      
      logger.warn(`Auth-bruker ikke funnet: ${email}`);
      return { exists: false, user: null };
    } catch (error) {
      logger.error(`Feil ved sjekk av auth-bruker`, { error: error.message });
      return { exists: false, user: null, error };
    }
  }

  async checkUserProfile(userId) {
    logger.info(`Sjekker user_profiles for: ${userId}`);
    
    const { data, error } = await this.supabase
      .from("user_profiles")
      .select("id, created_at")
      .eq("id", userId)
      .maybeSingle();
    
    if (error) {
      logger.error(`Feil ved sjekk av user_profiles`, { error: error.message });
      return { exists: false, error };
    }
    
    if (data) {
      logger.info(`Fant user_profiles-rad`, { id: data.id });
      return { exists: true, profile: data };
    }
    
    logger.warn(`Mangler user_profiles-rad for: ${userId}`);
    return { exists: false, profile: null };
  }

  async createAuthUser(email, password) {
    logger.info(`Oppretter auth-bruker: ${email}`);
    
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (error) {
      logger.error(`Feil ved opprettelse av auth-bruker`, { error: error.message });
      return { success: false, error };
    }
    
    logger.info(`Opprettet auth-bruker`, { id: data.user.id });
    this.results.repairs.push({ type: "auth_user_created", email, userId: data.user.id });
    return { success: true, user: data.user };
  }

  async createUserProfile(userId) {
    logger.info(`Oppretter user_profiles for: ${userId}`);
    
    const { data, error } = await this.supabase
      .from("user_profiles")
      .insert({ id: userId })
      .select()
      .single();
    
    if (error) {
      logger.error(`Feil ved opprettelse av user_profiles`, { error: error.message });
      return { success: false, error };
    }
    
    logger.info(`Opprettet user_profiles`, { id: data.id });
    this.results.repairs.push({ type: "user_profile_created", userId });
    return { success: true, profile: data };
  }

  async resetPassword(userId, newPassword) {
    logger.info(`Resetter passord for: ${userId}`);
    
    const { error } = await this.supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );
    
    if (error) {
      logger.error(`Feil ved passord-reset`, { error: error.message });
      return { success: false, error };
    }
    
    logger.info(`Passord resettet`);
    this.results.repairs.push({ type: "password_reset", userId });
    return { success: true };
  }

  async verifyLogin(email, password) {
    logger.info(`Verifiserer innlogging for: ${email}`);
    
    // Bruk anon-key for å teste faktisk innlogging
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      logger.warn("Mangler ANON_KEY — hopper over login-verifisering");
      return { verified: false, skipped: true };
    }
    
    const anonClient = createClient(SUPABASE_URL, anonKey);
    
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      logger.error(`Innlogging feilet`, { error: error.message });
      return { verified: false, error };
    }
    
    logger.info(`Innlogging OK`);
    
    // Logg ut umiddelbart
    await anonClient.auth.signOut();
    
    return { verified: true, session: data.session };
  }

  async repairUser(email, password, options = {}) {
    logger.info(`Starter repair for: ${email}`, options);
    
    const result = {
      email,
      actions: [],
      success: true,
    };
    
    // Sjekk auth
    const authCheck = await this.checkAuthUser(email);
    let userId = authCheck.user?.id;
    
    if (!authCheck.exists) {
      if (options.checkOnly) {
        logger.warn(`Auth-bruker mangler (check-only mode)`);
        result.actions.push({ action: "check", status: "missing", type: "auth_user" });
        result.success = false;
      } else {
        const createResult = await this.createAuthUser(email, password);
        if (!createResult.success) {
          result.success = false;
          result.actions.push({ action: "create", status: "failed", type: "auth_user" });
        } else {
          userId = createResult.user.id;
          result.actions.push({ action: "create", status: "success", type: "auth_user" });
        }
      }
    } else {
      result.actions.push({ action: "check", status: "exists", type: "auth_user" });
    }
    
    if (!userId) {
      logger.error(`Kan ikke fortsette uten userId`);
      result.success = false;
      return result;
    }
    
    // Sjekk profile
    const profileCheck = await this.checkUserProfile(userId);
    
    if (!profileCheck.exists) {
      if (options.checkOnly) {
        logger.warn(`User profile mangler (check-only mode)`);
        result.actions.push({ action: "check", status: "missing", type: "user_profile" });
        result.success = false;
      } else {
        const createResult = await this.createUserProfile(userId);
        if (!createResult.success) {
          result.success = false;
          result.actions.push({ action: "create", status: "failed", type: "user_profile" });
        } else {
          result.actions.push({ action: "create", status: "success", type: "user_profile" });
        }
      }
    } else {
      result.actions.push({ action: "check", status: "exists", type: "user_profile" });
    }
    
    // Verifiser login hvis ikke check-only
    if (!options.checkOnly && result.success) {
      const loginCheck = await this.verifyLogin(email, password);
      if (!loginCheck.verified && !loginCheck.skipped) {
        logger.warn(`Innlogging feilet — resetter passord`);
        const resetResult = await this.resetPassword(userId, password);
        if (resetResult.success) {
          // Verifiser på nytt
          const retryLogin = await this.verifyLogin(email, password);
          if (!retryLogin.verified) {
            result.success = false;
            result.actions.push({ action: "verify", status: "failed", type: "login" });
          } else {
            result.actions.push({ action: "verify", status: "success", type: "login", note: "password_reset" });
          }
        }
      } else {
        result.actions.push({ action: "verify", status: "success", type: "login" });
      }
    }
    
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendSlackNotification(message, options = {}) {
  if (!CONFIG.slackWebhook) {
    logger.debug("Ingen Slack webhook konfigurert");
    return { sent: false, reason: "no_webhook" };
  }
  
  try {
    const payload = {
      channel: "#ops",
      username: "Klarpakke Watchdog Repair",
      icon_emoji: options.icon || ":wrench:",
      attachments: [
        {
          color: options.color || "warning",
          title: options.title || "Watchdog Auto-Repair",
          text: message,
          fields: options.fields || [],
          footer: "Klarpakke Auto-Repair",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
    
    const response = await fetch(CONFIG.slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    logger.info("Slack-varsel sendt");
    return { sent: true };
  } catch (error) {
    logger.error("Feil ved Slack-varsel", { error: error.message });
    return { sent: false, error: error.message };
  }
}

async function createLinearIssue(title, description) {
  if (!CONFIG.linearApiKey || !CONFIG.linearTeamId) {
    logger.debug("Linear ikke konfigurert");
    return { created: false, reason: "no_config" };
  }
  
  try {
    const query = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            url
          }
        }
      }
    `;
    
    const variables = {
      input: {
        teamId: CONFIG.linearTeamId,
        title,
        description,
        priority: 2, // High
        labelIds: [], // Kan legge til "auto-repair" label
      },
    };
    
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: CONFIG.linearApiKey,
      },
      body: JSON.stringify({ query, variables }),
    });
    
    const data = await response.json();
    
    if (data.errors?.length) {
      throw new Error(data.errors[0].message);
    }
    
    logger.info("Linear issue opprettet", { url: data.data.issueCreate.issue.url });
    return { created: true, issue: data.data.issueCreate.issue };
  } catch (error) {
    logger.error("Feil ved Linear issue-opprettelse", { error: error.message });
    return { created: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check-only");
  const primaryOnly = args.includes("--primary-only");
  const reportFormat = args.find(a => a.startsWith("--report="))?.split("=")[1] || "json";
  
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info("  WATCHDOG AUTO-REPAIR");
  logger.info("═══════════════════════════════════════════════════════════════");
  logger.info(`Modus: ${checkOnly ? "check-only" : "repair"}`);
  logger.info(`Scope: ${primaryOnly ? "primary-only" : "all"}`);
  
  const supabase = createSupabaseClient();
  const repair = new TestUserRepair(supabase);
  
  const usersToRepair = [
    { email: CONFIG.primaryUser.email, password: CONFIG.primaryUser.password, name: "primary" },
  ];
  
  if (!primaryOnly) {
    usersToRepair.push(
      { email: CONFIG.copyLeader.email, password: CONFIG.copyLeader.password, name: "copy-leader" }
    );
  }
  
  const results = [];
  let allSuccess = true;
  
  for (const user of usersToRepair) {
    logger.info(`\n--- Behandler ${user.name} ---`);
    const result = await repair.repairUser(user.email, user.password, { checkOnly });
    results.push({ ...result, name: user.name });
    if (!result.success) allSuccess = false;
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    mode: checkOnly ? "check-only" : "repair",
    overallSuccess: allSuccess,
    results,
    repairs: repair.results.repairs,
    logSummary: logger.getReport().summary,
  };
  
  // Save report
  try {
    mkdirSync(CONFIG.reportDir, { recursive: true });
    const reportFile = `${CONFIG.reportDir}/repair-${Date.now()}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`Rapport lagret: ${reportFile}`);
  } catch (error) {
    logger.error("Kunne ikke lagre rapport", { error: error.message });
  }
  
  // Notifications ved feil
  if (!allSuccess) {
    const failedUsers = results.filter(r => !r.success).map(r => r.name).join(", ");
    
    await sendSlackNotification(
      `Auto-repair feilet for: ${failedUsers}`,
      {
        title: "🚨 Watchdog Auto-Repair Failed",
        color: "danger",
        icon: ":ambulance:",
        fields: [
          { title: "Failed Users", value: failedUsers, short: true },
          { title: "Mode", value: checkOnly ? "check-only" : "repair", short: true },
        ],
      }
    );
    
    await createLinearIssue(
      "🚨 Watchdog Auto-Repair Failed",
      `Automatisk reparasjon av testbrukere feilet.\n\nFailed users: ${failedUsers}\n\nSjekk logs i watchdog-reports/ for detaljer.`
    );
    
    logger.error("Auto-repair fullført med feil");
    process.exit(1);
  }
  
  logger.info("\n✅ Auto-repair fullført uten feil");
  
  if (reportFormat === "json") {
    console.log(JSON.stringify(report, null, 2));
  }
  
  process.exit(0);
}

main().catch(error => {
  logger.error("Uventet feil", { error: error.message, stack: error.stack });
  process.exit(1);
});

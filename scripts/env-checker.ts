#!/usr/bin/env ts-node
/**
 * Environment Variable Checker & Generator
 * 
 * Validates all required production environment variables
 * and generates .env.prod.example
 * 
 * Loads .env and .env.local so the script works in local development
 * without requiring variables to be exported to process.env first.
 * In CI/production, variables in process.env take precedence.
 * 
 * Usage:
 *   npx ts-node scripts/env-checker.ts
 *   npx ts-node scripts/env-checker.ts --generate
 *   npx ts-node scripts/env-checker.ts --strict
 *   npm run env:validate
 */

import * as fs from "fs";
import * as path from "path";

// ANSI colors
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example: string;
  validate?: (value: string) => boolean;
  fallback?: string;
}

interface CheckResult {
  name: string;
  present: boolean;
  valid: boolean;
  message?: string;
}

function loadEnvFile(filePath: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return parsed;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!key) continue;
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
    parsed[key] = value;
  }

  return parsed;
}

/** Load .env files into process.env, but never override existing env vars (CI/prod wins). */
function loadEnvIntoProcess(): void {
  const envFiles = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), ".env.local"),
  ];

  for (const filePath of envFiles) {
    const parsed = loadEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined && value !== undefined) {
        process.env[key] = value;
      }
    }
  }
}

// Production environment variables specification
const PROD_ENV_VARS: EnvVar[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase project URL",
    example: "https://vuxbjlykgmzskxbclquf.supabase.co",
    validate: (v) => v.startsWith("https://") && v.includes(".supabase.co"),
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase anonymous/public API key",
    example: "eyJhbGciOiJIUzI1NiIs...",
    validate: (v) => v.startsWith("eyJ") && v.length > 50,
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase service role key (server-side only)",
    example: "eyJhbGciOiJIUzI1NiIs...",
    validate: (v) => v.startsWith("eyJ") && v.length > 50,
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    required: true,
    description: "Production application URL",
    example: "https://www.klarpakke.no",
    validate: (v) => v.startsWith("https://") && !v.endsWith("/"),
  },
  {
    name: "POSTGRES_URL",
    required: true,
    description: "Supabase Postgres connection string (pooler). Falls back to DATABASE_URL if not set.",
    example: "postgresql://postgres.[project]:[password]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres",
    validate: (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
    fallback: "DATABASE_URL",
  },
  {
    name: "DATABASE_URL",
    required: false,
    description: "Fallback Postgres connection string (used when POSTGRES_URL is unset)",
    example: "postgresql://postgres.[project]:[password]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres",
    validate: (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
  },
  {
    name: "UPSTASH_REDIS_REST_URL",
    required: false,
    description: "Upstash Redis REST URL (legacy alias: KV_REST_API_URL)",
    example: "https://eu1-abc-123.upstash.io",
    validate: (v) => v.startsWith("https://") && v.includes(".upstash.io"),
  },
  {
    name: "UPSTASH_REDIS_REST_TOKEN",
    required: false,
    description: "Upstash Redis REST token (legacy alias: KV_REST_API_TOKEN)",
    example: "AYPdASQg...",
    validate: (v) => v.length > 20,
  },
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    description: "Sentry DSN for error tracking",
    example: "https://xxx@xxx.ingest.sentry.io/xxx",
    validate: (v) => v.includes(".ingest.sentry.io"),
  },
  {
    name: "SENTRY_AUTH_TOKEN",
    required: false,
    description: "Sentry auth token for releases",
    example: "sntrys_xxx",
    validate: (v) => v.startsWith("sntrys_"),
  },
  {
    name: "SLACK_DEPLOY_WEBHOOK",
    required: false,
    description: "Slack webhook for deployment notifications",
    example: "https://hooks.slack.com/services/xxx/xxx/xxx",
    validate: (v) => v.startsWith("https://hooks.slack.com/"),
  },
  {
    name: "CRON_SECRET",
    required: false,
    description: "Secret for cron job authentication",
    example: "random-secret-string-32-chars",
    validate: (v) => v.length >= 32,
  },
];

function log(message: string, level: "info" | "success" | "warning" | "error" = "info") {
  const colors = {
    info: BLUE,
    success: GREEN,
    warning: YELLOW,
    error: RED,
  };
  const prefix = level === "success" ? "✅ " : level === "error" ? "❌ " : level === "warning" ? "⚠️  " : "ℹ️ ";
  console.log(`${colors[level]}${prefix}${message}${RESET}`);
}

function maskValue(value: string): string {
  if (value.length > 10) {
    return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
  }
  return "***";
}

function checkEnvVar(envVar: EnvVar): CheckResult {
  let value = process.env[envVar.name];
  let usedFallback = false;
  
  if (!value && envVar.fallback) {
    value = process.env[envVar.fallback];
    usedFallback = Boolean(value);
  }
  
  if (!value) {
    return {
      name: envVar.name,
      present: false,
      valid: !envVar.required,
      message: envVar.required ? "Missing required variable" : "Optional - not set",
    };
  }
  
  const masked = maskValue(value);
  const fallbackNote = usedFallback ? ` (resolved from ${envVar.fallback})` : "";
  
  if (envVar.validate) {
    const valid = envVar.validate(value);
    return {
      name: envVar.name,
      present: true,
      valid,
      message: valid ? `Valid (${masked})${fallbackNote}` : `Invalid format (${masked})${fallbackNote}`,
    };
  }
  
  return {
    name: envVar.name,
    present: true,
    valid: true,
    message: `Set (${masked})${fallbackNote}`,
  };
}

function validateAll(strict: boolean): { results: CheckResult[]; passed: boolean } {
  log("Checking production environment variables...", "info");
  
  const results: CheckResult[] = [];
  let allPassed = true;
  
  for (const envVar of PROD_ENV_VARS) {
    const result = checkEnvVar(envVar);
    results.push(result);
    
    const level = !result.present && envVar.required 
      ? "error" 
      : !result.valid 
        ? "warning" 
        : "success";
    
    if (level === "error") allPassed = false;
    if (strict && level === "warning") allPassed = false;
    
    log(`${envVar.name}: ${result.message}`, level);
    
    if (!result.present && envVar.required) {
      console.log(`   ${YELLOW}Description: ${envVar.description}${RESET}`);
      console.log(`   ${YELLOW}Example: ${envVar.example}${RESET}`);
    }
  }
  
  return { results, passed: allPassed };
}

function generateEnvExample(): string {
  const lines: string[] = [
    "# Klarpakke Production Environment Variables",
    "# Generated by scripts/env-checker.ts",
    "# Copy to .env.production and fill in real values",
    "",
    "# ============================================",
    "# REQUIRED - Application will fail without these",
    "# ============================================",
    "",
  ];
  
  for (const envVar of PROD_ENV_VARS.filter(v => v.required)) {
    lines.push(`# ${envVar.description}`);
    lines.push(`${envVar.name}=${envVar.example}`);
    lines.push("");
  }
  
  lines.push("# ============================================");
  lines.push("# OPTIONAL - Enhanced functionality");
  lines.push("# ============================================");
  lines.push("");
  
  for (const envVar of PROD_ENV_VARS.filter(v => !v.required)) {
    lines.push(`# ${envVar.description}`);
    lines.push(`# ${envVar.name}=${envVar.example}`);
    lines.push("");
  }
  
  return lines.join("\n");
}

function generateJsonConfig(): string {
  const config = {
    version: "1.1.0",
    generated_at: new Date().toISOString(),
    variables: PROD_ENV_VARS.map(v => ({
      name: v.name,
      required: v.required,
      description: v.description,
    })),
  };
  return JSON.stringify(config, null, 2);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const generate = args.includes("--generate");
  const strict = args.includes("--strict");
  const json = args.includes("--json");
  
  // Load local .env files without overriding process.env (CI/prod wins).
  loadEnvIntoProcess();
  
  console.log(`
${BOLD}${BLUE}
╔══════════════════════════════════════════════════════════════╗
║         KLARPAKKE ENVIRONMENT CHECKER v1.1                   ║
╚══════════════════════════════════════════════════════════════╝
${RESET}
Mode: ${strict ? "STRICT" : "NORMAL"}
`);

  if (generate) {
    const example = generateEnvExample();
    const outputPath = path.join(process.cwd(), ".env.prod.example");
    fs.writeFileSync(outputPath, example);
    log(`Generated ${outputPath}`, "success");
    
    // Also generate JSON config
    const jsonConfig = generateJsonConfig();
    const jsonPath = path.join(process.cwd(), "env-config.json");
    fs.writeFileSync(jsonPath, jsonConfig);
    log(`Generated ${jsonPath}`, "success");
    
    console.log("\nExample content:");
    console.log(example);
    return;
  }
  
  const { results, passed } = validateAll(strict);
  
  if (json) {
    console.log(JSON.stringify({ 
      timestamp: new Date().toISOString(),
      passed, 
      results 
    }, null, 2));
    process.exit(passed ? 0 : 1);
  }
  
  // Summary
  const total = results.length;
  const present = results.filter(r => r.present).length;
  const valid = results.filter(r => r.valid).length;
  const requiredMissing = results.filter(r => !r.present && PROD_ENV_VARS.find(v => v.name === r.name)?.required).length;
  
  console.log(`
${BOLD}${passed ? GREEN : RED}
╔══════════════════════════════════════════════════════════════╗
║                    VALIDATION SUMMARY                        ║
╚══════════════════════════════════════════════════════════════╝
${RESET}
Total variables: ${total}
Present: ${present}/${total}
Valid: ${valid}/${total}
Required missing: ${requiredMissing}
Status: ${passed ? `${GREEN}PASSED` : `${RED}FAILED`}${RESET}
`);
  
  if (!passed) {
    log("Run with --generate to create .env.prod.example", "info");
    process.exit(1);
  }
  
  log("All environment variables valid!", "success");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

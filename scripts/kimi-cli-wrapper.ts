#!/usr/bin/env node
/**
 * KIMI CLI Wrapper - Korrekt MCP-til-CLI mapping
 * 
 * Dette wrapperen:
 * 1. Mapper MCP-operasjoner til eksplisitte CLI-kommandoer
 * 2. Sender ALDRI beskrivende norsk tekst som kommando
 * 3. Validerer input før exec
 * 4. Returnerer strukturert output per steg
 * 5. Fail-fast med tydelig feil hvis kommando mangler
 * 
 * @version 1.0.0
 */

import { spawn, execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ============================================================================
// KOMMANDO-MAP: MCP-operasjon -> CLI-kommando
// ============================================================================

export interface CommandMapping {
  command: string;
  args: string[];
  description: string;
  timeout: number;
}

export interface CommandResult {
  success: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  steps: StepResult[];
  error?: string;
}

export interface StepResult {
  name: string;
  status: "ok" | "error" | "skipped";
  output?: string;
  error?: string;
  duration?: number;
}

// Map: MCP-verktøy -> CLI-kommando
const COMMAND_MAP: Record<string, Record<string, CommandMapping>> = {
  db: {
    status: {
      command: "npm",
      args: ["run", "db:status"],
      description: "Sjekk DB migrasjonsstatus",
      timeout: 30000,
    },
    push: {
      command: "npm",
      args: ["run", "db:push"],
      description: "Push DB endringer",
      timeout: 60000,
    },
    "gen-types": {
      command: "npm",
      args: ["run", "db:gen-types"],
      description: "Generer TypeScript typer fra DB",
      timeout: 60000,
    },
    migrate: {
      command: "npm",
      args: ["run", "db:migrate"],
      description: "Kjør migrasjoner",
      timeout: 60000,
    },
    lint: {
      command: "npm",
      args: ["run", "db:lint"],
      description: "Valider DB skjema",
      timeout: 30000,
    },
  },
  ci: {
    default: {
      command: "npm",
      args: ["run", "lint:gate"],
      description: "Kjør lint (gate-tolerant)",
      timeout: 120000,
    },
    typecheck: {
      command: "npm",
      args: ["run", "type-check"],
      description: "Kjør TypeScript sjekk",
      timeout: 120000,
    },
    test: {
      command: "npm",
      args: ["run", "test:unit"],
      description: "Kjør unit-tester",
      timeout: 180000,
    },
    build: {
      command: "npm",
      args: ["run", "build"],
      description: "Bygg prosjekt",
      timeout: 300000,
    },
  },
  monitor: {
    full: {
      command: "npm",
      args: ["run", "health:full"],
      description: "Full system health check",
      timeout: 60000,
    },
    prod: {
      command: "npm",
      args: ["run", "verify:prod"],
      description: "Verifiser produksjonsmiljø",
      timeout: 60000,
    },
    api: {
      command: "npm",
      args: ["run", "health:api"],
      description: "Sjekk API health",
      timeout: 30000,
    },
    supabase: {
      command: "npm",
      args: ["run", "supabase:health"],
      description: "Sjekk Supabase health",
      timeout: 30000,
    },
    signals: {
      command: "npm",
      args: ["run", "signals:health"],
      description: "Sjekk signal-pipeline",
      timeout: 30000,
    },
    trading: {
      command: "npm",
      args: ["run", "trading:health"],
      description: "Sjekk trading-system",
      timeout: 30000,
    },
  },
  deploy: {
    preview: {
      command: "npm",
      args: ["run", "deploy:preview"],
      description: "Deploy til Vercel preview",
      timeout: 300000,
    },
    prod: {
      command: "npm",
      args: ["run", "deploy:prod"],
      description: "Deploy til produksjon",
      timeout: 300000,
    },
  },
};

// ============================================================================
// INPUT-VALIDERING
// ============================================================================

export function validateCommand(tool: string, action: string): { valid: boolean; error?: string } {
  if (!tool || typeof tool !== "string") {
    return { valid: false, error: `Ugyldig tool: ${tool}. Forventet: string` };
  }

  const toolMap = COMMAND_MAP[tool];
  if (!toolMap) {
    const available = Object.keys(COMMAND_MAP).join(", ");
    return { valid: false, error: `Ukjent tool: ${tool}. Tilgjengelige: ${available}` };
  }

  const actualAction = action || "default";
  const mapping = toolMap[actualAction];
  if (!mapping) {
    const available = Object.keys(toolMap).join(", ");
    return { 
      valid: false, 
      error: `Ukjent action: ${actualAction} for tool ${tool}. Tilgjengelige: ${available}` 
    };
  }

  return { valid: true };
}

// ============================================================================
// KOMMANDO-EKSEKVERING
// ============================================================================

export function executeCommand(
  tool: string,
  action: string = "default",
  env: Record<string, string> = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const steps: StepResult[] = [];

    // Step 1: Input-validering
    const validation = validateCommand(tool, action);
    if (!validation.valid) {
      steps.push({
        name: "input-validation",
        status: "error",
        error: validation.error,
      });
      return resolve({
        success: false,
        command: `${tool} ${action}`,
        stdout: "",
        stderr: "",
        exitCode: null,
        duration: Date.now() - startTime,
        steps,
        error: validation.error,
      });
    }
    steps.push({ name: "input-validation", status: "ok" });

    // Step 2: Hent kommando-mapping
    const toolMap = COMMAND_MAP[tool];
    const mapping = toolMap[action || "default"] || toolMap["default"];
    
    if (!mapping) {
      const error = `Intern feil: Mapping ikke funnet for ${tool} ${action}`;
      steps.push({ name: "resolve-mapping", status: "error", error });
      return resolve({
        success: false,
        command: `${tool} ${action}`,
        stdout: "",
        stderr: "",
        exitCode: null,
        duration: Date.now() - startTime,
        steps,
        error,
      });
    }
    steps.push({ name: "resolve-mapping", status: "ok" });

    // Step 3: Bygg kommando
    const cmdStr = `${mapping.command} ${mapping.args.join(" ")}`;
    steps.push({ name: "build-command", status: "ok", output: cmdStr });

    // Step 4: Eksekver
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = spawn(mapping.command, mapping.args, {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: "0", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      stderr += "\n[TIMEOUT] Kommandoen tok for lang tid";
    }, mapping.timeout);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const success = code === 0;

      steps.push({
        name: "execute",
        status: success ? "ok" : "error",
        duration: duration - (steps[2]?.duration || 0),
      });

      resolve({
        success,
        command: cmdStr,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code,
        duration,
        steps,
        error: success ? undefined : `Exit code ${code}`,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      steps.push({
        name: "execute",
        status: "error",
        error: err.message,
      });

      resolve({
        success: false,
        command: cmdStr,
        stdout,
        stderr,
        exitCode: null,
        duration,
        steps,
        error: `Kunne ikke starte kommando: ${err.message}`,
      });
    });
  });
}

// ============================================================================
// SLACK WEBHOOK
// ============================================================================

export async function sendSlackNotification(
  status: "success" | "failure" | "started",
  command: string,
  details?: { url?: string; duration?: number; error?: string }
): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_DEPLOY_WEBHOOK;
  if (!slackWebhookUrl) {
    console.error("[Slack] SLACK_DEPLOY_WEBHOOK ikke satt");
    return;
  }

  const emoji = status === "success" ? "✅" : status === "failure" ? "❌" : "🚀";
  const color = status === "success" ? "#36a64f" : status === "failure" ? "#ff0000" : "#0052FF";
  
  const payload = {
    username: "Klarpakke Deploy",
    icon_emoji: ":klarpakke:",
    attachments: [{
      color,
      title: `${emoji} Deploy ${status.toUpperCase()}: ${command}`,
      fields: [
        { title: "Miljø", value: command.includes("prod") ? "Produksjon" : "Preview", short: true },
        { title: "Status", value: status, short: true },
        ...(details?.url ? [{ title: "URL", value: details.url, short: false }] : []),
        ...(details?.duration ? [{ title: "Varighet", value: `${details.duration}ms`, short: true }] : []),
        ...(details?.error ? [{ title: "Feil", value: details.error, short: false }] : []),
      ],
      footer: "Klarpakke CI/CD",
      ts: Math.floor(Date.now() / 1000),
    }],
  };

  try {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("[Slack] Kunne ikke sende varsling:", response.statusText);
    }
  } catch (err) {
    console.error("[Slack] Feil ved sending:", err);
  }
}

// ============================================================================
// HJELPEFUNKSJONER
// ============================================================================

export function getAvailableCommands(): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(COMMAND_MAP).map(([tool, actions]) => [tool, Object.keys(actions)])
  );
}

export function getCommandHelp(tool?: string): string {
  if (tool && COMMAND_MAP[tool]) {
    const actions = COMMAND_MAP[tool];
    return `${tool} commands:\n` +
      Object.entries(actions)
        .map(([action, mapping]) => `  ${action}: ${mapping.description} (${mapping.command} ${mapping.args.join(" ")})`)
        .join("\n");
  }

  return "Tilgjengelige tools:\n" +
    Object.entries(COMMAND_MAP)
      .map(([tool, actions]) => `  ${tool}: ${Object.keys(actions).join(", ")}`)
      .join("\n");
}

// ============================================================================
// CLI-ENTRYPOINT (for testing)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tool, action] = process.argv.slice(2);

  if (!tool || tool === "--help" || tool === "-h") {
    console.log(getCommandHelp(action));
    process.exit(0);
  }

  if (tool === "--list") {
    console.log(JSON.stringify(getAvailableCommands(), null, 2));
    process.exit(0);
  }

  executeCommand(tool, action).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}

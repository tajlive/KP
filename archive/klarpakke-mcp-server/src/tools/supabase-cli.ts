/**
 * Supabase CLI Tools
 * Execute Supabase CLI commands via MCP
 */

import { exec } from "https://deno.land/std@0.177.0/node/child_process.ts";
import type { ToolOutput } from "../types.ts";

const PROJECT_REF = "vuxbjlykgmzskxbclquf";

// Execute shell command
function execCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: "/Users/taj/klarpakke" }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(typeof stdout === 'string' ? stdout : stdout?.toString() || "");
      }
    });
  });
}

export async function runSupabaseCommand(args: {
  command: string;
  description?: string;
}): Promise<ToolOutput> {
  try {
    const result = await execCommand(args.command);
    
    return {
      content: [{
        type: "text",
        text: `✅ Command: ${args.description || args.command}\n\n${result}`,
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: "text",
        text: `❌ Error running: ${args.command}\n\n${err}`,
      }],
      isError: true,
    };
  }
}

export async function listSupabaseSecrets(): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase secrets list --project-ref ${PROJECT_REF}`,
    description: "List all Supabase secrets",
  });
}

export async function setSupabaseSecret(args: {
  name: string;
  value: string;
}): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase secrets set ${args.name}=${args.value} --project-ref ${PROJECT_REF}`,
    description: `Set secret: ${args.name}`,
  });
}

export async function listEdgeFunctionsCLI(): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase functions list --project-ref ${PROJECT_REF}`,
    description: "List all Edge Functions",
  });
}

export async function deployEdgeFunctionCLI(args: {
  function_name: string;
}): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase functions deploy ${args.function_name} --project-ref ${PROJECT_REF}`,
    description: `Deploy function: ${args.function_name}`,
  });
}

export async function getFunctionLogsCLI(args: {
  function_name: string;
  lines?: number;
}): Promise<ToolOutput> {
  const lines = args.lines || 50;
  return runSupabaseCommand({
    command: `supabase functions logs ${args.function_name} --project-ref ${PROJECT_REF} --tail ${lines}`,
    description: `Get logs for ${args.function_name}`,
  });
}

export async function testAPIEndpoint(): Promise<ToolOutput> {
  try {
    const response = await fetch(
      `https://${PROJECT_REF}.functions.supabase.co/api-gateway/health`,
      {
        headers: { "Authorization": "Bearer klarpakke-dev-token" },
      }
    );
    
    const body = await response.text();
    
    return {
      content: [{
        type: "text",
        text: `Status: ${response.status}\n\nResponse:\n${body}`,
      }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function deployAllFunctions(): Promise<ToolOutput> {
  const functions = [
    "api-gateway",
    "moonshot-chat",
    "taj-trade-engine",
    "taj-position-checker",
    "auto-trading-executor",
  ];
  
  const results = [];
  
  for (const fn of functions) {
    try {
      await execCommand(`supabase functions deploy ${fn} --project-ref ${PROJECT_REF}`);
      results.push(`✅ ${fn}`);
    } catch (err) {
      results.push(`❌ ${fn}: ${err}`);
    }
  }
  
  return {
    content: [{
      type: "text",
      text: `Deploy Results:\n\n${results.join("\n")}`,
    }],
  };
}

// === MIGRATION TOOLS ===

export async function listMigrations(): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase migration list --project-ref ${PROJECT_REF}`,
    description: "List all database migrations",
  });
}

export async function repairMigration(args: {
  version: string;
  status: "applied" | "reverted";
}): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase migration repair --status ${args.status} ${args.version} --project-ref ${PROJECT_REF}`,
    description: `Repair migration ${args.version} to status: ${args.status}`,
  });
}

export async function pushMigrations(): Promise<ToolOutput> {
  return runSupabaseCommand({
    command: `supabase db push --project-ref ${PROJECT_REF}`,
    description: "Push pending migrations to database",
  });
}

export async function checkMigrationStatus(): Promise<ToolOutput> {
  try {
    const list = await execCommand(`supabase migration list --project-ref ${PROJECT_REF}`);
    
    // Parse to find issues
    const lines = list.split('\n');
    const issues = [];
    
    for (const line of lines) {
      if (line.includes('│') && (line.includes('pending') || line.includes('failed'))) {
        issues.push(line.trim());
      }
    }
    
    if (issues.length > 0) {
      return {
        content: [{
          type: "text",
          text: `⚠️ Migration Issues Found:\n\n${issues.join('\n')}\n\nUse repair_migration to fix.`,
        }],
      };
    }
    
    return {
      content: [{
        type: "text",
        text: `✅ All migrations OK!\n\n${list.slice(0, 500)}`,
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `❌ Error: ${err}` }],
      isError: true,
    };
  }
}

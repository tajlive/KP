/**
 * Advanced Migration Tools - 100% Automated
 * Kjører SQL via migrations-runner Edge Function
 */

import type { ToolOutput } from "../types.ts";

const PROJECT_REF = "vuxbjlykgmzskxbclquf";
const ADMIN_TOKEN = "klarpakke-dev-token";

async function runMigrationSQL(sql: string, description: string): Promise<ToolOutput> {
  try {
    const response = await fetch(
      `https://${PROJECT_REF}.functions.supabase.co/migrations-runner`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql,
          token: ADMIN_TOKEN,
          description,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      return {
        content: [{
          type: "text",
          text: `✅ ${description}\nDuration: ${data.duration}\nResult: ${JSON.stringify(data.result, null, 2)}`,
        }],
      };
    } else {
      return {
        content: [{ type: "text", text: `❌ ${description}\nError: ${data.error}` }],
        isError: true,
      };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ ${description}\nError: ${error}` }],
      isError: true,
    };
  }
}

export async function enableRLSOnTable(args: {
  table_name: string;
}): Promise<ToolOutput> {
  const sql = `ALTER TABLE IF EXISTS public.${args.table_name} ENABLE ROW LEVEL SECURITY;`;
  return runMigrationSQL(sql, `Enable RLS on ${args.table_name}`);
}

export async function createRLSPolicy(args: {
  table_name: string;
  policy_name: string;
  action: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  using?: string;
  with_check?: string;
}): Promise<ToolOutput> {
  let sql = `CREATE POLICY IF NOT EXISTS "${args.policy_name}" ON public.${args.table_name} FOR ${args.action}`;
  
  if (args.using) {
    sql += ` USING (${args.using})`;
  }
  if (args.with_check) {
    sql += ` WITH CHECK (${args.with_check})`;
  }
  sql += ";";
  
  return runMigrationSQL(sql, `Create policy ${args.policy_name} on ${args.table_name}`);
}

export async function runCustomSQL(args: {
  sql: string;
  description: string;
}): Promise<ToolOutput> {
  return runMigrationSQL(args.sql, args.description);
}

export async function deployAllPendingMigrations(): Promise<ToolOutput> {
  // Liste over alle migrasjoner som må kjøres
  const migrations = [
    {
      name: "exec_sql function",
      sql_file: "20260215000006_exec_sql_function.sql",
    },
  ];
  
  const results = [];
  
  for (const migration of migrations) {
    try {
      // Les SQL fra fil
      const response = await fetch(
        `https://raw.githubusercontent.com/tomarnejensen/klarpakke/main/supabase/migrations/${migration.sql_file}`
      );
      const sql = await response.text();
      
      const result = await runMigrationSQL(sql, migration.name);
      results.push(`✅ ${migration.name}: ${result.isError ? 'FAILED' : 'OK'}`);
    } catch (err) {
      results.push(`❌ ${migration.name}: ${err}`);
    }
  }
  
  return {
    content: [{
      type: "text",
      text: `Migration Results:\n\n${results.join("\n")}`,
    }],
  };
}

export async function checkDatabaseHealth(): Promise<ToolOutput> {
  const checks = [
    "SELECT count(*) as tables FROM information_schema.tables WHERE table_schema = 'public';",
    "SELECT count(*) as rls_enabled FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;",
    "SELECT count(*) as policies FROM pg_policies WHERE schemaname = 'public';",
  ];
  
  const results = [];
  
  for (const sql of checks) {
    const result = await runMigrationSQL(sql, "Health check");
    results.push(result.content[0]?.text || "No result");
  }
  
  return {
    content: [{
      type: "text",
      text: `Database Health:\n\n${results.join("\n\n")}`,
    }],
  };
}

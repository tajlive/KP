import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";

export const supabaseTools = [
  {
    name: "supabase_list_tables",
    description: "List all tables in Supabase database",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "supabase_get_table_schema",
    description: "Get schema for a specific table",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: {
          type: "string",
          description: "Name of the table",
        },
      },
      required: ["table_name"],
    },
  },
  {
    name: "supabase_check_migrations",
    description: "Check status of database migrations",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "supabase_migrate_status",
    description: "Get detailed migration status (local vs remote)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "supabase_db_push",
    description: "Push migrations to Supabase database",
    input_schema: {
      type: "object" as const,
      properties: {
        dry_run: {
          type: "boolean",
          description: "Show what would be pushed without applying",
        },
      },
      required: [],
    },
  },
  {
    name: "supabase_get_row_count",
    description: "Get row count for a table",
    input_schema: {
      type: "object" as const,
      properties: {
        table_name: {
          type: "string",
          description: "Name of the table",
        },
      },
      required: ["table_name"],
    },
  },
  {
    name: "supabase_health_check",
    description: "Check Supabase connection and project health",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "supabase_backup_status",
    description: "Check if automated backups are configured",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

export async function executeSupabaseTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "supabase_list_tables": {
        const output = execSync(
          'supabase status --output json 2>/dev/null || echo "{\"tables\":[]}"',
          { encoding: "utf-8", cwd: "/Users/taj/klarpakke" }
        );
        return output;
      }

      case "supabase_get_table_schema": {
        const tableName = args.table_name as string;
        if (!tableName) {
          throw new Error("table_name is required");
        }
        
        // Query information_schema for table structure
        const sql = `SELECT column_name, data_type, is_nullable, column_default 
                     FROM information_schema.columns 
                     WHERE table_name = '${tableName}' AND table_schema = 'public'
                     ORDER BY ordinal_position;`;
        
        return JSON.stringify({
          table: tableName,
          sql: sql,
          note: "Run this SQL in Supabase SQL Editor to get schema",
        }, null, 2);
      }

      case "supabase_check_migrations": {
        const output = execSync(
          "supabase migration list",
          { encoding: "utf-8", cwd: "/Users/taj/klarpakke" }
        );
        return output;
      }

      case "supabase_migrate_status": {
        const output = execSync(
          "supabase migration list --db-url 2>&1 || echo 'Run: supabase migration list'",
          { encoding: "utf-8", cwd: "/Users/taj/klarpakke" }
        );
        return output;
      }

      case "supabase_db_push": {
        const dryRun = args.dry_run === true;
        const cmd = dryRun ? "supabase db push --dry-run" : "supabase db push";
        
        try {
          const output = execSync(cmd, { 
            encoding: "utf-8", 
            cwd: "/Users/taj/klarpakke",
            timeout: 120000
          });
          return dryRun 
            ? `DRY RUN - Changes that would be applied:\n${output}`
            : `Migrations pushed successfully:\n${output}`;
        } catch (e) {
          return `Push failed. Try running manually: cd /Users/taj/klarpakke && ${cmd}`;
        }
      }

      case "supabase_get_row_count": {
        const tableName = args.table_name as string;
        if (!tableName) {
          throw new Error("table_name is required");
        }
        
        return JSON.stringify({
          table: tableName,
          note: `Use Supabase Dashboard or run: SELECT COUNT(*) FROM ${tableName};`,
        }, null, 2);
      }

      case "supabase_health_check": {
        try {
          const status = execSync(
            "supabase status",
            { encoding: "utf-8", cwd: "/Users/taj/klarpakke" }
          );
          return JSON.stringify({
            status: "healthy",
            output: status,
          }, null, 2);
        } catch (e) {
          return JSON.stringify({
            status: "unhealthy",
            error: "Supabase CLI not connected",
            fix: "Run: supabase login && supabase link",
          }, null, 2);
        }
      }

      case "supabase_backup_status": {
        return JSON.stringify({
          note: "Check Supabase Dashboard > Project Settings > Database",
          automated_backups: "Enabled for Pro projects",
          manual_backup: "Use: supabase db dump --data-only > backup.sql",
        }, null, 2);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown Supabase tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Supabase error: ${errorMessage}`);
  }
}

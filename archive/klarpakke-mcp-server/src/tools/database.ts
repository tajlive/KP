/**
 * Database Tools - Direct SQL and maintenance
 */

import {
  executeQuery,
  getSupabase,
  validateQuery,
} from "../clients/supabase.ts";
import type { ToolOutput } from "../types.ts";

export async function runSQLQuery(args: {
  query: string;
  read_only?: boolean;
}): Promise<ToolOutput> {
  try {
    // Validate query
    const validation = validateQuery(args.query, args.read_only ?? true);
    if (!validation.valid) {
      return {
        content: [
          { type: "text", text: `❌ Query rejected: ${validation.error}` },
        ],
        isError: true,
      };
    }

    // For write operations, require confirmation
    const writeKeywords = ["INSERT", "UPDATE", "DELETE"];
    const isWrite = writeKeywords.some((kw) =>
      args.query.toUpperCase().includes(kw),
    );

    if (isWrite && args.read_only !== false) {
      return {
        content: [
          {
            type: "text",
            text: `⚠️ Write operation detected!

Query: ${args.query.slice(0, 100)}${args.query.length > 100 ? "..." : ""}

To execute write operations, set read_only: false`,
          },
        ],
        isError: true,
      };
    }

    // Execute query
    const result = await executeQuery(args.query, [], {
      readOnly: args.read_only ?? true,
    });

    if (result.error) {
      return {
        content: [{ type: "text", text: `❌ Query error: ${result.error}` }],
        isError: true,
      };
    }

    // Format results
    const rows = result.data || [];
    const rowCount = rows.length;

    if (rowCount === 0) {
      return {
        content: [
          { type: "text", text: "✅ Query executed. No rows returned." },
        ],
      };
    }

    // Get column names from first row
    const columns = Object.keys(rows[0]);

    // Format as table (limited to first 20 rows)
    const displayRows = rows.slice(0, 20);
    const maxWidths: Record<string, number> = {};

    columns.forEach((col) => {
      maxWidths[col] = Math.max(
        col.length,
        ...displayRows.map((r: any) => String(r[col] ?? "").length),
      );
    });

    const separator = columns.map((c) => "-".repeat(maxWidths[c])).join("-+-");
    const header = columns.map((c) => c.padEnd(maxWidths[c])).join(" | ");
    const data = displayRows
      .map((row: any) =>
        columns
          .map((c) =>
            String(row[c] ?? "")
              .slice(0, maxWidths[c])
              .padEnd(maxWidths[c]),
          )
          .join(" | "),
      )
      .join("\n");

    const output = `${separator}\n${header}\n${separator}\n${data}\n${separator}\n\n(${rowCount} row${rowCount !== 1 ? "s" : ""}${rowCount > 20 ? ", showing first 20" : ""})`;

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getTableStats(args: {
  table: string;
}): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    // Get row count
    const { count, error: countError } = await supabase
      .from(args.table)
      .select("*", { count: "exact", head: true });

    if (countError) {
      return {
        content: [{ type: "text", text: `❌ Table not found: ${args.table}` }],
        isError: true,
      };
    }

    // Get column info
    const { data: columns, error: colError } = await supabase.rpc(
      "get_table_columns",
      { table_name: args.table },
    );

    if (colError) {
      // Fallback: query a single row to get column names
      const { data: sample } = await supabase
        .from(args.table)
        .select("*")
        .limit(1);

      const sampleRow = sample?.[0];
      const colNames = sampleRow ? Object.keys(sampleRow) : [];

      return {
        content: [
          {
            type: "text",
            text: `📊 Table: ${args.table}

Row Count: ${count?.toLocaleString() || 0}

Columns:
${colNames.map((c) => `  - ${c}`).join("\n")}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `📊 Table: ${args.table}

Row Count: ${count?.toLocaleString() || 0}

Columns:
${(columns || []).map((c: any) => `  - ${c.column_name} (${c.data_type})${c.is_nullable === "NO" ? " [required]" : ""}`).join("\n")}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function backupDatabase(): Promise<ToolOutput> {
  try {
    // In a real implementation, this would trigger a Supabase backup
    // For now, return instructions
    return {
      content: [
        {
          type: "text",
          text: `💾 Database Backup

Supabase backups are automated daily.

For manual backup:
1. Go to: https://app.supabase.com/project/_/database/backups
2. Click "Trigger Backup"

Or use pg_dump:
\`\`\`
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
\`\`\`

Last automated backup: Check Supabase Dashboard`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function listTables(): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.rpc("get_tables");

    if (error) {
      // Fallback: list known tables
      const tables = [
        "profiles",
        "beta_signups",
        "klt_balances",
        "klt_transactions",
        "subscriptions",
        "trades",
        "courses",
        "email_campaigns",
        "mcp_audit_logs",
        "signup_funnel",
      ];

      return {
        content: [
          {
            type: "text",
            text: `📋 Database Tables\n\n${tables.map((t) => `  - ${t}`).join("\n")}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `📋 Database Tables\n\n${(data || []).map((t: any) => `  - ${t.table_name}`).join("\n")}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

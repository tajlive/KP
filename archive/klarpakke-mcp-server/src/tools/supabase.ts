/**
 * Supabase Edge Function Tools
 * Manage and deploy Edge Functions
 */

import type { ToolOutput } from "../types.ts";

// Get Supabase credentials from environment
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") || "vuxbjlykgmzskxbclquf";
const ACCESS_TOKEN = Deno.env.get("SUPABASE_ACCESS_TOKEN") || "";

export async function listEdgeFunctions(): Promise<ToolOutput> {
  try {
    if (!ACCESS_TOKEN) {
      return {
        content: [{ type: "text", text: "❌ SUPABASE_ACCESS_TOKEN not set. Run: export SUPABASE_ACCESS_TOKEN=your_token" }],
        isError: true,
      };
    }

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`,
      {
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const functions = await response.json();
    
    const list = functions.map((f: any) => 
      `• ${f.name}\n  Status: ${f.status}\n  Updated: ${new Date(f.updated_at).toLocaleString()}`
    ).join("\n\n");

    return {
      content: [{
        type: "text",
        text: `📦 Supabase Edge Functions\n\nProject: ${PROJECT_REF}\n\n${list || "No functions deployed"}`,
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

export async function deployEdgeFunction(args: {
  function_name: string;
}): Promise<ToolOutput> {
  try {
    if (!ACCESS_TOKEN) {
      return {
        content: [{ type: "text", text: "❌ SUPABASE_ACCESS_TOKEN not set" }],
        isError: true,
      };
    }

    // For now, provide instructions as we can't execute CLI commands
    return {
      content: [{
        type: "text",
        text: `🚀 Deploy Edge Function: ${args.function_name}

To deploy, run this in your terminal:

supabase functions deploy ${args.function_name} --project-ref ${PROJECT_REF}

Or use the Supabase Dashboard:
https://supabase.com/dashboard/project/${PROJECT_REF}/functions`,
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

export async function listSecrets(): Promise<ToolOutput> {
  try {
    if (!ACCESS_TOKEN) {
      return {
        content: [{ type: "text", text: "❌ SUPABASE_ACCESS_TOKEN not set. Run: export SUPABASE_ACCESS_TOKEN=your_token" }],
        isError: true,
      };
    }

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
      {
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const secrets = await response.json();
    
    const list = secrets.map((s: any) => `• ${s.name}`).join("\n");

    return {
      content: [{
        type: "text",
        text: `🔐 Supabase Secrets\n\nProject: ${PROJECT_REF}\n\n${list || "No secrets set"}\n\nTo add a secret:\nsupabase secrets set NAME=value --project-ref ${PROJECT_REF}`,
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

export async function testEdgeFunction(args: {
  function_name: string;
  path?: string;
  token?: string;
}): Promise<ToolOutput> {
  try {
    const path = args.path || "/";
    const token = args.token || "klarpakke-dev-token";
    
    // Test via direct URL (bypasses Supabase proxy)
    const url = `https://${PROJECT_REF}.functions.supabase.co/${args.function_name}${path}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const status = response.status;
    const body = await response.text();

    let emoji = "✅";
    if (status >= 400) emoji = "❌";
    else if (status >= 300) emoji = "⚠️";

    return {
      content: [{
        type: "text",
        text: `${emoji} Test Result\n\nFunction: ${args.function_name}\nURL: ${url}\nStatus: ${status}\n\nResponse:\n${body.slice(0, 500)}${body.length > 500 ? "..." : ""}`,
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

export async function getFunctionLogs(args: {
  function_name: string;
  lines?: number;
}): Promise<ToolOutput> {
  try {
    return {
      content: [{
        type: "text",
        text: `📜 Logs for ${args.function_name}\n\nView in Supabase Dashboard:\nhttps://supabase.com/dashboard/project/${PROJECT_REF}/functions/${args.function_name}/logs\n\nOr run locally:\nsupabase functions logs ${args.function_name} --project-ref ${PROJECT_REF}`,
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

export async function testSystemStatus(): Promise<ToolOutput> {
  try {
    const tests = [];
    
    // Test API Gateway
    const gatewayUrl = `https://${PROJECT_REF}.functions.supabase.co/api-gateway/health`;
    try {
      const gatewayResp = await fetch(gatewayUrl, {
        headers: { "Authorization": "Bearer klarpakke-dev-token" },
      });
      tests.push({
        name: "API Gateway",
        status: gatewayResp.ok ? "✅ OK" : "❌ Failed",
        statusCode: gatewayResp.status,
      });
    } catch {
      tests.push({ name: "API Gateway", status: "❌ Not responding" });
    }

    // Test Taj Trade Engine
    const tajUrl = `https://${PROJECT_REF}.functions.supabase.co/taj-trade-engine`;
    try {
      const tajResp = await fetch(tajUrl);
      tests.push({
        name: "Taj Trade Engine",
        status: tajResp.status === 200 || tajResp.status === 401 ? "✅ OK" : "⚠️ Check",
        statusCode: tajResp.status,
      });
    } catch {
      tests.push({ name: "Taj Trade Engine", status: "❌ Not responding" });
    }

    // Test Moonshot AI
    const moonshotUrl = `https://${PROJECT_REF}.functions.supabase.co/moonshot-chat`;
    try {
      const moonshotResp = await fetch(moonshotUrl, { method: "POST" });
      tests.push({
        name: "Moonshot AI",
        status: moonshotResp.status === 200 || moonshotResp.status === 401 ? "✅ OK" : "⚠️ Check",
        statusCode: moonshotResp.status,
      });
    } catch {
      tests.push({ name: "Moonshot AI", status: "❌ Not responding" });
    }

    const results = tests.map(t => `${t.status} ${t.name}${t.statusCode ? ` (${t.statusCode})` : ""}`).join("\n");

    return {
      content: [{
        type: "text",
        text: `🩺 System Status Check\n\n${results}\n\nProject: ${PROJECT_REF}`,
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

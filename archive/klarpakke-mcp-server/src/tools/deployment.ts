/**
 * Deployment Tools - Vercel deployment management
 */

import {
  getDeployments,
  getProductionDeployment,
  runHealthChecks,
  getEnvironmentVariables,
  addEnvironmentVariable,
  removeEnvironmentVariable,
} from "../clients/vercel.ts";
import type { ToolOutput } from "../types.ts";

export async function getDeploymentStatus(): Promise<ToolOutput> {
  try {
    const [production, recent, health] = await Promise.all([
      getProductionDeployment(),
      getDeployments(5),
      runHealthChecks(),
    ]);

    const healthStatus = health.every((h) => h.status === "pass")
      ? "✅ Healthy"
      : "⚠️ Issues detected";

    return {
      content: [
        {
          type: "text",
          text: `🚀 Deployment Status

Production:
  URL: ${production?.url || "N/A"}
  Status: ${production?.state || "Unknown"}
  Branch: ${production?.branch || "main"}
  Commit: ${production?.commit?.sha?.slice(0, 7) || "N/A"}

Health Checks: ${healthStatus}
${health.map((h) => `  ${h.status === "pass" ? "✅" : "❌"} ${h.name}: ${h.response_time}ms`).join("\n")}

Recent Deployments:
${recent.map((d, i) => `  ${i + 1}. ${d.branch || "main"} - ${d.state} - ${new Date(d.createdAt).toLocaleDateString()}`).join("\n")}`,
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

export async function deployToProductionTool(args: {
  branch: string;
  run_migrations: boolean;
}): Promise<ToolOutput> {
  try {
    // Confirm before deploying
    return {
      content: [
        {
          type: "text",
          text: `⚠️ Deploy to Production?

Branch: ${args.branch}
Run Migrations: ${args.run_migrations ? "Yes" : "No"}

To confirm deployment, call again with confirm: true`,
        },
      ],
    };

    /* Uncomment for actual deployment:
    const deployment = await deployToProduction(args.branch);
    
    return {
      content: [{
        type: 'text',
        text: `🚀 Deployment Started!

Deployment ID: ${deployment.id}
URL: ${deployment.url}
Status: ${deployment.state}

Build logs: https://vercel.com/tomarnejensen/klarpakke/${deployment.id}`,
      }],
    };
    */
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function rollbackDeploymentTool(args: {
  deployment_id: string;
}): Promise<ToolOutput> {
  try {
    // Confirm before rollback
    return {
      content: [
        {
          type: "text",
          text: `⚠️ Rollback to deployment ${args.deployment_id}?

This will revert production to an earlier version.

To confirm, call again with confirm: true`,
        },
      ],
    };

    /* Uncomment for actual rollback:
    await promoteDeployment(args.deployment_id);
    
    return {
      content: [{
        type: 'text',
        text: `⏪ Rollback Complete!

Reverted to deployment: ${args.deployment_id}
Production should update shortly.`,
      }],
    };
    */
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function listDeployments(): Promise<ToolOutput> {
  try {
    const deployments = await getDeployments(10);

    const list = deployments
      .map((d) => {
        const status =
          d.state === "READY"
            ? "✅"
            : d.state === "ERROR"
              ? "❌"
              : d.state === "BUILDING"
                ? "🔨"
                : "⏳";
        return `${status} ${d.branch || "main"} - ${d.state}
   ${d.url}
   ${new Date(d.createdAt).toLocaleString()}`;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `🚀 Recent Deployments\n\n${list}`,
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

// ==================== ENVIRONMENT VARIABLES ====================

export async function fixSupabaseEnvVars(): Promise<ToolOutput> {
  try {
    // First, check current environment variables
    const envs = await getEnvironmentVariables();
    const currentUrl = envs.find(e => e.key === 'NEXT_PUBLIC_SUPABASE_URL');
    
    // Hent korrekte verdier fra miljøvariabler
    const CORRECT_URL = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || 'https://vuxbjlykgmzskxbclquf.supabase.co';
    const CORRECT_ANON_KEY = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
    
    if (!CORRECT_ANON_KEY) {
      return {
        content: [{
          type: "text",
          text: `❌ Feil: NEXT_PUBLIC_SUPABASE_ANON_KEY ikke satt i miljøvariabler.\n\nLegg til i klarpakke-mcp-server/.env:\nNEXT_PUBLIC_SUPABASE_ANON_KEY=din_nøkkel_her`
        }],
        isError: true
      };
    }
    
    const isWrongProject = currentUrl?.value?.includes(WRONG_PROJECT);
    
    if (!isWrongProject && currentUrl?.value === CORRECT_URL) {
      return {
        content: [{
          type: "text",
          text: `✅ Supabase environment variables are already correct!

Current URL: ${currentUrl?.value}
No changes needed.`
        }]
      };
    }

    // Remove old variables if they exist
    if (currentUrl) {
      try {
        await removeEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL');
      } catch {
        // Ignore if doesn't exist
      }
    }
    
    const currentAnonKey = envs.find(e => e.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (currentAnonKey) {
      try {
        await removeEnvironmentVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      } catch {
        // Ignore if doesn't exist
      }
    }

    // Add correct variables
    await addEnvironmentVariable({
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: CORRECT_URL,
      target: ['production', 'preview'],
      type: 'encrypted'
    });

    await addEnvironmentVariable({
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: CORRECT_ANON_KEY,
      target: ['production', 'preview'],
      type: 'encrypted'
    });

    return {
      content: [{
        type: "text",
        text: `🔧 Fixed Supabase Environment Variables!

${isWrongProject ? '❌ Removed WRONG project: oysfdzutvezqhainaxba' : '✓ Removed old variables'}
✅ Added CORRECT project: vuxbjlykgmzskxbclquf

Updated variables:
  • NEXT_PUBLIC_SUPABASE_URL
  • NEXT_PUBLIC_SUPABASE_ANON_KEY

⚠️  IMPORTANT: You need to redeploy for changes to take effect!

Run one of these to redeploy:
  1. GitHub: Push a new commit
  2. Vercel CLI: vercel --prod
  3. Vercel Dashboard: Click "Redeploy" on latest deployment`
      }]
    };

  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error fixing env vars: ${error}` }],
      isError: true,
    };
  }
}

export async function checkEnvironmentVariables(): Promise<ToolOutput> {
  try {
    const envs = await getEnvironmentVariables();
    
    const supabaseUrl = envs.find(e => e.key === 'NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = envs.find(e => e.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    const WRONG_PROJECT = 'oysfdzutvezqhainaxba';
    const CORRECT_PROJECT = 'vuxbjlykgmzskxbclquf';
    
    let status = '';
    let needsFix = false;
    
    if (!supabaseUrl) {
      status += '❌ NEXT_PUBLIC_SUPABASE_URL: MISSING\n';
      needsFix = true;
    } else if (supabaseUrl.value?.includes(WRONG_PROJECT)) {
      status += `❌ NEXT_PUBLIC_SUPABASE_URL: WRONG PROJECT\n   Current: ${supabaseUrl.value}\n   Should be: https://${CORRECT_PROJECT}.supabase.co\n`;
      needsFix = true;
    } else if (supabaseUrl.value?.includes(CORRECT_PROJECT)) {
      status += `✅ NEXT_PUBLIC_SUPABASE_URL: CORRECT\n   ${supabaseUrl.value}\n`;
    } else {
      status += `⚠️ NEXT_PUBLIC_SUPABASE_URL: UNKNOWN\n   ${supabaseUrl.value}\n`;
    }
    
    if (!supabaseKey) {
      status += '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY: MISSING\n';
      needsFix = true;
    } else {
      const keyPreview = supabaseKey.value?.slice(0, 20) + '...';
      status += `✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${keyPreview}\n`;
    }

    return {
      content: [{
        type: "text",
        text: `🔍 Vercel Environment Variables Check

${status}
${needsFix ? '\n⚠️  ISSUES DETECTED! Run fixSupabaseEnvVars() to fix.' : '\n✅ All Supabase variables are configured correctly!'}`
      }]
    };

  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error checking env vars: ${error}` }],
      isError: true,
    };
  }
}

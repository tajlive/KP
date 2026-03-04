import { execSync } from "child_process";

const REPO_ROOT = "/Users/taj/klarpakke";

/**
 * Cloudflare API Tools for MCP
 * Provides CLI access to Cloudflare operations
 */

export interface CloudflareToolDefinition {
  name: string;
  description: string;
  handler: (input: Record<string, unknown>) => Promise<string>;
}

export const cloudflareTools: CloudflareToolDefinition[] = [
  {
    name: "cf_whoami",
    description: "Get current Cloudflare account info",
    handler: async () => {
      try {
        return execSync("wrangler whoami", { encoding: "utf-8" });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_secret_list",
    description: "List all secrets in production environment",
    handler: async () => {
      try {
        return execSync("wrangler secret list --env production", {
          encoding: "utf-8",
        });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_secret_put",
    description: "Add or update a secret (interactive)",
    handler: async (input) => {
      const secretName = input.name as string;
      if (!secretName) return "Error: name parameter required";
      return `To add secret: wrangler secret put ${secretName} --env production`;
    },
  },

  {
    name: "cf_secret_delete",
    description: "Delete a secret from production",
    handler: async (input) => {
      const secretName = input.name as string;
      if (!secretName) return "Error: name parameter required";
      try {
        return execSync(
          `wrangler secret delete ${secretName} --env production --yes`,
          { encoding: "utf-8" }
        );
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_pages_deploy",
    description: "Deploy to Cloudflare Pages",
    handler: async (input) => {
      const dir = (input.directory as string) || "dist";
      try {
        const output = execSync(`wrangler pages deploy ${dir}`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
        return output;
      } catch (e) {
        return `Deploy failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_pages_status",
    description: "Check Pages deployment status",
    handler: async () => {
      try {
        return execSync("wrangler pages projects list", { encoding: "utf-8" });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_worker_tail",
    description: "Stream real-time logs from workers",
    handler: async () => {
      return "To tail logs: wrangler tail --env production (Ctrl+C to exit)";
    },
  },

  {
    name: "cf_dns_list",
    description: "List DNS records for domain",
    handler: async (input) => {
      const domain = input.domain as string;
      if (!domain) return "Error: domain parameter required";
      try {
        // This would require zone ID from Cloudflare
        return `To list DNS records for ${domain}, use Cloudflare dashboard or API`;
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_kv_list",
    description: "List KV namespaces",
    handler: async () => {
      try {
        return execSync("wrangler kv:namespace list", { encoding: "utf-8" });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_analytics",
    description: "Get Pages analytics",
    handler: async () => {
      return `To view analytics:
1. Go to https://dash.cloudflare.com/
2. Select domain
3. Pages section
4. Click your project
5. View Analytics tab`;
    },
  },

  {
    name: "cf_env_vars",
    description: "List environment variables",
    handler: async () => {
      try {
        const content = execSync(
          "cat mcp-server/wrangler.toml || cat wrangler.toml",
          { cwd: REPO_ROOT, encoding: "utf-8" }
        );
        return content;
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },

  {
    name: "cf_validate_config",
    description: "Validate wrangler.toml configuration",
    handler: async () => {
      try {
        return execSync("wrangler publish --dry-run", {
          cwd: REPO_ROOT + "/mcp-server",
          encoding: "utf-8",
        });
      } catch (e) {
        return `Config check: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
];

/**
 * Cloudflare Dashboard Links
 * Quick reference for manual operations
 */
export const cloudflareLinks = {
  dashboard: "https://dash.cloudflare.com/",
  apiTokens: "https://dash.cloudflare.com/profile/api-tokens",
  pages: "https://dash.cloudflare.com/sites/pages",
  workers: "https://dash.cloudflare.com/workers",
  kv: "https://dash.cloudflare.com/kv",
  analytics: "https://dash.cloudflare.com/analytics",
};

/**
 * Common Cloudflare Operations
 */
export const commonOperations = {
  deployPages: "wrangler pages deploy dist",
  deployWorkers: "wrangler publish",
  tailLogs: "wrangler tail --env production",
  listSecrets: "wrangler secret list --env production",
  addSecret: "wrangler secret put SECRET_NAME --env production",
  deleteSecret: "wrangler secret delete SECRET_NAME --env production --yes",
  checkStatus: "wrangler whoami",
};

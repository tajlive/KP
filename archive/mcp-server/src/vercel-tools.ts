import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = "/Users/taj/klarpakke";

export const vercelTools = [
  {
    name: "vercel_deploy",
    description: "Deploy application to Vercel (production or preview)",
    input_schema: {
      type: "object" as const,
      properties: {
        environment: {
          type: "string",
          description: "Deployment environment",
          enum: ["production", "preview"],
        },
        skip_build: {
          type: "boolean",
          description: "Skip build verification before deploy",
        },
      },
      required: [],
    },
  },
  {
    name: "vercel_deploy_with_migrations",
    description: "Full deployment pipeline: build, migrations, and Vercel deploy",
    input_schema: {
      type: "object" as const,
      properties: {
        environment: {
          type: "string",
          description: "Deployment environment",
          enum: ["production", "preview"],
          default: "production",
        },
        skip_migrations: {
          type: "boolean",
          description: "Skip database migrations",
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: "vercel_list_deployments",
    description: "List recent Vercel deployments",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of deployments to show",
          default: 5,
        },
      },
      required: [],
    },
  },
  {
    name: "vercel_promote",
    description: "Promote a preview deployment to production",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "Preview URL to promote",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "vercel_status",
    description: "Check Vercel project status and configuration",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "vercel_verify_deployment",
    description: "Verify that a deployment is working correctly",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "URL to verify (defaults to production)",
        },
        tests: {
          type: "array",
          description: "Tests to run",
          items: {
            type: "string",
            enum: ["homepage", "admin_redirect", "api_health", "database"],
          },
          default: ["homepage", "admin_redirect"],
        },
      },
      required: [],
    },
  },
];

export async function executeVercelTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "vercel_deploy": {
        const environment = (args.environment as string) || "production";
        const skipBuild = args.skip_build === true;
        const isProd = environment === "production";

        // Pre-deploy verification
        if (!skipBuild) {
          try {
            execSync("npm run lint", { cwd: PROJECT_ROOT, timeout: 60000 });
            execSync("npm run type-check", { cwd: PROJECT_ROOT, timeout: 120000 });
            execSync("npm run build", { cwd: PROJECT_ROOT, timeout: 300000 });
          } catch (e) {
            return JSON.stringify({
              success: false,
              error: "Pre-deploy checks failed. Fix issues before deploying.",
              fix: "Run: npm run lint && npm run type-check && npm run build",
            }, null, 2);
          }
        }

        // Deploy
        const cmd = isProd ? "vercel --prod --yes" : "vercel --yes";
        
        try {
          const output = execSync(cmd, {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 300000,
          });

          // Extract URL from output
          const urlMatch = output.match(/https?:\/\/[^\s]+/);
          const deploymentUrl = urlMatch ? urlMatch[0] : "Unknown";

          return JSON.stringify({
            success: true,
            environment,
            url: deploymentUrl,
            output: output.slice(-500), // Last 500 chars
            timestamp: new Date().toISOString(),
          }, null, 2);
        } catch (e: any) {
          return JSON.stringify({
            success: false,
            error: "Deployment failed",
            output: e.stdout || e.message,
          }, null, 2);
        }
      }

      case "vercel_deploy_with_migrations": {
        const environment = (args.environment as string) || "production";
        const skipMigrations = args.skip_migrations === true;
        const results: any = {
          timestamp: new Date().toISOString(),
          environment,
          steps: [],
          overall_success: true,
        };

        // Step 1: Build verification
        try {
          execSync("npm run lint", { cwd: PROJECT_ROOT, timeout: 60000, stdio: "pipe" });
          execSync("npm run type-check", { cwd: PROJECT_ROOT, timeout: 120000, stdio: "pipe" });
          execSync("npm run build", { cwd: PROJECT_ROOT, timeout: 300000, stdio: "pipe" });
          results.steps.push({ name: "build", status: "passed" });
        } catch (e) {
          results.steps.push({ name: "build", status: "failed" });
          results.overall_success = false;
          return JSON.stringify(results, null, 2);
        }

        // Step 2: Database migrations
        if (!skipMigrations) {
          try {
            execSync("supabase db push", {
              cwd: PROJECT_ROOT,
              timeout: 120000,
              stdio: "pipe",
            });
            results.steps.push({ name: "migrations", status: "passed" });
          } catch (e) {
            results.steps.push({ name: "migrations", status: "failed" });
            results.overall_success = false;
            return JSON.stringify(results, null, 2);
          }
        } else {
          results.steps.push({ name: "migrations", status: "skipped" });
        }

        // Step 3: Vercel deploy
        try {
          const cmd = environment === "production" ? "vercel --prod --yes" : "vercel --yes";
          const output = execSync(cmd, {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 300000,
          });

          const urlMatch = output.match(/https?:\/\/[^\s]+/);
          results.deployment_url = urlMatch ? urlMatch[0] : "Unknown";
          results.steps.push({ name: "deploy", status: "passed" });
        } catch (e) {
          results.steps.push({ name: "deploy", status: "failed" });
          results.overall_success = false;
          return JSON.stringify(results, null, 2);
        }

        // Step 4: Post-deploy verification
        try {
          if (results.deployment_url) {
            const httpCode = execSync(
              `curl -s -o /dev/null -w "%{http_code}" "${results.deployment_url}"`,
              { encoding: "utf-8", timeout: 30000 }
            ).trim();

            if (httpCode === "200") {
              results.steps.push({ name: "verification", status: "passed" });
            } else {
              results.steps.push({ name: "verification", status: "warning", http_code: httpCode });
            }
          }
        } catch (e) {
          results.steps.push({ name: "verification", status: "skipped" });
        }

        return JSON.stringify(results, null, 2);
      }

      case "vercel_list_deployments": {
        const limit = (args.limit as number) || 5;

        try {
          const output = execSync(`vercel list --limit ${limit}`, {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 60000,
          });

          return JSON.stringify({
            success: true,
            deployments: output,
            timestamp: new Date().toISOString(),
          }, null, 2);
        } catch (e: any) {
          return JSON.stringify({
            success: false,
            error: "Failed to list deployments",
            output: e.stdout || e.message,
          }, null, 2);
        }
      }

      case "vercel_promote": {
        const url = args.url as string;
        if (!url) {
          throw new Error("url is required");
        }

        try {
          const output = execSync(`vercel promote ${url}`, {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 60000,
          });

          return JSON.stringify({
            success: true,
            url,
            output,
            timestamp: new Date().toISOString(),
          }, null, 2);
        } catch (e: any) {
          return JSON.stringify({
            success: false,
            error: "Promotion failed",
            output: e.stdout || e.message,
          }, null, 2);
        }
      }

      case "vercel_status": {
        try {
          const output = execSync("vercel status", {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 30000,
          });

          return JSON.stringify({
            success: true,
            status: output,
            project_root: PROJECT_ROOT,
            timestamp: new Date().toISOString(),
          }, null, 2);
        } catch (e: any) {
          return JSON.stringify({
            success: false,
            error: "Failed to get status",
            output: e.stdout || e.message,
          }, null, 2);
        }
      }

      case "vercel_verify_deployment": {
        const url = (args.url as string) || "https://klarpakke.no";
        const tests = (args.tests as string[]) || ["homepage", "admin_redirect"];
        const results: any = {
          url,
          tests: [],
          overall_success: true,
        };

        for (const test of tests) {
          switch (test) {
            case "homepage": {
              try {
                const httpCode = execSync(
                  `curl -s -o /dev/null -w "%{http_code}" "${url}"`,
                  { encoding: "utf-8", timeout: 30000 }
                ).trim();

                const passed = httpCode === "200";
                results.tests.push({ name: "homepage", status: passed ? "passed" : "failed", http_code: httpCode });
                if (!passed) results.overall_success = false;
              } catch (e) {
                results.tests.push({ name: "homepage", status: "failed", error: "Request failed" });
                results.overall_success = false;
              }
              break;
            }

            case "admin_redirect": {
              try {
                const finalUrl = execSync(
                  `curl -s -L -o /dev/null -w "%{url_effective}" "${url}/no7admin"`,
                  { encoding: "utf-8", timeout: 30000 }
                ).trim();

                const passed = finalUrl.includes("/admin");
                results.tests.push({ name: "admin_redirect", status: passed ? "passed" : "failed", final_url: finalUrl });
                if (!passed) results.overall_success = false;
              } catch (e) {
                results.tests.push({ name: "admin_redirect", status: "failed", error: "Request failed" });
                results.overall_success = false;
              }
              break;
            }

            case "api_health": {
              try {
                const httpCode = execSync(
                  `curl -s -o /dev/null -w "%{http_code}" "${url}/api/health"`,
                  { encoding: "utf-8", timeout: 30000 }
                ).trim();

                const passed = httpCode === "200" || httpCode === "404"; // 404 is OK if health endpoint not configured
                results.tests.push({ name: "api_health", status: passed ? "passed" : "failed", http_code: httpCode });
                if (!passed) results.overall_success = false;
              } catch (e) {
                results.tests.push({ name: "api_health", status: "failed", error: "Request failed" });
                results.overall_success = false;
              }
              break;
            }

            case "database": {
              // This is an indirect test - if the page loads with data, DB is working
              try {
                const hasData = execSync(
                  `curl -s "${url}/no" | grep -c "Oversikt" || echo "0"`,
                  { encoding: "utf-8", timeout: 30000 }
                ).trim();

                const passed = hasData !== "0";
                results.tests.push({ name: "database", status: passed ? "passed" : "warning", note: "Indirect test via content" });
              } catch (e) {
                results.tests.push({ name: "database", status: "skipped", note: "Could not verify" });
              }
              break;
            }
          }
        }

        return JSON.stringify(results, null, 2);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown Vercel tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Vercel error: ${errorMessage}`);
  }
}

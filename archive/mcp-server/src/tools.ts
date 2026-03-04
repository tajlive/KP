import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = "/Users/taj/klarpakke";
const APP_ROOT = `${REPO_ROOT}/klarpakke-app`;

// Tool schema type
interface ToolSchema {
  type: string;
  properties: Record<string, unknown>;
  required: string[];
}

/**
 * Tool Registry for MCP Server
 * Defines all available tools with metadata and implementations
 */

export interface ToolDefinition {
  name: string;
  description: string;
  category: "git" | "build" | "deploy" | "file" | "info";
  input_schema: ToolSchema;
  handler: (input: Record<string, unknown>) => Promise<string>;
}

// Git Tools
export const gitTools: ToolDefinition[] = [
  {
    name: "git_status",
    description: "Get current git status, showing staged/unstaged changes",
    category: "git",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        return execSync("git status --short", {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "git_log",
    description: "Show recent git commits",
    category: "git",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Number of commits to show (default: 10)",
        },
      },
      required: [],
    },
    handler: async (input) => {
      const count = (input.count as number) || 10;
      try {
        return execSync(`git log --oneline -${count}`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "git_diff",
    description: "Show uncommitted changes",
    category: "git",
    input_schema: {
      type: "object" as const,
      properties: {
        staged: {
          type: "boolean",
          description: "Show staged changes only (default: false)",
        },
      },
      required: [],
    },
    handler: async (input) => {
      const flag = input.staged ? "--cached" : "";
      try {
        return execSync(`git diff ${flag} --stat`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
];

// Build Tools
export const buildTools: ToolDefinition[] = [
  {
    name: "build_app",
    description: "Build the klarpakke-app for production",
    category: "build",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const output = execSync("npm run build", {
          cwd: APP_ROOT,
          encoding: "utf-8",
        });
        return output;
      } catch (e) {
        return `Build failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "lint_code",
    description: "Run code linter (Biome) on the app",
    category: "build",
    input_schema: {
      type: "object" as const,
      properties: {
        fix: {
          type: "boolean",
          description: "Auto-fix issues (default: false)",
        },
      },
      required: [],
    },
    handler: async (input) => {
      const fixFlag = input.fix ? " --write" : "";
      try {
        const output = execSync(`npm run lint${fixFlag}`, {
          cwd: APP_ROOT,
          encoding: "utf-8",
        });
        return output;
      } catch (e) {
        return `Lint check failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "check_dependencies",
    description: "Check for security vulnerabilities and outdated packages",
    category: "build",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const audit = execSync("npm audit --audit-level=moderate", {
          cwd: APP_ROOT,
          encoding: "utf-8",
        });
        return audit;
      } catch (e) {
        return `Audit warning: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
];

// Deployment Tools
export const deployTools: ToolDefinition[] = [
  {
    name: "deploy_staging",
    description: "Deploy to staging environment on Cloud Run",
    category: "deploy",
    input_schema: {
      type: "object" as const,
      properties: {
        tag: { type: "string", description: "Custom tag for the deployment" },
      },
      required: [],
    },
    handler: async (input) => {
      try {
        const tag = (input.tag as string) || `staging-${Date.now()}`;
        const output = execSync(`gcloud builds submit --config=cloudbuild.yaml --substitutions=_TAG="${tag}" --async`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
        return JSON.stringify({
          status: "deploying",
          tag,
          output,
          note: "Deployment started asynchronously. Check status with cloudrun_status or gcloud_builds_list tools.",
        }, null, 2);
      } catch (e) {
        return `Deployment failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "deploy_production",
    description: "Deploy to production on Cloud Run",
    category: "deploy",
    input_schema: {
      type: "object" as const,
      properties: {
        tag: { type: "string", description: "Custom tag for the deployment (default: timestamp)" },
      },
      required: [],
    },
    handler: async (input) => {
      try {
        const tag = (input.tag as string) || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const output = execSync(`gcloud builds submit --config=cloudbuild.yaml --substitutions=_TAG="${tag}"`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
        return JSON.stringify({
          status: "deployed",
          tag,
          output,
          url: "https://klarpakke-qxifdp72wa-uc.a.run.app",
        }, null, 2);
      } catch (e) {
        return `Deployment failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "check_deployment_status",
    description: "Check the status of the current Cloud Run deployment",
    category: "deploy",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const url = execSync("gcloud run services describe klarpakke --region=us-central1 --format='value(status.url)'", {
          encoding: "utf-8",
        }).trim();
        
        const httpCode = execSync(`curl -s -o /dev/null -w "%{http_code}" -L "${url}"`, { encoding: "utf-8" }).trim();
        
        return JSON.stringify({
          url,
          status: httpCode === "200" || httpCode === "307" ? "healthy" : "unhealthy",
          http_code: httpCode,
        }, null, 2);
      } catch (e) {
        return `Status check failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
];

// File Tools
export const fileTools: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read contents of a file",
    category: "file",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to repo root",
        },
        lines: {
          type: "string",
          description: "Line range like '1:50' or '100:150'",
        },
      },
      required: ["path"],
    },
    handler: async (input) => {
      try {
        const filePath = path.join(REPO_ROOT, input.path as string);
        let content = fs.readFileSync(filePath, "utf-8");

        if (input.lines) {
          const [start, end] = (input.lines as string)
            .split(":")
            .map((x) => parseInt(x, 10) - 1);
          const lines = content.split("\n");
          content = lines.slice(start, end + 1).join("\n");
        }

        return content.slice(0, 5000); // Limit output
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    category: "file",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path (default: klarpakke-app)",
        },
      },
      required: [],
    },
    handler: async (input) => {
      try {
        const dirPath = path.join(REPO_ROOT, (input.path as string) || "klarpakke-app");
        const files = fs.readdirSync(dirPath).slice(0, 50);
        return files.join("\n");
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
];

// Info Tools
export const infoTools: ToolDefinition[] = [
  {
    name: "get_project_info",
    description: "Get information about the Klarpakke project",
    category: "info",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(`${APP_ROOT}/package.json`, "utf-8")
        );
        return JSON.stringify(
          {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            scripts: Object.keys(packageJson.scripts),
            dependencies: Object.keys(packageJson.dependencies).length,
            devDependencies: Object.keys(packageJson.devDependencies).length,
          },
          null,
          2
        );
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
];

// Export all tools
export const allTools = [
  ...gitTools,
  ...buildTools,
  ...deployTools,
  ...fileTools,
  ...infoTools,
];

export const toolsByCategory = {
  git: gitTools,
  build: buildTools,
  deploy: deployTools,
  file: fileTools,
  info: infoTools,
};

// Helper to convert to standard format
export function toStandardTools() {
  return allTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema,
  }));
}

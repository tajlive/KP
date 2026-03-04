import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = "/Users/taj/klarpakke";

export const buildTools = [
  {
    name: "build_analyze",
    description: "Analyze Next.js bundle size and composition",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "build_performance",
    description: "Measure build time and performance metrics",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "build_check_types",
    description: "Run TypeScript type checking",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "build_lint",
    description: "Run ESLint on the codebase",
    input_schema: {
      type: "object" as const,
      properties: {
        fix: {
          type: "boolean",
          description: "Auto-fix linting issues",
        },
      },
      required: [],
    },
  },
  {
    name: "build_full",
    description: "Run complete build pipeline (lint, type-check, build)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

export async function executeBuildTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "build_analyze": {
        const analysis = {
          timestamp: new Date().toISOString(),
          project: "klarpakke",
          bundles: {} as Record<string, any>,
        };

        // Check if .next directory exists
        const nextDir = path.join(PROJECT_ROOT, ".next");
        if (fs.existsSync(nextDir)) {
          // Get bundle stats
          const staticDir = path.join(nextDir, "static");
          if (fs.existsSync(staticDir)) {
            const chunksDir = path.join(staticDir, "chunks");
            if (fs.existsSync(chunksDir)) {
              const files = fs.readdirSync(chunksDir);
              let totalSize = 0;
              const jsFiles = files.filter(f => f.endsWith('.js'));
              
              for (const file of jsFiles) {
                const stats = fs.statSync(path.join(chunksDir, file));
                totalSize += stats.size;
                (analysis.bundles as any)[file] = {
                  size: `${(stats.size / 1024).toFixed(2)} KB`,
                  size_bytes: stats.size,
                };
              }
              
              (analysis.bundles as any).total_js_size = `${(totalSize / 1024).toFixed(2)} KB`;
            }
          }
        }

        // Get installed dependencies count
        const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
          (analysis as any).dependencies_count = Object.keys(pkg.dependencies || {}).length;
          (analysis as any).dev_dependencies_count = Object.keys(pkg.devDependencies || {}).length;
        }

        return JSON.stringify(analysis, null, 2);
      }

      case "build_performance": {
        const startTime = Date.now();
        
        try {
          execSync("npm run build", {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 300000,
            stdio: "pipe",
          });
          
          const buildTime = Date.now() - startTime;
          
          return JSON.stringify({
            success: true,
            build_time_ms: buildTime,
            build_time_formatted: `${(buildTime / 1000).toFixed(2)}s`,
            timestamp: new Date().toISOString(),
          }, null, 2);
        } catch (e) {
          const buildTime = Date.now() - startTime;
          return JSON.stringify({
            success: false,
            build_time_ms: buildTime,
            error: "Build failed",
            fix: "Check build logs with: npm run build",
          }, null, 2);
        }
      }

      case "build_check_types": {
        try {
          const output = execSync("npm run type-check", {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 120000,
            stdio: "pipe",
          });
          
          return JSON.stringify({
            success: true,
            message: "TypeScript check passed",
            output: output || "No errors found",
          }, null, 2);
        } catch (e: any) {
          return JSON.stringify({
            success: false,
            message: "TypeScript errors found",
            error: e.stdout || e.message || "Unknown error",
            fix: "Run: npm run type-check",
          }, null, 2);
        }
      }

      case "build_lint": {
        const fix = args.fix === true;
        const cmd = fix ? "npm run lint -- --fix" : "npm run lint";
        
        try {
          const output = execSync(cmd, {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 60000,
            stdio: "pipe",
          });
          
          return JSON.stringify({
            success: true,
            message: fix ? "Linting passed (fixes applied)" : "Linting passed",
            output: output || "No issues found",
          }, null, 2);
        } catch (e: any) {
          const stdout = e.stdout || "";
          const errorCount = (stdout.match(/error/g) || []).length;
          const warningCount = (stdout.match(/warning/g) || []).length;
          
          return JSON.stringify({
            success: false,
            message: "Linting issues found",
            errors: errorCount,
            warnings: warningCount,
            output: stdout,
            fix: "Run: npm run lint -- --fix to auto-fix issues",
          }, null, 2);
        }
      }

      case "build_full": {
        const results: any = {
          timestamp: new Date().toISOString(),
          steps: [],
          overall_success: true,
        };

        // Step 1: Lint
        try {
          const lintOutput = execSync("npm run lint", {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 60000,
          });
          results.steps.push({ name: "lint", status: "passed" });
        } catch (e) {
          results.steps.push({ name: "lint", status: "failed" });
          results.overall_success = false;
        }

        // Step 2: Type check
        try {
          const typeOutput = execSync("npm run type-check", {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 120000,
          });
          results.steps.push({ name: "type-check", status: "passed" });
        } catch (e) {
          results.steps.push({ name: "type-check", status: "failed" });
          results.overall_success = false;
        }

        // Step 3: Build
        try {
          const buildOutput = execSync("npm run build", {
            cwd: PROJECT_ROOT,
            encoding: "utf-8",
            timeout: 300000,
          });
          results.steps.push({ name: "build", status: "passed" });
        } catch (e) {
          results.steps.push({ name: "build", status: "failed" });
          results.overall_success = false;
        }

        return JSON.stringify(results, null, 2);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown build tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Build error: ${errorMessage}`);
  }
}

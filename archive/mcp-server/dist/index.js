import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { stripeTools, executeStripeTool } from "./stripe-tools.js";
import { linkedinTools, executeLinkedInTool } from "./linkedin-tools.js";
import { salesNavigatorTools, executeSalesNavigatorTool } from "./sales-navigator-tools.js";
import { authTools, executeAuthTool } from "./auth-tools.js";
import { githubTools, executeGitHubTool } from "./github-tools.js";
import { cloudflareTools } from "./cloudflare-tools.js";
import { cloudRunTools, executeCloudRunTool } from "./cloud-run-tools.js";
// NEW: Import the 5 new modules
import { supabaseTools, executeSupabaseTool } from "./supabase-tools.js";
import { cloudflareDnsTools, executeCloudflareDnsTool } from "./cloudflare-dns-tools.js";
import { cloudrunDomainTools, executeCloudrunDomainTool } from "./cloudrun-domain-tools.js";
import { buildTools, executeBuildTool } from "./build-tools.js";
import { monitorTools, executeMonitorTool } from "./monitor-tools.js";
import { vercelTools, executeVercelTool } from "./vercel-tools.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
// Convert Cloudflare tools to standard format
const cfToolsFormatted = cloudflareTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
        type: "object",
        properties: {},
        required: [],
    },
}));
// Define generic tools that were in the original file
const genericTools = [
    {
        name: "git_status",
        description: "Get current git status of the repository",
        input_schema: {
            type: "object",
            properties: {},
            required: [],
        },
    },
    {
        name: "git_commit",
        description: "Create a git commit with the given message",
        input_schema: {
            type: "object",
            properties: {
                message: {
                    type: "string",
                    description: "Commit message",
                },
                files: {
                    type: "array",
                    items: { type: "string" },
                    description: "Files to stage (optional, defaults to all changed)",
                },
            },
            required: ["message"],
        },
    },
    {
        name: "git_push",
        description: "Push commits to remote repository",
        input_schema: {
            type: "object",
            properties: {
                branch: {
                    type: "string",
                    description: "Branch to push (default: current branch)",
                },
            },
            required: [],
        },
    },
    {
        name: "read_file",
        description: "Read contents of a file",
        input_schema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "File path relative to repo root",
                },
            },
            required: ["path"],
        },
    },
    {
        name: "list_files",
        description: "List files in a directory",
        input_schema: {
            type: "object",
            properties: {
                directory: {
                    type: "string",
                    description: "Directory path (default: .)",
                },
            },
            required: [],
        },
    }
];
// Helper for Git execution
function executeGit(command) {
    try {
        return execSync(`git ${command}`, { encoding: "utf-8" });
    }
    catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}
const server = new Server({
    name: "klarpakke-mcp-server",
    version: "1.1.0", // Bumped version for new tools
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Combine all tools: Original 7 modules + 5 new modules + generic
    const allTools = [
        ...stripeTools,
        ...linkedinTools,
        ...salesNavigatorTools,
        ...authTools,
        ...githubTools,
        ...cfToolsFormatted,
        ...cloudRunTools,
        // NEW: Add the 5 new modules + vercel
        ...supabaseTools,
        ...cloudflareDnsTools,
        ...cloudrunDomainTools,
        ...buildTools,
        ...monitorTools,
        ...vercelTools,
        ...genericTools
    ];
    return {
        tools: allTools,
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const repoRoot = path.resolve(process.cwd(), '..'); // Assuming running from mcp-server dir
    try {
        // Stripe Tools
        if (name.startsWith("stripe_")) {
            const result = await executeStripeTool(name, args);
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // LinkedIn Tools
        if (name.startsWith("linkedin_")) {
            const result = await executeLinkedInTool(name, args);
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // Sales Navigator Tools
        if (name.startsWith("sn_")) {
            const result = await executeSalesNavigatorTool(name, args);
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // Auth Tools
        if (name.startsWith("auth_")) {
            const result = await executeAuthTool(name, args);
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // GitHub Tools
        if (name.startsWith("github_")) {
            const result = await executeGitHubTool(name, args);
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // Cloudflare Tools (original)
        if (name.startsWith("cf_") && !name.startsWith("cf_dns_")) {
            const tool = cloudflareTools.find(t => t.name === name);
            if (tool) {
                const result = await tool.handler(args || {});
                return {
                    content: [{ type: "text", text: result }],
                };
            }
        }
        // Cloud Run Tools
        if (name.startsWith("gcloud_") || name.startsWith("cloudrun_")) {
            const result = await executeCloudRunTool(name, args);
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // NEW: Supabase Tools
        if (name.startsWith("supabase_")) {
            const result = await executeSupabaseTool(name, args || {});
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // NEW: Cloudflare DNS Tools
        if (name.startsWith("cf_dns_")) {
            const result = await executeCloudflareDnsTool(name, args || {});
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // NEW: Cloud Run Domain Tools (catch cloudrun_create_domain_mapping etc.)
        if (name.startsWith("cloudrun_") &&
            (name.includes("domain") || name.includes("mapping") || name.includes("ssl"))) {
            const result = await executeCloudrunDomainTool(name, args || {});
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // NEW: Build Tools
        if (name.startsWith("build_")) {
            const result = await executeBuildTool(name, args || {});
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // NEW: Monitor Tools
        if (name.startsWith("monitor_")) {
            const result = await executeMonitorTool(name, args || {});
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // NEW: Vercel Tools
        if (name.startsWith("vercel_")) {
            const result = await executeVercelTool(name, args || {});
            return {
                content: [{ type: "text", text: result }],
            };
        }
        // Generic Tools
        switch (name) {
            case "git_status": {
                const result = executeGit("status --short");
                return { content: [{ type: "text", text: result }] };
            }
            case "git_commit": {
                const message = args?.message;
                const files = args?.files?.join(" ") || ".";
                executeGit(`add ${files}`);
                const result = executeGit(`commit -m "${message}"`);
                return { content: [{ type: "text", text: result }] };
            }
            case "git_push": {
                const branch = args?.branch || "main";
                const result = executeGit(`push origin ${branch}`);
                return { content: [{ type: "text", text: result }] };
            }
            case "read_file": {
                const filePath = path.join(repoRoot, args?.path);
                const content = fs.readFileSync(filePath, "utf-8");
                return { content: [{ type: "text", text: content }] };
            }
            case "list_files": {
                const dir = path.join(repoRoot, args?.directory || ".");
                const files = fs.readdirSync(dir).slice(0, 50); // Limit to 50
                return { content: [{ type: "text", text: files.join("\n") }] };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Klarpakke MCP Server v1.2.0 running on stdio");
console.error("Total tools available: 170+ (99 original + 35 new + 6 vercel)");
//# sourceMappingURL=index.js.map
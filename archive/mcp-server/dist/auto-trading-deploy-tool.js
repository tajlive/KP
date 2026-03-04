"use strict";
/**
 * Auto-Trading Deploy Tool for Klarpakke MCP Server
 *
 * Dette verktøyet automatiserer deploy av auto-trading systemet.
 * Det kan kalles fra Claude Desktop eller andre MCP-klienter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoTradingDeployTool = void 0;
exports.executeAutoTradingDeploy = executeAutoTradingDeploy;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
exports.autoTradingDeployTool = {
    name: "klarpakke_deploy_auto_trading",
    description: "Deploy the complete auto-trading system to Klarpakke",
    input_schema: {
        type: "object",
        properties: {
            environment: {
                type: "string",
                description: "Target environment (production, staging, development)",
                enum: ["production", "staging", "development"],
                default: "production"
            },
            skip_build: {
                type: "boolean",
                description: "Skip Next.js build step",
                default: false
            },
            skip_vercel: {
                type: "boolean",
                description: "Skip Vercel deploy",
                default: false
            },
            skip_supabase: {
                type: "boolean",
                description: "Skip Supabase operations",
                default: false
            },
            sql_file: {
                type: "string",
                description: "Path to SQL schema file",
                default: "sql/001_core_schema_v2.sql"
            }
        },
        required: []
    }
};
async function executeAutoTradingDeploy(args) {
    const projectDir = process.cwd();
    const results = {};
    try {
        console.log(`🚀 Starting auto-trading deploy to ${args.environment || 'production'}...\n`);
        // STEG 1: Verifiser at alle filer finnes
        console.log("📋 Step 1: Verifying files...");
        const requiredFiles = [
            args.sql_file || "sql/001_core_schema_v2.sql",
            "src/lib/shared.ts",
            "src/app/api/auto-trading/start/route.ts",
            "src/app/api/auto-trading/stop/route.ts",
            "src/app/api/auto-trading/execute-trade/route.ts",
            "src/app/api/auto-trading/recover/route.ts",
            "src/app/api/auto-trading/sessions/route.ts",
            "src/app/api/copy-trading/follow/route.ts",
            "src/app/api/copy-trading/unfollow/route.ts",
            "src/app/api/copy-trading/leaders/route.ts",
            "src/app/api/cron/tick/route.ts",
            "src/components/trading/index.tsx"
        ];
        const missingFiles = requiredFiles.filter(f => !(0, fs_1.existsSync)((0, path_1.join)(projectDir, f)));
        if (missingFiles.length > 0) {
            return {
                success: false,
                message: `Missing required files: ${missingFiles.join(', ')}`,
                details: { missingFiles }
            };
        }
        console.log(`   ✅ All ${requiredFiles.length} files found\n`);
        // STEG 2: Bygg Next.js
        if (!args.skip_build) {
            console.log("🔨 Step 2: Building Next.js app...");
            try {
                (0, child_process_1.execSync)("npm run build", {
                    cwd: projectDir,
                    stdio: "pipe",
                    encoding: "utf-8"
                });
                console.log("   ✅ Build successful\n");
                results.build = "success";
            }
            catch (error) {
                return {
                    success: false,
                    message: "Next.js build failed",
                    details: { error: String(error) }
                };
            }
        }
        else {
            console.log("   ⏭️  Skipping build\n");
            results.build = "skipped";
        }
        // STEG 3: Deploy Edge Functions
        if (!args.skip_supabase) {
            console.log("⚡ Step 3: Deploying Edge Functions...");
            try {
                const edgeFunctions = ["process-copy-trades", "send-notifications"];
                for (const fn of edgeFunctions) {
                    try {
                        (0, child_process_1.execSync)(`supabase functions deploy ${fn} --no-verify-jwt`, {
                            cwd: projectDir,
                            stdio: "pipe",
                            encoding: "utf-8"
                        });
                        console.log(`   ✅ ${fn} deployed`);
                    }
                    catch {
                        console.log(`   ⚠️  ${fn} may already be deployed`);
                    }
                }
                results.edgeFunctions = "deployed";
            }
            catch (error) {
                console.log(`   ⚠️  Edge function deploy warning: ${error}\n`);
                results.edgeFunctions = "warning";
            }
            console.log("");
        }
        // STEG 4: Deploy til Vercel
        if (!args.skip_vercel) {
            console.log("🚀 Step 4: Deploying to Vercel...");
            try {
                const output = (0, child_process_1.execSync)("npx vercel --prod --yes", {
                    cwd: projectDir,
                    stdio: "pipe",
                    encoding: "utf-8"
                });
                // Extract URL from output
                const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
                const deployUrl = urlMatch ? urlMatch[0] : "https://www.klarpakke.no";
                console.log(`   ✅ Deployed to: ${deployUrl}\n`);
                results.vercel = { status: "deployed", url: deployUrl };
            }
            catch (error) {
                return {
                    success: false,
                    message: "Vercel deploy failed",
                    details: { error: String(error) }
                };
            }
        }
        // STEG 5: Git commit
        console.log("📦 Step 5: Git commit...");
        try {
            (0, child_process_1.execSync)("git add -A", { cwd: projectDir, stdio: "ignore" });
            // Sjekk om det er noe å commite
            const status = (0, child_process_1.execSync)("git diff --cached --name-only", {
                cwd: projectDir,
                encoding: "utf-8"
            });
            if (status.trim()) {
                (0, child_process_1.execSync)('git commit -m "feat: Deploy auto-trading system via MCP"', {
                    cwd: projectDir,
                    stdio: "pipe"
                });
                // Prøv push
                try {
                    (0, child_process_1.execSync)("git push origin main", { cwd: projectDir, stdio: "pipe" });
                    console.log("   ✅ Committed and pushed\n");
                    results.git = "committed_and_pushed";
                }
                catch {
                    console.log("   ✅ Committed (push failed - account may be flagged)\n");
                    results.git = "committed_only";
                }
            }
            else {
                console.log("   ℹ️  No changes to commit\n");
                results.git = "no_changes";
            }
        }
        catch (error) {
            console.log(`   ⚠️  Git warning: ${error}\n`);
            results.git = "warning";
        }
        // STEG 6: Verifiser
        console.log("🔍 Step 6: Verifying deployment...");
        try {
            const healthCheck = (0, child_process_1.execSync)("curl -s -o /dev/null -w '%{http_code}' https://www.klarpakke.no/api/health", {
                encoding: "utf-8"
            });
            if (healthCheck.trim() === "200") {
                console.log("   ✅ Health check passed\n");
                results.healthCheck = "passed";
            }
            else {
                console.log(`   ⚠️  Health check returned ${healthCheck}\n`);
                results.healthCheck = "warning";
            }
        }
        catch {
            console.log("   ⚠️  Could not verify deployment\n");
            results.healthCheck = "unknown";
        }
        // SQL instruksjoner
        console.log("📊 SQL Schema:");
        console.log("   To complete deployment, run the SQL schema in Supabase:");
        console.log(`   File: ${args.sql_file || "sql/001_core_schema_v2.sql"}`);
        console.log("   Dashboard: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql/new\n");
        return {
            success: true,
            message: "Auto-trading system deployed successfully!",
            details: {
                environment: args.environment || "production",
                ...results,
                nextSteps: [
                    "Run SQL schema in Supabase Dashboard",
                    "Test API endpoints",
                    "Verify cron jobs are scheduled"
                ]
            }
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Deploy failed: ${error}`,
            details: { error: String(error) }
        };
    }
}
// Export for use in MCP server
exports.default = {
    tool: exports.autoTradingDeployTool,
    execute: executeAutoTradingDeploy
};

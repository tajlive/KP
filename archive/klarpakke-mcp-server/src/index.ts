#!/usr/bin/env -S deno run --allow-all
/**
 * Klarpakke MCP Server
 *
 * Model Context Protocol server for managing Klarpakke Universitet
 * Provides tools for analytics, user management, email campaigns,
 * deployments, database queries, and KLT token management.
 */

import { Server } from "https://esm.sh/@modelcontextprotocol/sdk@1.0.4/server/index.js";
import { StdioServerTransport } from "https://esm.sh/@modelcontextprotocol/sdk@1.0.4/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "https://esm.sh/@modelcontextprotocol/sdk@1.0.4/types.js";

import { checkRateLimit, logAudit } from "./clients/supabase.ts";

// Import all tools
import {
  getDashboardMetrics,
  getFunnelStats,
  getSignupTrend,
  getTopUsers,
} from "./tools/analytics.ts";

import {
  banUser,
  getUserDetails,
  grantFounderStatus,
  searchUsers,
  updateUser,
} from "./tools/users.ts";

import {
  getEmailStatsTool,
  listRecentCampaigns,
  sendCampaign,
} from "./tools/email.ts";

import {
  cancelSubscription,
  getRevenueStats,
  getStripeCustomer,
  listStripeProducts,
  listSubscriptions,
  refundPayment,
  searchStripeCustomers,
} from "./tools/billing.ts";

import {
  deployToProductionTool,
  getDeploymentStatus,
  listDeployments,
  rollbackDeploymentTool,
  fixSupabaseEnvVars,
  checkEnvironmentVariables,
} from "./tools/deployment.ts";

import {
  backupDatabase,
  getTableStats,
  listTables,
  runSQLQuery,
} from "./tools/database.ts";

import {
  awardKLTTokens,
  createTokenAirdrop,
  getKLTLeaderboard,
  getUserTokenBalance,
} from "./tools/tokens.ts";

import {
  createDNSRecord,
  createFirewallRule,
  deleteDNSRecord,
  enableUnderAttackMode,
  getCloudflareAnalytics,
  getSecuritySettings,
  getTopThreats,
  getZoneInfo,
  listDNSRecords,
  listFirewallRules,
  listPageRules,
  purgeAllCache,
  purgeCacheByURL,
  quickPurgeAndCheck,
  runCloudflareDiagnostics,
  setSecurityLevel,
  toggleDevelopmentMode,
} from "./tools/cloudflare.ts";

// Import Supabase Edge Function tools
import {
  deployEdgeFunction,
  getFunctionLogs,
  listEdgeFunctions,
  listSecrets,
  testEdgeFunction,
  testSystemStatus,
} from "./tools/supabase.ts";

// Import advanced migration tools
import {
  checkDatabaseHealth,
  createRLSPolicy,
  deployAllPendingMigrations,
  enableRLSOnTable,
  runCustomSQL,
} from "./tools/migrations-advanced.ts";

// Import Supabase CLI tools
import {
  checkMigrationStatus,
  deployAllFunctions,
  deployEdgeFunctionCLI,
  getFunctionLogsCLI,
  listEdgeFunctionsCLI,
  listMigrations,
  listSupabaseSecrets,
  pushMigrations,
  repairMigration,
  runSupabaseCommand,
  setSupabaseSecret,
  testAPIEndpoint,
} from "./tools/supabase-cli.ts";

// Import new tools
import {
  setWebsiteMetrics,
  updateCourseContent,
  updateLesson,
} from "./tools/content.ts";

import {
  checkBinanceBalance,
  generateProfitReport,
  getActiveTradesSummary,
  panicCloseAll,
  updateRiskParameters,
} from "./tools/trading.ts";

import { getAIUsageAnalytics, updateCoachSystemPrompt } from "./tools/ai.ts";

import {
  auditSecurityLogs,
  checkSystemHealth,
  getGrowthLeaderboard,
} from "./tools/system.ts";

// Import Testing Tools
import {
  playwrightTool,
  lighthouseTool,
} from "./tools/index.ts";

// Import GitHub Tools
import {
  getLatestDeployment,
  getDeploymentHistory,
  createDeployment,
  getRecentCommits,
  getIssues,
  createIssue,
  getPullRequests,
  getReleases,
  triggerWorkflow,
  getWorkflowRuns,
  getRepositoryInfo,
  compareBranches,
  searchCode,
} from "./tools/github.ts";

// Import Supabase Automation tools (100% Automation)
import {
  checkFunctionHealth,
  deployFunctionAPI,
  executeSQL,
  runMigrationSafe,
  verifyJWTSettings,
} from "./tools/supabase-automation.ts";

// Tool handlers mapping
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  // Analytics
  get_dashboard_metrics: getDashboardMetrics,
  get_signup_trend: getSignupTrend,
  get_top_users: getTopUsers,
  get_funnel_stats: getFunnelStats,

  // Users
  search_users: searchUsers,
  update_user: updateUser,
  grant_founder_status: grantFounderStatus,
  ban_user: banUser,
  get_user_details: getUserDetails,

  // Email
  send_campaign: sendCampaign,
  get_email_stats: getEmailStatsTool,
  list_recent_campaigns: listRecentCampaigns,

  // Billing
  get_stripe_customer: getStripeCustomer,
  search_stripe_customers: searchStripeCustomers,
  list_subscriptions: listSubscriptions,
  cancel_subscription: cancelSubscription,
  get_revenue_stats: getRevenueStats,
  refund_payment: refundPayment,
  list_stripe_products: listStripeProducts,

  // Deployment
  get_deployment_status: getDeploymentStatus,
  deploy_to_production: deployToProductionTool,
  rollback_deployment: rollbackDeploymentTool,
  list_deployments: listDeployments,
  fix_supabase_env_vars: fixSupabaseEnvVars,
  check_environment_variables: checkEnvironmentVariables,

  // Database
  run_sql_query: runSQLQuery,
  get_table_stats: getTableStats,
  backup_database: backupDatabase,
  list_tables: listTables,

  // Tokens
  award_klt_tokens: awardKLTTokens,
  get_klt_leaderboard: getKLTLeaderboard,
  create_token_airdrop: createTokenAirdrop,
  get_user_token_balance: getUserTokenBalance,

  // Cloudflare
  get_zone_info: getZoneInfo,
  run_cloudflare_diagnostics: runCloudflareDiagnostics,
  list_dns_records: listDNSRecords,
  create_dns_record: createDNSRecord,
  delete_dns_record: deleteDNSRecord,
  purge_all_cache: purgeAllCache,
  purge_cache_by_url: purgeCacheByURL,
  get_cloudflare_analytics: getCloudflareAnalytics,
  get_top_threats: getTopThreats,
  get_security_settings: getSecuritySettings,
  set_security_level: setSecurityLevel,
  toggle_development_mode: toggleDevelopmentMode,
  list_firewall_rules: listFirewallRules,
  create_firewall_rule: createFirewallRule,
  list_page_rules: listPageRules,
  enable_under_attack_mode: enableUnderAttackMode,
  quick_purge_and_check: quickPurgeAndCheck,

  // Supabase Edge Functions
  list_edge_functions: listEdgeFunctions,
  deploy_edge_function: deployEdgeFunction,
  list_secrets: listSecrets,
  test_edge_function: testEdgeFunction,
  get_function_logs: getFunctionLogs,
  test_system_status: testSystemStatus,

  // Advanced Migration Tools
  enable_rls_on_table: enableRLSOnTable,
  create_rls_policy: createRLSPolicy,
  run_custom_sql: runCustomSQL,
  deploy_all_pending_migrations: deployAllPendingMigrations,
  check_database_health: checkDatabaseHealth,

  // Supabase CLI Tools
  run_supabase_command: runSupabaseCommand,
  list_supabase_secrets: listSupabaseSecrets,
  set_supabase_secret: setSupabaseSecret,
  list_edge_functions_cli: listEdgeFunctionsCLI,
  deploy_edge_function_cli: deployEdgeFunctionCLI,
  get_function_logs_cli: getFunctionLogsCLI,
  test_api_endpoint: testAPIEndpoint,
  deploy_all_functions: deployAllFunctions,

  // Migration Management
  list_migrations: listMigrations,
  repair_migration: repairMigration,
  push_migrations: pushMigrations,
  check_migration_status: checkMigrationStatus,

  // Content Management
  update_course_content: updateCourseContent,
  update_lesson: updateLesson,
  set_website_metrics: setWebsiteMetrics,

  // Trading Operations
  get_active_trades_summary: getActiveTradesSummary,
  update_risk_parameters: updateRiskParameters,
  panic_close_all: panicCloseAll,
  check_binance_balance: checkBinanceBalance,
  generate_profit_report: generateProfitReport,

  // AI Control
  update_coach_system_prompt: updateCoachSystemPrompt,
  get_ai_usage_analytics: getAIUsageAnalytics,

  // System Health
  check_system_health: checkSystemHealth,
  get_growth_leaderboard: getGrowthLeaderboard,
  audit_security_logs: auditSecurityLogs,

  // ===== AUTOMATION TOOLS =====
  execute_sql: executeSQL,
  deploy_function_api: deployFunctionAPI,
  check_function_health: checkFunctionHealth,
  run_migration_safe: runMigrationSafe,
  verify_jwt_settings: verifyJWTSettings,

  // ===== TESTING TOOLS =====
  test_login_page: async (args: { baseUrl?: string }) => {
    return await playwrightTool.testLoginPage(args.baseUrl || 'https://www.klarpakke.no');
  },
  test_oauth_flow: async (args: { provider: 'google' | 'linkedin' }) => {
    return await playwrightTool.testAuthFlow(args.provider);
  },
  test_page_accessibility: async (args: { url: string }) => {
    return await playwrightTool.testPageAccessibility(args.url);
  },
  run_lighthouse_audit: async (args: { url: string; device?: 'mobile' | 'desktop' }) => {
    return await lighthouseTool.audit({
      url: args.url,
      device: args.device || 'desktop'
    });
  },
  run_lighthouse_auth_pages: async () => {
    return await lighthouseTool.auditAuthPages();
  },

  // ===== GITHUB TOOLS =====
  // Deployments
  get_latest_deployment: getLatestDeployment,
  get_deployment_history: async (args: { limit?: number }) => {
    return await getDeploymentHistory(args.limit || 10);
  },
  create_deployment: async (args: { 
    environment?: string; 
    ref?: string; 
    description?: string 
  }) => {
    return await createDeployment(
      args.environment || "production",
      args.ref || "main",
      args.description || "Deployed via MCP"
    );
  },

  // Commits
  get_recent_commits: async (args: { limit?: number; branch?: string }) => {
    return await getRecentCommits(args.limit || 10, args.branch || "main");
  },

  // Issues
  get_issues: async (args: { states?: ("OPEN" | "CLOSED")[]; labels?: string[]; limit?: number }) => {
    return await getIssues(args.states || ["OPEN"], args.labels, args.limit || 20);
  },
  create_issue: async (args: { title: string; body: string; labels?: string[]; assignees?: string[] }) => {
    return await createIssue(args.title, args.body, args.labels || [], args.assignees || []);
  },

  // Pull Requests
  get_pull_requests: async (args: { state?: "open" | "closed" | "all"; limit?: number }) => {
    return await getPullRequests(args.state || "open", args.limit || 10);
  },

  // Releases
  get_releases: async (args: { limit?: number }) => {
    return await getReleases(args.limit || 5);
  },

  // Workflows
  trigger_workflow: async (args: {
    workflow_id: string;
    branch?: string;
    inputs?: Record<string, string>;
  }) => {
    return await triggerWorkflow(
      args.workflow_id,
      args.branch || "main",
      args.inputs
    );
  },
  get_workflow_runs: async (args: { workflow_id: string; limit?: number }) => {
    return await getWorkflowRuns(args.workflow_id, args.limit || 5);
  },

  // Repository
  get_repository_info: getRepositoryInfo,
  compare_branches: async (args: { base: string; head: string }) => {
    return await compareBranches(args.base, args.head);
  },
  search_code: async (args: { query: string; limit?: number }) => {
    return await searchCode(args.query, args.limit || 10);
  },
};

// Create MCP server
const server = new Server(
  {
    name: "klarpakke-admin",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Define all tools
const tools = [
  // Analytics Tools
  {
    name: "get_dashboard_metrics",
    description:
      "Get real-time dashboard metrics including total users, signups today/week/month, active users, MRR, and conversion rate",
    inputSchema: {
      type: "object" as const,
      properties: {
        time_range: {
          type: "string",
          enum: ["24h", "7d", "30d"],
          description: "Time range for metrics",
          default: "7d",
        },
      },
    },
  },
  {
    name: "get_signup_trend",
    description:
      "Get daily signup data for creating charts and analyzing growth trends",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_top_users",
    description:
      "Get top performing users by trades, referrals, or KLT token holdings",
    inputSchema: {
      type: "object" as const,
      properties: {
        metric: {
          type: "string",
          enum: ["trades", "referrals", "klt"],
          description: "Metric to rank by",
        },
        limit: {
          type: "number",
          description: "Number of users to return",
          default: 10,
        },
      },
      required: ["metric"],
    },
  },
  {
    name: "get_funnel_stats",
    description:
      "Get signup funnel conversion statistics showing drop-off at each step",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // User Management Tools
  {
    name: "search_users",
    description: "Search for users by email, name, or status",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        filter: {
          type: "string",
          enum: ["email", "name", "status"],
          description: "Field to filter by",
          default: "email",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "update_user",
    description: "Update user profile fields (name, role, status, metadata)",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "User UUID",
        },
        updates: {
          type: "object",
          description: "Fields to update",
        },
      },
      required: ["user_id", "updates"],
    },
  },
  {
    name: "grant_founder_status",
    description: "Grant founder status to a user and award 10,000 KLT tokens",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "User UUID",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "ban_user",
    description: "Ban a user from the platform with a reason",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "User UUID",
        },
        reason: {
          type: "string",
          description: "Ban reason",
        },
      },
      required: ["user_id", "reason"],
    },
  },
  {
    name: "get_user_details",
    description: "Get detailed information about a specific user",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "User UUID",
        },
      },
      required: ["user_id"],
    },
  },

  // Email Campaign Tools
  {
    name: "send_campaign",
    description: "Send an email campaign to a specific audience segment",
    inputSchema: {
      type: "object" as const,
      properties: {
        audience: {
          type: "string",
          enum: ["all", "founders", "inactive", "custom"],
          description: "Target audience",
        },
        template: {
          type: "string",
          enum: ["welcome", "reminder", "feedback"],
          description: "Email template to use",
        },
        personalize: {
          type: "boolean",
          description: "Personalize with user name",
          default: true,
        },
      },
      required: ["audience", "template"],
    },
  },
  {
    name: "get_email_stats",
    description:
      "Get email campaign statistics (open rate, click rate, bounces)",
    inputSchema: {
      type: "object" as const,
      properties: {
        campaign_id: {
          type: "string",
          description: "Campaign ID (optional, defaults to all)",
        },
      },
    },
  },
  {
    name: "list_recent_campaigns",
    description: "List recent email campaigns with sent/failed counts",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Billing Tools
  {
    name: "get_stripe_customer",
    description: "Get Stripe customer details including subscriptions",
    inputSchema: {
      type: "object" as const,
      properties: {
        customer_id: {
          type: "string",
          description: "Stripe customer ID (cus_xxx)",
        },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "search_stripe_customers",
    description: "Search Stripe customers by email or name",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (email, name, or customer ID)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_subscriptions",
    description: "List Stripe subscriptions for a customer or all",
    inputSchema: {
      type: "object" as const,
      properties: {
        customer_id: {
          type: "string",
          description: "Optional: Filter by customer ID",
        },
      },
    },
  },
  {
    name: "cancel_subscription",
    description: "Cancel a Stripe subscription",
    inputSchema: {
      type: "object" as const,
      properties: {
        subscription_id: {
          type: "string",
          description: "Stripe subscription ID (sub_xxx)",
        },
        immediate: {
          type: "boolean",
          description: "Cancel immediately vs at period end",
          default: false,
        },
      },
      required: ["subscription_id"],
    },
  },
  {
    name: "get_revenue_stats",
    description: "Get revenue statistics from Stripe",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze",
          default: 30,
        },
      },
    },
  },
  {
    name: "refund_payment",
    description: "Refund a Stripe payment",
    inputSchema: {
      type: "object" as const,
      properties: {
        payment_intent_id: {
          type: "string",
          description: "Payment intent ID (pi_xxx)",
        },
        amount: {
          type: "number",
          description: "Amount to refund in cents (omit for full refund)",
        },
        reason: {
          type: "string",
          description: "Refund reason",
        },
      },
      required: ["payment_intent_id"],
    },
  },
  {
    name: "list_stripe_products",
    description: "List Stripe products and their pricing",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Deployment Tools
  {
    name: "get_deployment_status",
    description: "Get current production deployment status and health checks",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "deploy_to_production",
    description:
      "Deploy a branch to production (requires confirmation for safety)",
    inputSchema: {
      type: "object" as const,
      properties: {
        branch: {
          type: "string",
          description: "Git branch to deploy",
          default: "main",
        },
        run_migrations: {
          type: "boolean",
          description: "Run database migrations",
          default: false,
        },
      },
    },
  },
  {
    name: "rollback_deployment",
    description: "Rollback to a previous deployment",
    inputSchema: {
      type: "object" as const,
      properties: {
        deployment_id: {
          type: "string",
          description: "Deployment ID to rollback to",
        },
      },
      required: ["deployment_id"],
    },
  },
  {
    name: "list_deployments",
    description: "List recent Vercel deployments",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "fix_supabase_env_vars",
    description: "Fix Supabase environment variables in Vercel (updates from wrong project to correct project)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "check_environment_variables",
    description: "Check Vercel environment variables for Supabase configuration",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Database Tools
  {
    name: "run_sql_query",
    description:
      "Execute a SQL query with safety checks (read-only by default)",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "SQL query to execute",
        },
        read_only: {
          type: "boolean",
          description: "Read-only mode (prevents writes)",
          default: true,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_table_stats",
    description: "Get statistics about a database table (row count, columns)",
    inputSchema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          description: "Table name",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "backup_database",
    description: "Get information about database backups",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "list_tables",
    description: "List all database tables",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Token Management Tools
  {
    name: "award_klt_tokens",
    description: "Award KLT tokens to a user with a reason",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "User UUID",
        },
        amount: {
          type: "number",
          description: "Amount of KLT tokens",
        },
        reason: {
          type: "string",
          description: "Reason for awarding",
        },
      },
      required: ["user_id", "amount", "reason"],
    },
  },
  {
    name: "get_klt_leaderboard",
    description: "Get top KLT token holders leaderboard",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_token_airdrop",
    description:
      "Create a token airdrop to multiple users (requires confirmation)",
    inputSchema: {
      type: "object" as const,
      properties: {
        audience: {
          type: "string",
          enum: ["all", "founders", "active"],
          description: "Target audience",
        },
        amount_per_user: {
          type: "number",
          description: "KLT tokens per user",
        },
      },
      required: ["audience", "amount_per_user"],
    },
  },
  {
    name: "get_user_token_balance",
    description: "Get KLT token balance and transaction history for a user",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string",
          description: "User UUID",
        },
      },
      required: ["user_id"],
    },
  },

  // Cloudflare Tools
  {
    name: "get_zone_info",
    description: "Get Cloudflare zone information and status",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "run_cloudflare_diagnostics",
    description:
      "Run comprehensive Cloudflare diagnostics (SSL, security, cache settings)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "list_dns_records",
    description: "List DNS records for the zone",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          description: "Filter by record type (A, AAAA, CNAME, MX, TXT, etc.)",
        },
        name: {
          type: "string",
          description: "Filter by record name",
        },
      },
    },
  },
  {
    name: "create_dns_record",
    description: "Create a new DNS record",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          description: "Record type (A, AAAA, CNAME, MX, TXT, etc.)",
        },
        name: {
          type: "string",
          description: "Record name (e.g., www, api, @ for root)",
        },
        content: {
          type: "string",
          description: "Record content (IP address, domain, etc.)",
        },
        ttl: {
          type: "number",
          description: "TTL in seconds (1 for auto)",
          default: 1,
        },
        proxied: {
          type: "boolean",
          description: "Enable Cloudflare proxy",
          default: false,
        },
      },
      required: ["type", "name", "content"],
    },
  },
  {
    name: "delete_dns_record",
    description: "Delete a DNS record",
    inputSchema: {
      type: "object" as const,
      properties: {
        record_id: {
          type: "string",
          description: "DNS record ID",
        },
      },
      required: ["record_id"],
    },
  },
  {
    name: "purge_all_cache",
    description: "Purge all cache for the zone",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "purge_cache_by_url",
    description: "Purge cache for specific URLs",
    inputSchema: {
      type: "object" as const,
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to purge",
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "get_cloudflare_analytics",
    description: "Get Cloudflare analytics (requests, bandwidth, threats)",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze",
          default: 7,
        },
      },
    },
  },
  {
    name: "get_top_threats",
    description: "Get top threat sources by country",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days",
          default: 7,
        },
      },
    },
  },
  {
    name: "get_security_settings",
    description: "Get Cloudflare security settings (SSL, security level)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "set_security_level",
    description: "Set Cloudflare security level",
    inputSchema: {
      type: "object" as const,
      properties: {
        level: {
          type: "string",
          enum: ["off", "low", "medium", "high", "under_attack"],
          description: "Security level",
        },
      },
      required: ["level"],
    },
  },
  {
    name: "toggle_development_mode",
    description: "Toggle Cloudflare development mode (bypasses cache)",
    inputSchema: {
      type: "object" as const,
      properties: {
        enabled: {
          type: "boolean",
          description: "Enable or disable development mode",
        },
      },
      required: ["enabled"],
    },
  },
  {
    name: "list_firewall_rules",
    description: "List Cloudflare firewall rules",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_firewall_rule",
    description: "Create a new firewall rule",
    inputSchema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "Rule description",
        },
        expression: {
          type: "string",
          description: "Firewall expression (e.g., ip.src == 1.2.3.4)",
        },
        action: {
          type: "string",
          enum: ["block", "challenge", "js_challenge", "allow", "log"],
          description: "Action to take",
        },
        priority: {
          type: "number",
          description: "Rule priority (1-1000)",
          default: 100,
        },
      },
      required: ["description", "expression", "action"],
    },
  },
  {
    name: "list_page_rules",
    description: "List Cloudflare page rules",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "enable_under_attack_mode",
    description: "Enable Under Attack mode (DDoS protection)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "quick_purge_and_check",
    description: "Quick purge all cache and check zone status",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Supabase Edge Function Tools
  {
    name: "list_edge_functions",
    description: "List all Supabase Edge Functions",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "deploy_edge_function",
    description: "Deploy a Supabase Edge Function (provides instructions)",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description:
            "Name of the function to deploy (e.g., api-gateway, taj-trade-engine)",
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "list_secrets",
    description: "List all Supabase secrets",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "test_edge_function",
    description: "Test an Edge Function endpoint",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name (e.g., api-gateway)",
        },
        path: {
          type: "string",
          description: "Path to test (e.g., /health)",
          default: "/",
        },
        token: {
          type: "string",
          description: "Authorization token",
          default: "klarpakke-dev-token",
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "get_function_logs",
    description: "Get logs for an Edge Function",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name",
        },
        lines: {
          type: "number",
          description: "Number of log lines",
          default: 50,
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "test_system_status",
    description:
      "Test status of all Edge Functions (API Gateway, Taj, Moonshot)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Supabase CLI Tools
  {
    name: "run_supabase_command",
    description: "Run any Supabase CLI command",
    inputSchema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description:
            "Full command to run (e.g., 'supabase functions list --project-ref vuxbjlykgmzskxbclquf')",
        },
        description: {
          type: "string",
          description: "Description of what this command does",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "list_supabase_secrets",
    description: "List all Supabase secrets using CLI",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "set_supabase_secret",
    description: "Set a Supabase secret using CLI",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Secret name (e.g., API_GATEWAY_TOKEN)",
        },
        value: {
          type: "string",
          description: "Secret value",
        },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "list_edge_functions_cli",
    description: "List Edge Functions using CLI",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "deploy_edge_function_cli",
    description: "Deploy an Edge Function using CLI",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name to deploy (e.g., api-gateway)",
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "get_function_logs_cli",
    description: "Get function logs using CLI",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name",
        },
        lines: {
          type: "number",
          description: "Number of lines",
          default: 50,
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "test_api_endpoint",
    description: "Test API Gateway endpoint",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "deploy_all_functions",
    description: "Deploy all Edge Functions at once",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Migration Management Tools
  {
    name: "list_migrations",
    description: "List all database migrations and their status",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "repair_migration",
    description: "Repair a migration status (mark as applied or reverted)",
    inputSchema: {
      type: "object" as const,
      properties: {
        version: {
          type: "string",
          description: "Migration version (e.g., 20250213)",
        },
        status: {
          type: "string",
          enum: ["applied", "reverted"],
          description: "Status to set",
        },
      },
      required: ["version", "status"],
    },
  },
  {
    name: "push_migrations",
    description: "Push pending migrations to the database",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "check_migration_status",
    description: "Check for migration issues and pending migrations",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // Content Management Tools
  {
    name: "update_course_content",
    description: "Update course descriptions, titles, or status",
    inputSchema: {
      type: "object" as const,
      properties: {
        course_id: { type: "string", description: "Course UUID" },
        updates: { type: "object", description: "Fields to update" },
      },
      required: ["course_id", "updates"],
    },
  },
  {
    name: "update_lesson",
    description: "Modify lesson metadata and content",
    inputSchema: {
      type: "object" as const,
      properties: {
        lesson_id: { type: "string", description: "Lesson UUID" },
        updates: { type: "object", description: "Fields to update" },
      },
      required: ["lesson_id", "updates"],
    },
  },
  {
    name: "set_website_metrics",
    description:
      "Manually update the factual data stats displayed on the landing page",
    inputSchema: {
      type: "object" as const,
      properties: {
        metrics: {
          type: "object",
          properties: {
            total_profit_percentage: { type: "string" },
            years_tested: { type: "number" },
            active_users_count: { type: "number" },
          },
        },
      },
      required: ["metrics"],
    },
  },

  // Trading Operations Tools
  {
    name: "check_binance_balance",
    description:
      "Fetch real-time account balance from Binance (requires API keys)",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string", description: "User UUID" },
      },
      required: ["user_id"],
    },
  },
  {
    name: "generate_profit_report",
    description: "Generate a detailed profit/loss report for a user or global",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        days: { type: "number", default: 7 },
      },
    },
  },
  {
    name: "get_active_trades_summary",
    description:
      "Get a real-time summary of all active trades across the system",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "update_risk_parameters",
    description:
      "Update global or user-specific risk settings and leverage limits",
    inputSchema: {
      type: "object" as const,
      properties: {
        level: { type: "string", enum: ["low", "medium", "high"] },
        max_leverage: { type: "number" },
        user_id: { type: "string", description: "Optional: User UUID" },
      },
      required: ["level", "max_leverage"],
    },
  },
  {
    name: "panic_close_all",
    description:
      "🚨 Emergency: Close all open positions for a strategy or globally",
    inputSchema: {
      type: "object" as const,
      properties: {
        reason: { type: "string", description: "Reason for panic close" },
        strategy: { type: "string", description: "Optional: Strategy ID" },
      },
      required: ["reason"],
    },
  },

  // AI Control Tools
  {
    name: "update_coach_system_prompt",
    description: "Fine-tune the AI Coach's system prompt and behavior",
    inputSchema: {
      type: "object" as const,
      properties: {
        new_prompt: { type: "string" },
        version_note: { type: "string" },
      },
      required: ["new_prompt"],
    },
  },
  {
    name: "get_ai_usage_analytics",
    description:
      "Monitor AI token usage and costs across Moonshot/DeepSeek APIs",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: { type: "number", default: 7 },
      },
    },
  },

  // System Health Tools
  {
    name: "check_system_health",
    description:
      "Comprehensive health audit of database, functions, and error rates",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_growth_leaderboard",
    description: "Track top referrers and community growth metrics",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "audit_security_logs",
    description:
      "Scan security logs for suspicious login patterns or tool usage",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", default: 50 },
      },
    },
  },

  // ===== AUTOMATION TOOLS (100% AUTOMATION) =====
  {
    name: "execute_sql",
    description: "Execute SQL directly via migrations-runner Edge Function",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "SQL query to execute (SELECT, INSERT, UPDATE, etc.)",
        },
        description: {
          type: "string",
          description: "Description of what this SQL does",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "deploy_function_api",
    description: "Deploy Edge Function via Supabase Management API (bypasses CLI timeout)",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name to deploy (e.g., api-gateway, moonshot-chat)",
        },
        entrypoint: {
          type: "string",
          description: "Entry point file (default: index.ts)",
          default: "index.ts",
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "check_function_health",
    description: "Check health status of a deployed Edge Function",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name to check (e.g., api-gateway)",
        },
        test_payload: {
          type: "object",
          description: "Optional test payload to send",
        },
      },
      required: ["function_name"],
    },
  },
  {
    name: "run_migration_safe",
    description: "Run migration with validation and rollback support",
    inputSchema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description: "SQL statements to execute as migration",
        },
        migration_name: {
          type: "string",
          description: "Name for this migration (e.g., 'add_user_preferences')",
        },
        validate_query: {
          type: "string",
          description: "Optional validation query to run after migration",
        },
      },
      required: ["sql", "migration_name"],
    },
  },
  {
    name: "verify_jwt_settings",
    description: "Check and fix JWT verification settings for Edge Functions",
    inputSchema: {
      type: "object" as const,
      properties: {
        function_name: {
          type: "string",
          description: "Function name to verify (default: all functions)",
        },
      },
    },
  },

  // ===== TESTING TOOLS =====
  {
    name: "test_login_page",
    description: "Test the login page using Playwright - checks for OAuth buttons, email form, and takes a screenshot",
    inputSchema: {
      type: "object" as const,
      properties: {
        baseUrl: {
          type: "string",
          description: "Base URL to test (default: https://www.klarpakke.no)",
          default: "https://www.klarpakke.no",
        },
      },
    },
  },
  {
    name: "test_oauth_flow",
    description: "Test OAuth authentication flow - verifies redirect to Google or LinkedIn",
    inputSchema: {
      type: "object" as const,
      properties: {
        provider: {
          type: "string",
          enum: ["google", "linkedin"],
          description: "OAuth provider to test",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "test_page_accessibility",
    description: "Run accessibility checks on a page (alt text, labels, ARIA)",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "Full URL to test",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "run_lighthouse_audit",
    description: "Run Lighthouse performance audit on any page",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "Full URL to audit",
        },
        device: {
          type: "string",
          enum: ["mobile", "desktop"],
          description: "Device type for audit",
          default: "desktop",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "run_lighthouse_auth_pages",
    description: "Run Lighthouse audits on all auth pages (login, signup, dashboard)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },

  // ===== GITHUB TOOLS =====
  // Deployment Tools
  {
    name: "get_latest_deployment",
    description: "Get the latest deployment status from GitHub",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_deployment_history",
    description: "Get deployment history with status",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of deployments to return",
          default: 10,
        },
      },
    },
  },
  {
    name: "create_deployment",
    description: "Create a new GitHub deployment",
    inputSchema: {
      type: "object" as const,
      properties: {
        environment: {
          type: "string",
          description: "Deployment environment (e.g., production, staging)",
          default: "production",
        },
        ref: {
          type: "string",
          description: "Git ref (branch, tag, or SHA)",
          default: "main",
        },
        description: {
          type: "string",
          description: "Deployment description",
          default: "Deployed via MCP",
        },
      },
    },
  },

  // Commit Tools
  {
    name: "get_recent_commits",
    description: "Get recent commits for a branch",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of commits to return",
          default: 10,
        },
        branch: {
          type: "string",
          description: "Branch name",
          default: "main",
        },
      },
    },
  },

  // Issue Tools
  {
    name: "get_issues",
    description: "Get issues with optional state and label filters",
    inputSchema: {
      type: "object" as const,
      properties: {
        states: {
          type: "array",
          items: { type: "string", enum: ["OPEN", "CLOSED"] },
          description: "Issue states to filter by",
          default: ["OPEN"],
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to filter by",
        },
        limit: {
          type: "number",
          description: "Number of issues to return",
          default: 20,
        },
      },
    },
  },
  {
    name: "create_issue",
    description: "Create a new GitHub issue",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Issue title",
        },
        body: {
          type: "string",
          description: "Issue body/description",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to apply",
          default: [],
        },
        assignees: {
          type: "array",
          items: { type: "string" },
          description: "Usernames to assign",
          default: [],
        },
      },
      required: ["title", "body"],
    },
  },

  // Pull Request Tools
  {
    name: "get_pull_requests",
    description: "Get pull requests",
    inputSchema: {
      type: "object" as const,
      properties: {
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "PR state filter",
          default: "open",
        },
        limit: {
          type: "number",
          description: "Number of PRs to return",
          default: 10,
        },
      },
    },
  },

  // Release Tools
  {
    name: "get_releases",
    description: "Get recent releases",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of releases to return",
          default: 5,
        },
      },
    },
  },

  // Workflow Tools
  {
    name: "trigger_workflow",
    description: "Trigger a GitHub Actions workflow",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflow_id: {
          type: "string",
          description: "Workflow ID or filename (e.g., deploy.yml)",
        },
        branch: {
          type: "string",
          description: "Branch to run on",
          default: "main",
        },
        inputs: {
          type: "object",
          description: "Workflow inputs (key-value pairs)",
        },
      },
      required: ["workflow_id"],
    },
  },
  {
    name: "get_workflow_runs",
    description: "Get workflow run history",
    inputSchema: {
      type: "object" as const,
      properties: {
        workflow_id: {
          type: "string",
          description: "Workflow ID",
        },
        limit: {
          type: "number",
          description: "Number of runs to return",
          default: 5,
        },
      },
      required: ["workflow_id"],
    },
  },

  // Repository Tools
  {
    name: "get_repository_info",
    description: "Get repository information and statistics",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "compare_branches",
    description: "Compare two branches (ahead/behind commits)",
    inputSchema: {
      type: "object" as const,
      properties: {
        base: {
          type: "string",
          description: "Base branch to compare against",
        },
        head: {
          type: "string",
          description: "Head branch to compare",
        },
      },
      required: ["base", "head"],
    },
  },
  {
    name: "search_code",
    description: "Search code in the repository",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'filename:package.json')",
        },
        limit: {
          type: "number",
          description: "Number of results to return",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  console.error(`[MCP] Tool called: ${name}`);

  // Check rate limiting
  const rateLimit = await checkRateLimit(name);
  if (!rateLimit.allowed) {
    return {
      content: [
        {
          type: "text",
          text: `⏳ Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)}s`,
        },
      ],
      isError: true,
    };
  }

  // Get handler
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `❌ Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    // Execute tool
    const result = await handler(args);

    // Log to audit
    await logAudit({
      tool_name: name,
      input: args || {},
      output: { success: !result.isError },
      duration_ms: Date.now() - startTime,
      success: !result.isError,
      error: result.isError ? result.content[0].text : undefined,
    });

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";

    // Log error
    await logAudit({
      tool_name: name,
      input: args || {},
      output: { error },
      duration_ms: Date.now() - startTime,
      success: false,
      error,
    });

    return {
      content: [{ type: "text", text: `❌ Tool error: ${error}` }],
      isError: true,
    };
  }
});

// Handle resources (optional)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "klarpakke://dashboard",
        name: "Dashboard Overview",
        mimeType: "application/json",
        description: "Real-time dashboard metrics",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "klarpakke://dashboard") {
    // Return dashboard data
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    };
  }
  throw new Error(`Unknown resource: ${request.params.uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Klarpakke MCP Server running on stdio");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  Deno.exit(1);
});

# Klarpakke MCP Server - Quick Setup Guide

## 📁 Project Structure

```
klarpakke-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── clients/
│   │   ├── supabase.ts       # Supabase client with safety checks
│   │   ├── vercel.ts         # Vercel API client
│   │   └── resend.ts         # Resend email client
│   └── tools/
│       ├── analytics.ts      # Dashboard metrics, trends, funnel
│       ├── users.ts          # User management (CRUD, ban, founder)
│       ├── email.ts          # Email campaigns and stats
│       ├── deployment.ts     # Vercel deployments
│       ├── database.ts       # SQL queries with validation
│       └── tokens.ts         # KLT token management
├── supabase/migrations/
│   └── 20260213000000_mcp_setup.sql  # Database setup
├── deno.json                 # Deno configuration
├── package.json              # NPM metadata
└── README.md                 # Full documentation
```

## 🚀 Quick Start (5 minutes)

### 1. Install Deno
```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 2. Set Environment Variables
```bash
export SUPABASE_URL="https://vuxbjlykgmzskxbclquf.supabase.co"
export SUPABASE_KEY="your-service-role-key-here"
export VERCEL_TOKEN="your-vercel-token"      # Optional
export RESEND_API_KEY="your-resend-key"      # Optional
```

### 3. Run Database Migration
Go to Supabase Dashboard → SQL Editor → New Query:
```sql
-- Paste contents of: supabase/migrations/20260213000000_mcp_setup.sql
```

### 4. Test the Server
```bash
cd klarpakke-mcp-server
deno run --allow-all src/index.ts
```

You should see: `✅ Klarpakke MCP Server running on stdio`

### 5. Configure Claude Desktop

Edit your Claude Desktop config:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "klarpakke": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "/Users/taj/klarpakke/klarpakke-mcp-server/src/index.ts"
      ],
      "env": {
        "SUPABASE_URL": "https://vuxbjlykgmzskxbclquf.supabase.co",
        "SUPABASE_KEY": "<DIN_SUPABASE_ANON_KEY>",
        "VERCEL_TOKEN": "your-token",
        "RESEND_API_KEY": "re_..."
      }
    }
  }
}
```

### 6. Restart Claude Desktop

Claude should now see the Klarpakke tools! Test with:
> "Get dashboard metrics"

## 🛠️ Available Tools (24 total)

### Analytics (4)
- `get_dashboard_metrics` - Real-time stats
- `get_signup_trend` - Daily signup data
- `get_top_users` - Rank users
- `get_funnel_stats` - Conversion tracking

### Users (5)
- `search_users` - Find users
- `update_user` - Modify profiles
- `grant_founder_status` - Award founder + 10k KLT
- `ban_user` - Block users
- `get_user_details` - Full profile

### Email (3)
- `send_campaign` - Bulk emails
- `get_email_stats` - Open/click rates
- `list_recent_campaigns` - Campaign history

### Deployment (4)
- `get_deployment_status` - Health checks
- `deploy_to_production` - Deploy branch
- `rollback_deployment` - Revert deploy
- `list_deployments` - History

### Database (4)
- `run_sql_query` - Safe SQL execution
- `get_table_stats` - Table info
- `backup_database` - Backup info
- `list_tables` - Schema explorer

### Tokens (4)
- `award_klt_tokens` - Give tokens
- `get_klt_leaderboard` - Top holders
- `create_token_airdrop` - Mass distribution
- `get_user_token_balance` - User history

## 🔒 Security Features

✅ SQL injection protection (keyword filtering)
✅ Table allowlist validation
✅ Read-only by default for queries
✅ Rate limiting (100 req/min)
✅ Audit logging (all tool calls)
✅ RLS policies on tracking tables

## 📝 Example Queries

```
"How many signups today?"
"Show me users who signed up this week"
"Send welcome email to all founders"
"Award 5000 KLT to user abc-123 for referral"
"Deploy main to production"
"What's the conversion rate?"
"Run SQL: SELECT * FROM beta_signups LIMIT 5"
"Show top 10 KLT holders"
```

## 🔧 Troubleshooting

### "Cannot find module"
```bash
# Make sure Deno is installed
deno --version

# Clear cache if needed
deno cache --reload src/index.ts
```

### "No database connection"
- Check SUPABASE_URL and SUPABASE_KEY
- Use Service Role Key (not anon key)

### "Permission denied"
```bash
# Make sure to use --allow-all
deno run --allow-all src/index.ts
```

### Claude doesn't see tools
- Restart Claude Desktop completely
- Check config file path is correct
- Verify JSON syntax in config

## 📊 Tracking Setup

The server tracks:
1. **Signup Funnel** - Where users drop off
2. **Audit Logs** - Every tool call
3. **Error Tracking** - Failed operations

Views available:
```sql
SELECT * FROM v_funnel_conversion;
SELECT * FROM v_mcp_usage_stats;
```

## 🎉 You're Done!

Claude can now:
- 📊 View real-time analytics
- 👥 Manage users and tokens
- 📧 Send email campaigns
- 🚀 Deploy to production
- 🗄️ Query the database
- 🪙 Manage KLT tokens

All with proper security and audit logging!

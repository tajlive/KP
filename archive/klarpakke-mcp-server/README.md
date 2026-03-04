# Klarpakke MCP Server

Model Context Protocol (MCP) server for managing Klarpakke Universitet. Connects Claude to your data and tools for seamless admin operations.

## Features

### 📊 Analytics Tools
- **Dashboard Metrics** - Real-time user stats, signups, MRR, conversion rates
- **Signup Trends** - Daily signup data with ASCII charts
- **Top Users** - Rank users by trades, referrals, or KLT holdings
- **Funnel Stats** - Conversion tracking at each signup step

### 👥 User Management
- **Search Users** - Find by email, name, or status
- **Update User** - Modify profile fields, roles, status
- **Grant Founder Status** - Award founder role + 10,000 KLT tokens
- **Ban User** - Block users with reason logging
- **User Details** - Comprehensive user profile view

### 📧 Email Campaigns
- **Send Campaign** - Targeted emails to segments (all, founders, inactive)
- **Templates** - Welcome, reminder, feedback
- **Bulk Email** - Rate-limited batch sending
- **Campaign Stats** - Track opens, clicks, bounces

### 🚀 Deployment
- **Deploy to Production** - Trigger Vercel deployments
- **Rollback** - Revert to previous deployment
- **Health Checks** - Monitor endpoint status
- **Deployment List** - View recent deployments

### 🗄️ Database
- **SQL Queries** - Safe execution with validation
- **Table Stats** - Row counts, columns, indexes
- **Backup Info** - Backup management
- **Schema Explorer** - List tables and columns

### 🪙 KLT Token Management
- **Award Tokens** - Give tokens with reasons
- **Leaderboard** - Top KLT holders
- **Airdrops** - Mass distribution to segments
- **Balance Check** - User token history

## Installation

### Prerequisites
- [Deno](https://deno.land/) >= 1.40.0
- Supabase project
- Vercel account (optional)
- Resend API key (optional)

### Setup

1. **Clone and navigate:**
```bash
cd klarpakke-mcp-server
```

2. **Set environment variables:**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-role-key"
export VERCEL_TOKEN="your-vercel-token"  # Optional
export RESEND_API_KEY="your-resend-key"  # Optional
```

3. **Test the server:**
```bash
deno run --allow-all src/index.ts
```

## Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "klarpakke": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "/path/to/klarpakke-mcp-server/src/index.ts"
      ],
      "env": {
        "SUPABASE_URL": "https://vuxbjlykgmzskxbclquf.supabase.co",
        "SUPABASE_KEY": "your-service-role-key",
        "VERCEL_TOKEN": "your-vercel-token",
        "RESEND_API_KEY": "your-resend-key"
      }
    }
  }
}
```

## Database Setup

Run the migration to create tracking tables:

```sql
-- Execute in Supabase SQL Editor
-- Migration: 20260213000000_funnel_tracking.sql

-- Funnel tracking table
CREATE TABLE IF NOT EXISTS public.signup_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  step_number INTEGER,
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signup_funnel_session ON signup_funnel(session_id);
CREATE INDEX idx_signup_funnel_event ON signup_funnel(event_type);
CREATE INDEX idx_signup_funnel_created ON signup_funnel(created_at DESC);

ALTER TABLE signup_funnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can track funnel"
  ON signup_funnel FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view funnel"
  ON signup_funnel FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Audit log table
CREATE TABLE IF NOT EXISTS public.mcp_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_audit_tool ON mcp_audit_logs(tool_name);
CREATE INDEX idx_mcp_audit_timestamp ON mcp_audit_logs(timestamp DESC);

ALTER TABLE mcp_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit"
  ON mcp_audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view audit"
  ON mcp_audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));
```

## Usage Examples

### Analytics
```
"Get dashboard metrics for the last 7 days"
"Show me the signup trend for the past 30 days"
"Who are the top 10 users by KLT holdings?"
"What's our current conversion funnel looking like?"
```

### User Management
```
"Search for user with email tom@example.com"
"Grant founder status to user_id: abc-123"
"Ban user xyz-789 for spamming"
"Show details for user abc-123"
```

### Email Campaigns
```
"Send welcome email to all founders"
"Send reminder to inactive users"
"What are our email stats?"
"List recent campaigns"
```

### Deployments
```
"Get deployment status"
"Deploy main branch to production"
"List recent deployments"
"Rollback to deployment dpl_123"
```

### Database
```
"Run SQL: SELECT * FROM beta_signups LIMIT 10"
"Get stats for profiles table"
"List all tables"
"How do I backup the database?"
```

### Token Management
```
"Award 5000 KLT to user abc-123 for referral"
"Show the KLT leaderboard"
"Create airdrop of 1000 KLT to all active users"
"Check token balance for user xyz-789"
```

## Security

### API Keys
- Use **Service Role Key** for Supabase (full admin access)
- Store keys in environment variables, never in code
- Rotate keys regularly

### SQL Safety
- Read-only mode by default
- Forbidden keywords: DROP, DELETE, TRUNCATE, ALTER, CREATE, GRANT
- Table allowlist validation
- Confirmation required for write operations

### Rate Limiting
- 100 requests per minute per tool
- Configurable in `checkRateLimit()` function

### Audit Logging
- All tool calls logged to `mcp_audit_logs`
- Includes: tool name, input, output, duration, success/error
- Queryable for compliance and debugging

## Architecture

```
┌─────────────────┐
│  Claude Desktop │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  MCP Server     │────┐
│  (Deno/TS)      │    │
└────────┬────────┘    │
         │             │
    ┌────┴────┬────────┤
    ▼         ▼        ▼
┌───────┐ ┌───────┐ ┌────────┐
│Supabase│ │Vercel │ │Resend  │
└───────┘ └───────┘ └────────┘
```

## Development

```bash
# Run in watch mode
deno task dev

# Type check
deno task check

# Format code
deno fmt

# Lint
deno lint
```

## Troubleshooting

### "No database connection"
- Check SUPABASE_URL and SUPABASE_KEY are set
- Ensure service role key has proper permissions

### "Rate limit exceeded"
- Wait 60 seconds between requests
- Check mcp_audit_logs for usage patterns

### "Tool error"
- Check Deno has --allow-all permissions
- Verify all environment variables
- Review mcp_audit_logs for error details

## License

MIT License - Klarpakke AS 2026

## Support

For issues or questions:
- Email: post@klarpakke.no
- GitHub Issues: [your-repo]/issues

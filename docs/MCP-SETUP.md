# 🔌 MCP Setup for Cloudflare & Supabase

This guide configures MCP (Model Context Protocol) servers to allow AI direct access to your Cloudflare and Supabase services.

## ✅ What MCP Enables

| Service | With MCP | Without MCP |
|---------|----------|-------------|
| **Cloudflare DNS** | "List DNS records for klarpakke.no" → Instant results | Manual API calls or dashboard clicks |
| **Supabase DB** | "Show last 10 signals" → Direct query results | Manual SQL queries in dashboard |
| **Edge Functions** | "Deploy approve-signal function" → Auto-deploy | Manual CLI commands |
| **Analytics** | "Get page views for last 7 days" → Instant data | Manual report generation |

## 🚀 Quick Setup

### Step 1: Get Your Tokens

#### Supabase Access Token
1. Go to https://supabase.com/dashboard/account/tokens
2. Click **"New token"**
3. Give it a name (e.g., "kimi-cli")
4. Copy the token (starts with `sbp_`)

#### Cloudflare API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Custom token"** template
4. Set permissions:
   - **Zone:Read** (for listing zones)
   - **Zone.DNS:Edit** (for managing DNS)
   - **Cloudflare Pages:Edit** (for deployments)
5. Under **Zone Resources**, select your domain (`klarpakke.no`)
6. Copy the token

#### GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes:
   - **repo** (full repository access)
   - **workflow** (GitHub Actions)
   - **project** (project boards)
   - **read:org** (organization read)
4. Copy the token (starts with `ghp_`)

### Step 2: Run Setup Script

```bash
cd /Users/taj/klarpakke
chmod +x scripts/setup-mcp-env.sh
./scripts/setup-mcp-env.sh
```

Enter your tokens when prompted.

### Step 3: Reload Shell

```bash
source ~/.zshrc
```

Or restart your terminal.

### Step 4: Verify Setup

```bash
kimi --mcp-status
```

You should see:
```
✅ supabase: Connected
✅ cloudflare: Connected
✅ github: Connected
```

## 🎯 Usage Examples

### Cloudflare Examples

```
# List all DNS records
"Show all DNS records for klarpakke.no"

# Add a new record
"Add an A record for api.klarpakke.no pointing to 1.2.3.4"

# Check SSL status
"Is SSL enabled for klarpakke.no?"

# Deploy Pages
"Deploy the latest version to Cloudflare Pages"
```

### Supabase Examples

```
# Query database
"Show me the last 10 trading signals from the signals table"

# Check auth
"How many users signed up today?"

# Edge functions
"List all edge functions"
"Deploy the approve-signal edge function"

# Storage
"Show me files in the avatars bucket"
```

### GitHub Examples

```
# Issues
"List all open issues in klarpakke repo"
"Create issue: Fix login button on mobile"
"Close issue #42 as completed"

# Pull Requests
"List open PRs"
"Review PR #15 and check if tests pass"
"Merge PR #20 with squash commit"

# Repository
"Show recent commits to main"
"What's the status of GitHub Actions?"
"Search for TODO comments in codebase"

# Project Board
"Show project board"
"Move issue #10 to In Progress"
"List high priority issues"
```

## 🔧 Configuration File

MCP servers are configured in `~/.kimi/config.toml`:

```toml
[[mcp.servers]]
name = "supabase"
command = "npx"
args = ["-y", "@supabase/mcp-server@latest"]
env = { SUPABASE_ACCESS_TOKEN = "${SUPABASE_ACCESS_TOKEN}", SUPABASE_PROJECT_ID = "swfyuwkptusceiouqlks" }

[[mcp.servers]]
name = "cloudflare"
command = "npx"
args = ["wrangler", "mcp"]
env = { CLOUDFLARE_API_TOKEN = "${CLOUDFLARE_API_TOKEN}" }

[[mcp.servers]]
name = "github"
command = "npx"
args = ["-y", "@github/mcp-server"]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "${GITHUB_TOKEN}" }
```

## 🛠️ Troubleshooting

### "Command not found: npx"
```bash
npm install -g npx
```

### "Token invalid" errors
- Check that tokens haven't expired
- Regenerate tokens if needed
- Run setup script again

### MCP servers not connecting
```bash
# Check status
kimi --mcp-status

# Restart kimi
/exit
kimi
```

## 🔐 Security

- **Never commit tokens** to git (already in `.gitignore`)
- **Use environment variables** instead of hardcoding
- **Rotate tokens** periodically
- **Use minimal permissions** (done in setup above)

## 📚 Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/supabase-community/mcp-server-supabase)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/)

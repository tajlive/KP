# Cloudflare MCP Tools Guide

**Extension:** MCP Server with Cloudflare API tools
**Status:** ✅ Active
**Tools:** 6 Cloudflare operations

---

## 🎯 Overview

The MCP server now includes 6 Cloudflare CLI tools for managing:
- Secrets (list, add, delete)
- Pages deployments
- Workers
- KV namespaces
- Configuration validation

---

## 📋 Available Tools

### 1. `cf_whoami`
**Get current Cloudflare account info**

```bash
@claude "Show me my Cloudflare account"
```

Returns:
- Account name
- Account ID
- OAuth token permissions
- API access level

---

### 2. `cf_secret_list`
**List all production secrets**

```bash
@claude "List all Cloudflare secrets"
```

Shows:
- All secrets in production environment
- Count of secrets
- Last modified dates

---

### 3. `cf_pages_deploy`
**Deploy to Cloudflare Pages**

```bash
@claude "deploy to Cloudflare Pages"
# or
@claude "deploy the dist folder to Cloudflare"
```

Parameters:
- `directory` - Directory to deploy (default: `dist`)

Returns:
- Deployment status
- URL of deployed site
- Build logs

---

### 4. `cf_pages_status`
**Check Pages deployment status**

```bash
@claude "check my Cloudflare Pages status"
```

Shows:
- All Pages projects
- Last deployment date
- Current status

---

### 5. `cf_kv_list`
**List KV namespaces**

```bash
@claude "list my KV namespaces"
```

Returns:
- All KV namespaces
- Namespace IDs
- Usage info

---

### 6. `cf_validate_config`
**Validate wrangler.toml configuration**

```bash
@claude "validate my Cloudflare config"
```

Checks:
- wrangler.toml syntax
- Environment variables
- Deployment configuration

---

## 🔐 Secrets Management

### List All Secrets
```bash
@claude "show all my production secrets"
```

### Add a New Secret
```bash
@claude "add a new secret to Cloudflare"
```

**Note:** For security, you'll be prompted to enter the secret value.

### Delete a Secret
```bash
@claude "delete the STRIPE_SECRET_KEY from Cloudflare"
```

---

## 🚀 Deployment Examples

### Deploy Latest Build
```bash
@claude "build and deploy to Cloudflare Pages"
```

This:
1. Runs `npm run build`
2. Deploys `dist` to Cloudflare
3. Shows deployment URL

### Check Deployment Status
```bash
@claude "show my Cloudflare Pages deployments"
```

---

## 📊 Quick Commands

| Task | Command | Tool |
|------|---------|------|
| **Show account** | `@claude "whoami cloudflare"` | `cf_whoami` |
| **List secrets** | `@claude "list secrets"` | `cf_secret_list` |
| **Deploy** | `@claude "deploy to pages"` | `cf_pages_deploy` |
| **Check status** | `@claude "pages status"` | `cf_pages_status` |
| **List KV** | `@claude "list kv"` | `cf_kv_list` |
| **Validate** | `@claude "validate config"` | `cf_validate_config` |

---

## 🔗 Integration with Existing Tools

### With Git Tools
```bash
@claude "commit changes, then deploy to Cloudflare"
```

Combines:
1. `git_commit`
2. `run_build`
3. `cf_pages_deploy`

### With Build Tools
```bash
@claude "build the app, verify it, then deploy"
```

Combines:
1. `run_build`
2. `run_lint`
3. `cf_pages_deploy`

### With MCP Automation
```bash
gh workflow run mcp-automation.yml -f action=deploy-production
```

Triggers:
1. Full build verification
2. Deployment to Cloudflare
3. Status check

---

## 🛡️ Security Best Practices

### For Secrets
- ✅ Never paste secrets in commands
- ✅ Use wrangler prompts for secret values
- ✅ Rotate secrets regularly
- ✅ Review secret access logs

### For Deployments
- ✅ Test in staging first
- ✅ Verify build before deploy
- ✅ Check deployment status
- ✅ Monitor error logs after deploy

### For API Access
- ✅ Use OAuth (not API tokens where possible)
- ✅ Limit token scopes
- ✅ Rotate tokens quarterly
- ✅ Use separate tokens per environment

---

## 🐛 Troubleshooting

### "Not logged in to Cloudflare"
```bash
wrangler login
# Then authenticate with Google/Cloudflare
```

### "Permission denied on secret operations"
Check that your Cloudflare token has `secrets_store:write` scope.

### "Deployment failed"
```bash
# Check logs
wrangler pages projects list

# Verify config
wrangler publish --dry-run

# Check build
npm run build
```

### "KV namespace not found"
```bash
# List available namespaces
wrangler kv:namespace list

# Create new one if needed
wrangler kv:namespace create "my-namespace"
```

---

## 📈 Common Workflows

### Daily Development
```bash
# 1. Check status
@claude "cf whoami"

# 2. Make changes
# Edit code...

# 3. Build & deploy
@claude "build and deploy to pages"

# 4. Verify
@claude "check pages status"
```

### Secrets Management
```bash
# 1. List current secrets
@claude "list all secrets"

# 2. Rotate a secret
@claude "delete old STRIPE_SECRET_KEY and add new one"

# 3. Verify
@claude "list all secrets"
```

### Pre-deployment Checks
```bash
@claude "validate config and list secrets"
```

---

## 🔧 Manual Cloudflare Operations

For operations not covered by MCP tools, access:

- **Dashboard:** https://dash.cloudflare.com/
- **API Tokens:** https://dash.cloudflare.com/profile/api-tokens
- **Pages:** https://dash.cloudflare.com/sites/pages
- **Workers:** https://dash.cloudflare.com/workers
- **KV:** https://dash.cloudflare.com/kv

---

## 📚 Related Documentation

- [MCP Integration Guide](./MCP-INTEGRATION.md)
- [Secrets Migration Plan](../SECRETS-MIGRATION-PLAN.md)
- [Cloudflare Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Pages Documentation](https://developers.cloudflare.com/pages/)

---

## ✅ Checklist: Cloudflare MCP Setup

- [x] Cloudflare tools added to MCP server
- [x] Tools compiled and ready
- [x] Documentation created
- [x] Examples provided
- [x] Security guidelines included
- [ ] Secrets migrated to Cloudflare
- [ ] First deployment tested
- [ ] Team trained on tools

---

**Status:** ✅ Ready to use
**Update:** 2026-02-02
**Version:** 1.0.0

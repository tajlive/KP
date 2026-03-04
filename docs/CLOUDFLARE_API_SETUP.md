# 🔑 Cloudflare API Setup for Automated Fixes

**Required for:** Automated domain routing fixes via GitHub Actions

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Get Cloudflare API Token

1. Login to Cloudflare Dashboard: https://dash.cloudflare.com
2. Go to: **My Profile** → **API Tokens** → **Create Token**
3. Use template: **Edit Cloudflare Workers**
4. Or create custom token with these permissions:
   - **Account** → Cloudflare Pages: **Edit**
   - **Zone** → Cache Purge: **Purge**
   - **Zone** → DNS: **Edit** (optional)

5. **Zone Resources:**
   - Include → Specific zone → `klarpakke.no`

6. **Account Resources:**
   - Include → All accounts (or specific account)

7. Click **Continue to summary** → **Create Token**
8. **COPY THE TOKEN NOW** (shown only once!)

---

### Step 2: Get Account ID

1. In Cloudflare Dashboard
2. Select any domain
3. Scroll down in Overview page
4. Copy **Account ID** from right sidebar

Example: `abc123def456ghi789jkl012mno345pq`

---

### Step 3: Get Zone ID (for cache purge)

1. In Cloudflare Dashboard
2. Select `klarpakke.no` domain
3. Go to **Overview**
4. Scroll down to right sidebar
5. Copy **Zone ID**

Example: `xyz789abc456def123ghi890jkl567mn`

---

### Step 4: Add Secrets to GitHub

1. Go to: https://github.com/klarpakke/klarpakke/settings/secrets/actions

2. Click **New repository secret**

3. Add these 3 secrets:

#### Secret 1: CLOUDFLARE_API_TOKEN
```
Name: CLOUDFLARE_API_TOKEN
Value: [paste your API token from Step 1]
```

#### Secret 2: CLOUDFLARE_ACCOUNT_ID
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: [paste your Account ID from Step 2]
```

#### Secret 3: CLOUDFLARE_ZONE_ID (optional but recommended)
```
Name: CLOUDFLARE_ZONE_ID
Value: [paste your Zone ID from Step 3]
```

---

## 🚀 Run the Automated Fix

### Method 1: Via GitHub Actions UI (Recommended)

1. Go to: https://github.com/klarpakke/klarpakke/actions
2. Select workflow: **🔧 Fix Domain Routing**
3. Click **Run workflow** → **Run workflow**
4. Wait 1-2 minutes
5. Check the logs for success ✅

### Method 2: Via CLI

```bash
# Trigger workflow manually
gh workflow run "fix-domain-routing.yml"

# Watch the run
gh run watch

# Or view all runs
gh run list --workflow="fix-domain-routing.yml"
```

---

## 📊 What the Workflow Does

### Automatic Steps:

1. **📋 Lists all Pages projects**
   - Finds all Cloudflare Pages projects in your account
   - Identifies which project has `klarpakke.no`

2. **🔍 Checks custom domains**
   - Verifies which project `klarpakke.no` is attached to
   - Detects if it's on the wrong project

3. **🔧 Removes domain from wrong project**
   - Only if domain is on incorrect project
   - Uses DELETE API call

4. **➕ Adds domain to correct project**
   - Attaches `klarpakke.no` to `klarpakke` project
   - Uses POST API call

5. **🗑️ Purges cache**
   - Clears Cloudflare cache for immediate effect
   - Optional (requires ZONE_ID)

6. **✅ Verifies fix**
   - Tests domain response
   - Creates success issue with details

---

## 🔍 Verify It Worked

### Immediately after workflow:

```bash
# Check workflow status
gh run list --workflow="fix-domain-routing.yml" --limit 1

# View detailed logs
gh run view --log
```

### After 5-10 minutes (DNS propagation):

```bash
# Test domain
curl -I https://klarpakke.no

# Should show 200 OK and trading platform content
curl -s https://klarpakke.no | grep -i "trading-signaler"

# Open in browser (clear cache first!)
open https://klarpakke.no
```

### Expected Results:

✅ **Correct:** "Få Trading-Signaler Før Alle Andre"  
❌ **Wrong:** "Welcome to Klarpakke Pro" (Webflow CMS)

---

## 🚨 Troubleshooting

### Workflow fails with "401 Unauthorized"

**Cause:** Invalid or missing API token

**Fix:**
1. Regenerate API token in Cloudflare
2. Update `CLOUDFLARE_API_TOKEN` in GitHub Secrets
3. Rerun workflow

### Workflow fails with "403 Forbidden"

**Cause:** API token lacks required permissions

**Fix:**
1. Edit API token in Cloudflare
2. Add missing permissions:
   - Account → Cloudflare Pages: **Edit**
   - Zone → Cache Purge: **Purge**
3. Update token in GitHub Secrets

### Workflow succeeds but domain still shows wrong site

**Cause:** DNS cache / Browser cache

**Fix:**
```bash
# 1. Clear DNS cache (Mac)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 2. Clear browser cache
# Chrome: Cmd+Shift+Delete
# Safari: Cmd+Option+E

# 3. Test with curl (bypasses cache)
curl -H "Cache-Control: no-cache" https://klarpakke.no

# 4. Test in incognito mode
open -na "Google Chrome" --args --incognito https://klarpakke.no
```

### Domain not found in any project

**Possible causes:**
1. Domain was manually removed
2. Wrong account ID
3. DNS not pointing to Pages

**Fix:**
```bash
# List all projects
wrangler pages project list

# Check DNS
dig klarpakke.no
nslookup klarpakke.no

# Should point to: *.pages.dev
```

---

## 📦 Manual Backup Method (if workflow fails)

If the automated workflow doesn't work, use the API directly:

### List all projects:
```bash
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/pages/projects" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[].name'
```

### Check domains on a project:
```bash
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/pages/projects/PROJECT_NAME/domains" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[].name'
```

### Remove domain from wrong project:
```bash
curl -X DELETE \
  "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/pages/projects/WRONG_PROJECT/domains/klarpakke.no" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

### Add domain to correct project:
```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/pages/projects/klarpakke/domains" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "klarpakke.no"}'
```

### Purge cache:
```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```

---

## 📚 API Documentation

- **Cloudflare API Docs:** https://developers.cloudflare.com/api/
- **Pages API:** https://developers.cloudflare.com/api/resources/pages/
- **Domain Management:** https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/

---

## ✅ Security Best Practices

1. **Use scoped tokens:** Only grant necessary permissions
2. **Rotate tokens regularly:** Every 90 days recommended
3. **Never commit tokens:** Always use GitHub Secrets
4. **Audit token usage:** Check Cloudflare Audit Log
5. **Revoke unused tokens:** Clean up old tokens

---

## 🔗 Related Documentation

- [Fix Domain Routing Workflow](../.github/workflows/fix-domain-routing.yml)
- [Deployment Fix Guide](../README_DEPLOYMENT_FIX.md)
- [Cloudflare Pages Configuration](https://developers.cloudflare.com/pages/)

---

**Created:** 2026-02-02  
**Last Updated:** 2026-02-02  
**Maintained by:** Klarpakke Autonomous AI Agent v2.0

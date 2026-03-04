# Cloudflare Pages Deployment Setup

## Get Cloudflare Credentials

### 1. Cloudflare Account ID

```bash
# Go to: https://dash.cloudflare.com/
# Bottom left → Click on account name
# Copy: Account ID (looks like: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6)
```

### 2. Cloudflare API Token (for wrangler)

**Option A: Full Account Token (Simple, Recommended for testing)**

```bash
# Go to: https://dash.cloudflare.com/profile/api-tokens
# Click: "Create Token"
# Choose: "Edit Cloudflare Workers"
# Or: Create custom token with:
#   - Permissions: Account.Cloudflare Pages:Edit
#   - Account Resources: Include "All accounts"
# Copy the token (starts with: "v1.0-")
```

**Option B: Limited Scope Token (Production Recommended)**

```bash
# Same as above but select only:
# - Permission: "Cloudflare Pages - Edit"
# - Zone: Your domain (if applicable)
# - Account: Your account only
```

---

## Add to GitLab CI/CD

### Step 1: Go to GitLab Project Settings

```
https://gitlab.com/YOUR_GROUP/klarpakke
  → Settings
  → CI/CD
  → Variables
```

### Step 2: Add These Variables

| Variable Name | Value | Protected | Masked |
|---|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Your Account ID | ✓ | ✓ |
| `CLOUDFLARE_API_TOKEN` | Your API Token | ✓ | ✓ |

### Step 3: Verify in wrangler.toml

```toml
name = "klarpakke"
pages_build_output_dir = "out"

[env.production]
vars = { CLOUDFLARE_ACCOUNT_ID = "YOUR_ID" }
```

---

## Test Locally (Optional)

```bash
# Login with wrangler
wrangler login

# Deploy manually
wrangler pages deploy out/ --project-name=klarpakke --branch=main

# If successful, you should see:
# ✓ Deployment complete! Access your site at:
# https://klarpakke.pages.dev
```

---

## Common Errors & Fixes

### ❌ "Error: Invalid API token"
- Check: Token is valid in Cloudflare Dashboard
- Check: Token has Pages permissions
- Fix: Regenerate token with correct scope

### ❌ "Error: No Pages project found"
- Check: Project name matches `wrangler.toml` (should be `klarpakke`)
- Check: Project exists in Cloudflare Pages dashboard
- Fix: Create project: `wrangler pages project create klarpakke`

### ❌ "Error: Unauthorized"
- Check: Account ID is correct
- Check: Token has "Account" scope
- Fix: Use token with "All accounts" scope

### ❌ "Error: 403 Forbidden"
- Check: API token permissions
- Fix: Create new token with Pages scope

---

## Verify Deployment

After first successful deploy:

```bash
# Check Pages project
https://dash.cloudflare.com/
  → Workers & Pages
  → Pages
  → "klarpakke" project
```

You should see deployments listed with status (Active/Failed).

---

## Connect Custom Domain (Optional)

```
Cloudflare Pages project settings
  → Custom domains
  → Add custom domain
  → Add: www.klarpakke.no
  → Follow DNS setup instructions
```

---

## Debug Pipeline Deployment

View GitLab pipeline logs:

```bash
# In GitLab UI:
CI/CD → Pipelines → [Pipeline ID]
  → deploy:cloudflare → [See full log]

# Look for:
# - ✓ "Deployment complete"
# - ✓ "Access your site at: https://klarpakke.pages.dev"
```

If deployment still fails, check:
1. `.gitlab-ci.yml` syntax (use GitLab CI Lint)
2. Cloudflare credentials are correct
3. Project name in `wrangler.toml` matches CLI deployment
4. `out/` directory exists and has content


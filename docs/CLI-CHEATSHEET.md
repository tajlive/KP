# 🚀 CLI Cheat Sheet - Klarpakke

Hurtigreferanse for alle CLI-verktøy.

## Cloudflare (Wrangler)

```bash
# Install
npm i -g wrangler

# Login
wrangler login

# Deploy Pages
wrangler pages deploy webflow-pages --project-name=klarpakke

# Check deploy status
wrangler pages deployment list --project-name=klarpakke

# Purge cache
wrangler cache purge --host=www.klarpakke.no
```

## Supabase

```bash
# Link project
supabase link --project-ref swfyuwkptusceiouqlks

# Deploy Edge Functions
supabase functions deploy

# Deploy single function
supabase functions deploy get-entitlements

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx

# List secrets
supabase secrets list

# Database
supabase db push
supabase db reset

# Check status
supabase status
```

## GitHub

```bash
# Authenticate
gh auth login

# Repo
gh repo view
gh repo sync

# Actions
gh workflow run deploy-cloudflare.yml
gh workflow view ci.yml --web

# Secrets
gh secret set CLOUDFLARE_API_TOKEN
gh secret list

# PRs
gh pr create --title "feat: new feature"
gh pr merge
```

## Git

```bash
# Standard flow
git add -A
git commit -m "feat: description"
git push origin main

# Check status
git status
git log --oneline -5

# Branches
git checkout -b feature/name
git branch -a
```

## Node.js / npm

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Build
npm run build

# Lint & format
npm run lint
npm run format

# Upgrade dependencies
cd klarpakke-app && npm run upgrade
```

## Biome

```bash
# Check
npx biome check .

# Fix
npx biome check . --write

# Format only
npx biome format . --write
```

## cURL (testing)

```bash
# Test site
curl -I https://www.klarpakke.no/status

# Test Supabase
curl -s https://swfyuwkptusceiouqlks.supabase.co/auth/v1/settings \
  -H "apikey: YOUR_ANON_KEY"

# DNS check
dig www.klarpakke.no +short
```

## Quick Fixes

### Redeploy Cloudflare Pages manually
```bash
# Via Wrangler
wrangler pages deploy webflow-pages --project-name=klarpakke --branch=main
```

### Fix "Invalid API key"
```bash
# 1. Check what Cloudflare serves
curl -s https://www.klarpakke.no/signup | grep "SUPABASE_ANON_KEY"

# 2. Check GitHub
curl -s https://raw.githubusercontent.com/klarpakke/klarpakke/main/webflow-pages/index.html | grep "SUPABASE_ANON_KEY"

# 3. If different, redeploy Cloudflare Pages
```

### Update all files with new API key
```bash
# Replace in all HTML files
cd webflow-pages
OLD_KEY="old_key_here"
NEW_KEY="new_key_here"
for file in *.html; do
  sed -i '' "s|$OLD_KEY|$NEW_KEY|g" "$file"
done
```

---

Save this file! 📌

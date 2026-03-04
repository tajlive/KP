# Klarpakke CI/CD Setup Guide

Automated setup for GitLab CI/CD pipeline with database migrations, builds, deployments, and E2E tests.

## 📋 Prerequisites

- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
- SUPABASE_DB_URL (PostgreSQL connection string)
- Cloudflare Pages project (`klarpakke`)
- GitLab project (with CI/CD enabled)

## 🚀 Quick Start

### Step 1: Generate Postgres Connection String

Go to **Supabase Dashboard**:
```
https://app.supabase.com/project/[PROJECT_REF]/settings/database
```

1. Click **"Connection string"** tab
2. Select **"psql"** from dropdown
3. Copy the entire string (starts with `postgresql://`)
4. Export in terminal:

```bash
export SUPABASE_DB_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres?sslmode=require"
```

### Step 2: Verify Database Connection

Test that migrations work locally:

```bash
export SUPABASE_DB_URL="postgresql://..."
bash scripts/supabase/apply-migrations.sh
```

If successful, you should see:
```
OK: supabase db push
(or)
Applied: supabase/migrations/*.sql
```

### Step 3: Run Full Local Pipeline

```bash
# Migrations → Type Check → Build → (Optional: Deploy + Test)
bash scripts/ci/setup-auto.sh

# Or with deployment:
DEPLOY=true TEST=true bash scripts/ci/setup-auto.sh
```

### Step 4: Generate GitLab CI Variables

```bash
bash scripts/ci/generate-gitlab-vars.sh
```

This will prompt for:
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Stripe keys (Secret, Webhook, Price IDs)
- VAPID keys (Push notifications)

Output: `.gitlab-ci.env.json`

### Step 5: Add to GitLab CI/CD

**Manual (Recommended for first time):**

1. Go to **Settings → CI/CD → Variables** in GitLab
2. Add each variable from the `.gitlab-ci.env.json` file
3. Mark secret/key variables as **Protected** and **Masked**

**Via API:**

```bash
# Use the helper script output to run curl commands
# (See output from generate-gitlab-vars.sh)
```

### Step 6: Commit and Push

```bash
git add .gitlab-ci.yml .gitlab-ci.env.json
git commit -m "ci: automated setup with full pipeline"
git push origin main
```

Watch the pipeline at: https://gitlab.com/YOUR_GROUP/klarpakke/-/pipelines

## 📊 Pipeline Stages

```
┌─ db:migrate
│  └─ Run supabase/migrations via psql
│
├─ build:app
│  ├─ npm ci
│  ├─ npm run type-check
│  └─ npm run build → out/
│
├─ deploy:pages
│  └─ wrangler pages deploy → www.klarpakke.no
│
├─ test:beta:apply
│  └─ scripts/tests/beta-apply-e2e.mjs
│
└─ monitor:prod:health (scheduled hourly)
   └─ scripts/recovery/verify-prod.sh
```

## 🛠 Scripts Reference

### Local Development

```bash
# Type check
npm run type-check

# Build
npm run build

# Full automated pipeline
bash scripts/ci/setup-auto.sh

# Database only
export SUPABASE_DB_URL="..."
bash scripts/supabase/apply-migrations.sh
```

### i18n Validation

```bash
# Check that all beta page translations are present
bash check-i18n.sh
```

### Manual CI Tasks

```bash
# Generate/update GitLab variables
bash scripts/ci/generate-gitlab-vars.sh

# Interactive setup (includes .gitlab-ci.yml generation)
bash setup-ci-env.sh
```

## 🔐 Environment Variables

### Required for Production

| Variable | Source | Notes |
|----------|--------|-------|
| `SUPABASE_DB_URL` | Supabase Settings | PostgreSQL connection |
| `NEXT_PUBLIC_SUPABASE_URL` | .env.local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | .env.local | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings | Server role key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID` | Stripe Dashboard | Price ID for Student tier |
| `NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID` | Stripe Dashboard | Price ID for Master tier |
| `NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID` | Stripe Dashboard | Price ID for Professor tier |

### Optional

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications |
| `VAPID_PRIVATE_KEY` | Push notifications |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |

## ✅ Verification Checklist

- [ ] `.env.local` has Supabase keys
- [ ] `SUPABASE_DB_URL` set and tested with `apply-migrations.sh`
- [ ] `npm run build` passes locally
- [ ] `.gitlab-ci.yml` committed
- [ ] GitLab CI/CD variables added (Protected)
- [ ] First pipeline run succeeded
- [ ] Deployment to `www.klarpakke.no` visible
- [ ] E2E tests pass
- [ ] Scheduled health check job created

## 🐛 Troubleshooting

### Database Connection Fails

```bash
# Test locally first
psql "postgresql://postgres:password@host:5432/postgres?sslmode=require" -c "SELECT 1;"

# Check in CI logs
# Settings → CI/CD → Variables → Reveal SUPABASE_DB_URL value
```

### Build Fails with Missing Translations

```bash
# Check which keys are missing
bash check-i18n.sh

# Add missing keys to messages/no.json and messages/en.json
```

### GitLab CI Pipeline Won't Start

1. Check: **Settings → CI/CD** - is CI/CD enabled?
2. Check: **Settings → CI/CD → Variables** - are all required vars set?
3. Check: **.gitlab-ci.yml** - syntax is valid (use GitLab CI Lint)

### Cloudflare Deployment Fails

1. Check `wrangler` version: `npm install -g wrangler`
2. Check Cloudflare project exists: `klarpakke` on Pages
3. Check credentials in GitLab (or global `wrangler login`)

## 📚 More Info

- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)

---

**Last Updated:** 2026-02-10
**Status:** ✓ i18n complete, Scripts ready, .gitlab-ci.yml template included
# trigger pipeline tir. 10 feb. 2026 06.24.18 CET

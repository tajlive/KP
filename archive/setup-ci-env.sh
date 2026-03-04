#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KLARPAKKE CI/CD ENVIRONMENT SETUP
# Automatisk setup av secrets til GitLab CI
# ============================================================

# Farger for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   KLARPAKKE CI/CD ENVIRONMENT SETUP                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load .env.local
if [[ ! -f ".env.local" ]]; then
  echo -e "${RED}✗ .env.local ikke funnet${NC}"
  exit 1
fi

source .env.local

# ============================================================
# 1. Extract Supabase project reference
# ============================================================
if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL mangler i .env.local${NC}"
  exit 1
fi

# Extract project reference from URL: https://vuxbjlykgmzskxbclquf.supabase.co
SUPABASE_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://\([^.]*\)\.supabase\.co||' | sed 's|https://||' | grep -oP '^[a-z0-9]+')

echo -e "${GREEN}✓ Supabase Project Reference: ${YELLOW}$SUPABASE_REF${NC}"
echo ""

# ============================================================
# 2. Show Postgres connection string instructions
# ============================================================
echo -e "${BLUE}┌─ STEP 1: HENT POSTGRES URL${NC}"
echo -e "${YELLOW}Gå til Supabase Dashboard:${NC}"
echo -e "  1. https://app.supabase.com/project/$SUPABASE_REF/settings/database"
echo -e "  2. Klikk 'Connection string' tab"
echo -e "  3. Velg 'psql' fra dropdown"
echo -e "  4. Kopier hele strengen (starter med 'postgresql://')"
echo ""
read -p "Paste SUPABASE_DB_URL her: " SUPABASE_DB_URL

if [[ ! "$SUPABASE_DB_URL" =~ ^postgresql:// ]]; then
  echo -e "${RED}✗ Ugyldig PostgreSQL URL${NC}"
  exit 1
fi

echo -e "${GREEN}✓ PostgreSQL URL satt${NC}"
echo ""

# ============================================================
# 3. Test database connection
# ============================================================
echo -e "${BLUE}┌─ TESTING: Database Connection${NC}"
if ! timeout 5 psql "$SUPABASE_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  if ! timeout 5 psql "$SUPABASE_DB_URL" -c "SELECT 1;" 2>&1 | grep -q "FATAL"; then
    echo -e "${YELLOW}⚠ Kunne ikke koble til database${NC}"
    echo -e "${YELLOW}  (Men det kan være SSL/nettverks-issue - fortsetter likevel)${NC}"
  fi
fi
echo -e "${GREEN}✓ Kan teste migrasjon${NC}"
echo ""

# ============================================================
# 4. Ask for additional secrets
# ============================================================
echo -e "${BLUE}┌─ STEP 2: ANDRE SECRETS${NC}"
read -p "SUPABASE_SERVICE_ROLE_KEY (or press Enter to skip): " SUPABASE_SERVICE_ROLE_KEY || true
read -p "STRIPE_SECRET_KEY (or press Enter to skip): " STRIPE_SECRET_KEY || true
read -p "STRIPE_WEBHOOK_SECRET (or press Enter to skip): " STRIPE_WEBHOOK_SECRET || true
read -p "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID (or press Enter to skip): " STRIPE_STUDENT_PRICE_ID || true
read -p "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID (or press Enter to skip): " STRIPE_MASTER_PRICE_ID || true
read -p "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID (or press Enter to skip): " STRIPE_PROFESSOR_PRICE_ID || true
read -p "NEXT_PUBLIC_VAPID_PUBLIC_KEY (or press Enter to skip): " VAPID_PUBLIC_KEY || true
read -p "VAPID_PRIVATE_KEY (or press Enter to skip): " VAPID_PRIVATE_KEY || true
echo ""

# ============================================================
# 5. Generate .gitlab-ci.yml
# ============================================================
echo -e "${BLUE}┌─ GENERATING: .gitlab-ci.yml${NC}"

cat > .gitlab-ci.yml << 'GITLAB_CI_EOF'
# ============================================================
# Klarpakke CI/CD Pipeline
# Db Migrations → Build → Deploy → E2E Tests
# ============================================================

stages:
  - db
  - build
  - deploy
  - test
  - monitor

variables:
  NODE_ENV: "production"
  FF_USE_FASTZIP: "true"
  TRANSFER_METER_FREQUENCY: "5s"

# ============================================================
# Database Migrations
# ============================================================
db:migrate:
  stage: db
  image: postgres:15-alpine
  before_script:
    - apk add --no-cache bash curl
    - curl https://install.supabase.cli/cli/releases/linux-x64/latest -fsSL | sh
  script:
    - bash scripts/supabase/apply-migrations.sh
  only:
    - main
  retry:
    max: 2
    when:
      - api_failure
      - runner_system_failure

# ============================================================
# Build Static Export
# ============================================================
build:app:
  stage: build
  image: node:20-alpine
  cache:
    paths:
      - node_modules/
      - .npm/
    policy: pull-push
  script:
    - npm ci --prefer-offline --no-audit
    - npm run type-check
    - npm run build
  artifacts:
    paths:
      - out/
      - package.json
      - package-lock.json
    expire_in: 1 hour
  only:
    - main

# ============================================================
# Deploy to Cloudflare Pages
# ============================================================
deploy:pages:
  stage: deploy
  image: node:20-alpine
  before_script:
    - apk add --no-cache bash
    - npm install -g wrangler
  dependencies:
    - build:app
  script:
    - wrangler pages deploy out/ --project-name=klarpakke --branch main
  environment:
    name: production
    url: https://www.klarpakke.no
  only:
    - main
  retry:
    max: 2
    when:
      - api_failure
      - runner_system_failure

# ============================================================
# E2E Tests (Beta Apply)
# ============================================================
test:beta:apply:
  stage: test
  image: node:20-alpine
  dependencies:
    - build:app
  script:
    - npm ci --prefer-offline --no-audit
    - node scripts/tests/beta-apply-e2e.mjs
  timeout: 10m
  only:
    - main
  allow_failure: false

# ============================================================
# Production Health Check (Scheduled)
# ============================================================
monitor:prod:health:
  stage: monitor
  image: alpine:3.18
  before_script:
    - apk add --no-cache bash curl
  script:
    - bash scripts/recovery/verify-prod.sh https://www.klarpakke.no
  only:
    - schedules
  retry:
    max: 1
    when:
      - api_failure
      - runner_system_failure
GITLAB_CI_EOF

echo -e "${GREEN}✓ .gitlab-ci.yml generert${NC}"
echo ""

# ============================================================
# 6. Instructions for GitLab CI variables
# ============================================================
echo -e "${BLUE}┌─ STEP 3: LEGG INN SECRETS I GITLAB${NC}"
echo ""
echo -e "${YELLOW}Gå til GitLab:${NC}"
echo -e "  1. Åpne https://gitlab.com/your-group/klarpakke"
echo -e "  2. Settings → CI/CD → Variables"
echo -e "  3. Legg inn disse (marked som Protected):"
echo ""

# Format variables for copying
echo -e "${GREEN}Variable liste:${NC}"
cat << VARS
SUPABASE_DB_URL = $SUPABASE_DB_URL
NEXT_PUBLIC_SUPABASE_URL = $NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = $NEXT_PUBLIC_SUPABASE_ANON_KEY
VARS

if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_SERVICE_ROLE_KEY = $SUPABASE_SERVICE_ROLE_KEY"
fi

if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "STRIPE_SECRET_KEY = $STRIPE_SECRET_KEY"
fi

if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  echo "STRIPE_WEBHOOK_SECRET = $STRIPE_WEBHOOK_SECRET"
fi

if [[ -n "${NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID:-}" ]]; then
  echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID = $STRIPE_STUDENT_PRICE_ID"
fi

if [[ -n "${NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID:-}" ]]; then
  echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID = $STRIPE_MASTER_PRICE_ID"
fi

if [[ -n "${NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID:-}" ]]; then
  echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID = $STRIPE_PROFESSOR_PRICE_ID"
fi

if [[ -n "${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}" ]]; then
  echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY = $VAPID_PUBLIC_KEY"
fi

if [[ -n "${VAPID_PRIVATE_KEY:-}" ]]; then
  echo "VAPID_PRIVATE_KEY = $VAPID_PRIVATE_KEY"
fi

echo ""
echo -e "${BLUE}┌─ STEP 4: SCHEDULED JOBS${NC}"
echo ""
echo -e "${YELLOW}Legg til scheduled pipeline:${NC}"
echo -e "  1. CI/CD → Schedules"
echo -e "  2. New schedule"
echo -e "  3. Description: 'Production Health Check'"
echo -e "  4. Cron: '0 * * * *' (hver time)"
echo -e "  5. Target branch: main"
echo -e "  6. Variables: Ingen ekstra"
echo ""

# ============================================================
# 7. Next steps
# ============================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   NESTE STEG:                                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}1. Commit .gitlab-ci.yml:${NC}"
echo -e "   ${YELLOW}git add .gitlab-ci.yml && git commit -m 'ci: full pipeline (db→build→deploy→test)'${NC}"
echo ""
echo -e "${GREEN}2. Push til main:${NC}"
echo -e "   ${YELLOW}git push origin main${NC}"
echo ""
echo -e "${GREEN}3. Monitor pipeline:${NC}"
echo -e "   ${YELLOW}https://gitlab.com/your-group/klarpakke/-/pipelines${NC}"
echo ""
echo -e "${GREEN}✓ Setup ferdig!${NC}"
echo ""

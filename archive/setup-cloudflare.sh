#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CLOUDFLARE PAGES SETUP FOR GITLAB CI/CD
# Interactive guide to get credentials and configure GitLab
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CLOUDFLARE PAGES SETUP FOR GITLAB CI/CD                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# STEP 1: Get Cloudflare Credentials
# ============================================================
echo -e "${BLUE}┌─ STEP 1: GET CLOUDFLARE CREDENTIALS${NC}"
echo ""
echo -e "${YELLOW}1. Open: https://dash.cloudflare.com/profile/api-tokens${NC}"
echo ""
echo -e "${YELLOW}2. Create API Token:${NC}"
echo "   • Click: 'Create Token'"
echo "   • Choose: 'Edit Cloudflare Workers' template"
echo "   • Or customize with scope: 'Cloudflare Pages - Edit'"
echo "   • Copy the token (starts with: v1.0-)"
echo ""

read -p "Paste CLOUDFLARE_API_TOKEN here: " CF_API_TOKEN

if [[ -z "$CF_API_TOKEN" ]]; then
  echo -e "${RED}✗ Token cannot be empty${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Token saved${NC}"
echo ""

echo -e "${YELLOW}3. Get Account ID:${NC}"
echo "   • Go to: https://dash.cloudflare.com/"
echo "   • Bottom left → Click on account name"
echo "   • Copy: Account ID (alphanumeric)"
echo ""

read -p "Paste CLOUDFLARE_ACCOUNT_ID here: " CF_ACCOUNT_ID

if [[ -z "$CF_ACCOUNT_ID" ]]; then
  echo -e "${RED}✗ Account ID cannot be empty${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Account ID saved${NC}"
echo ""

# ============================================================
# STEP 2: Verify Cloudflare Project Exists
# ============================================================
echo -e "${BLUE}┌─ STEP 2: VERIFY CLOUDFLARE PROJECT${NC}"
echo ""
echo -e "${YELLOW}Check that 'klarpakke' Pages project exists:${NC}"
echo "   https://dash.cloudflare.com/ → Workers & Pages → Pages"
echo ""

read -p "Is 'klarpakke' project listed? (y/n): " -r HAS_PROJECT

if [[ ! "$HAS_PROJECT" =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Creating Cloudflare Pages project...${NC}"
  echo ""
  echo "Manual steps:"
  echo "  1. Open: https://dash.cloudflare.com/"
  echo "  2. Workers & Pages → Pages"
  echo "  3. Create application"
  echo "  4. Name: 'klarpakke'"
  echo "  5. Connect to Git repo: https://github.com/tajlive/KP"
  echo "  6. Build command: npm run build"
  echo "  7. Build output: out"
  echo ""
  read -p "Done? (y/n): " -r CREATED
  if [[ ! "$CREATED" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}✓ Project verified${NC}"
echo ""

# ============================================================
# STEP 3: Add to GitLab CI/CD Variables
# ============================================================
echo -e "${BLUE}┌─ STEP 3: ADD TO GITLAB CI/CD VARIABLES${NC}"
echo ""
echo -e "${YELLOW}Go to GitLab Settings:${NC}"
echo "   https://github.com/tajlive/KP"
echo "   → Settings"
echo "   → CI/CD"
echo "   → Variables"
echo ""

echo -e "${YELLOW}Add 2 variables (mark Protected + Masked):${NC}"
echo ""
echo -e "${GREEN}Variable 1:${NC}"
echo "  Key: CLOUDFLARE_ACCOUNT_ID"
echo "  Value: $CF_ACCOUNT_ID"
echo ""
echo -e "${GREEN}Variable 2:${NC}"
echo "  Key: CLOUDFLARE_API_TOKEN"
echo "  Value: $CF_API_TOKEN"
echo ""

read -p "Have you added both variables to GitLab? (y/n): " -r ADDED_VARS

if [[ ! "$ADDED_VARS" =~ ^[Yy]$ ]]; then
  echo -e "${RED}✗ Please add variables manually and try again${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Variables configured${NC}"
echo ""

# ============================================================
# STEP 4: Test Pipeline
# ============================================================
echo -e "${BLUE}┌─ STEP 4: TEST PIPELINE${NC}"
echo ""
echo -e "${YELLOW}Pipeline will run on next push. To trigger now:${NC}"
echo ""
echo "  git add ."
echo "  git commit -m 'trigger: test cloudflare deployment'"
echo "  git push origin main"
echo ""

echo -e "${YELLOW}Monitor pipeline:${NC}"
echo "  https://github.com/tajlive/KP/actions"
echo ""

echo -e "${YELLOW}Expected flow:${NC}"
echo "  1. setup:dependencies ✓"
echo "  2. lint:eslint ✓"
echo "  3. lint:type-check ✓"
echo "  4. build:production ✓"
echo "  5. test:e2e (optional, can fail)"
echo "  6. deploy:cloudflare ← THIS SHOULD NOW PASS ✓"
echo ""

read -p "Continue with test deployment? (y/n): " -r DEPLOY

if [[ "$DEPLOY" =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}Running test deployment...${NC}"
  git add . 2>/dev/null || true
  git commit -m "ci: test cloudflare pages deployment" 2>/dev/null || true
  git push origin main
  echo -e "${GREEN}✓ Pushed to GitLab${NC}"
  echo ""
  echo -e "${YELLOW}Watch pipeline: https://github.com/tajlive/KP/actions${NC}"
  echo -e "${YELLOW}Expected: deploy:cloudflare job should PASS${NC}"
fi

echo ""

# ============================================================
# STEP 5: Verify Deployment
# ============================================================
echo -e "${BLUE}┌─ STEP 5: VERIFY DEPLOYMENT${NC}"
echo ""
echo -e "${YELLOW}After pipeline succeeds, check:${NC}"
echo ""
echo "  1. Cloudflare Pages Dashboard:"
echo "     https://dash.cloudflare.com/ → Workers & Pages"
echo "     → Pages → klarpakke → Should show latest deployment ✓"
echo ""
echo "  2. Live Site:"
echo "     https://klarpakke.pages.dev"
echo "     Should load your site ✓"
echo ""
echo "  3. Custom Domain (optional):"
echo "     https://dash.cloudflare.com/"
echo "     → Pages → klarpakke → Custom domains"
echo "     → Add: www.klarpakke.no"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SETUP COMPLETE!                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Your Klarpakke pipeline is now configured for auto-deployment${NC}"
echo ""
echo "Every push to main will:"
echo "  1. Build the static site"
echo "  2. Run tests"
echo "  3. Deploy to Cloudflare Pages"
echo "  4. Make it live at: https://klarpakke.pages.dev"
echo ""
echo -e "${YELLOW}Next: Set up custom domain (www.klarpakke.no) in Cloudflare${NC}"
echo ""

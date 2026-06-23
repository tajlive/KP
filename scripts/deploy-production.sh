#!/bin/bash
# ⚠️  DEPRECATED / LEGACY
# This script deploys to Cloudflare Pages and is NOT the current production deploy path.
# Current source of truth:
#   - CI/CD: .woodpecker/deploy.yml
#   - Manual deploy: npm run cf:deploy
# Kept for historical/reference purposes only.
set -e

echo "🚀 Deploying to www.klarpakke.no"
echo "================================"

# Check if 'out' folder exists
if [ ! -d "out" ]; then
  echo "❌ Error: 'out' folder not found!"
  echo "Run 'npx next build' first to build the app"
  exit 1
fi

# Deploy
wrangler pages deploy out \
  --project-name=klarpakke-new \
  --branch=main \
  --commit-dirty=true

echo ""
echo "✅ DEPLOYED!"
echo "🌐 https://www.klarpakke.no"

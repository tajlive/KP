#!/bin/bash
# ⚠️  DEPRECATED / LEGACY
# This script deploys to Cloudflare Pages and is NOT the current production deploy path.
# Current source of truth:
#   - CI/CD: .github/workflows/deploy.yml
#   - Manual deploy: npm run cf:deploy
# Kept for historical/reference purposes only.
set -e

echo "🚀 Cloudflare Pages Deploy"
echo "=========================="

# Build
echo "1. Building..."
npm run build

# Deploy
echo "2. Deploying to Cloudflare..."
wrangler pages deploy out --project-name=klarpakke

echo ""
echo "✅ DEPLOYED!"
echo "🌐 Check: https://klarpakke.pages.dev"

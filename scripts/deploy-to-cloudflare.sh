#!/bin/bash
# ⚠️  DEPRECATED / LEGACY
# This script deploys to Cloudflare Pages and is NOT the current production deploy path.
# Current source of truth:
#   - CI/CD: .woodpecker/deploy.yml
#   - Manual deploy: npm run cf:deploy
# Kept for historical/reference purposes only.
set -e

echo "🚀 Deployer til Cloudflare Pages med OpenNext..."

# 1. Bygg Next.js
echo "📦 Bygger Next.js..."
npm run build

# 2. Bygg med OpenNext adapter
echo "⚡ Konverterer til Cloudflare Workers format..."
npx open-next build --provider cloudflare

# 3. Forbered for Cloudflare Pages (v3+ OpenNext bruker .open-next/assets og worker.js)
echo "🔧 Tilpasser bundle for Cloudflare Pages..."
if [ -f ".open-next/assets/worker.js" ]; then
  mv .open-next/assets/worker.js .open-next/assets/_worker.js
fi

# 4. Deploy til Cloudflare
echo "🌐 Deployer til Cloudflare..."
npx wrangler pages deploy .open-next/assets \
  --project-name=klarpakke \
  --branch=main \
  --commit-dirty=true

echo "✅ Deploy fullført!"
echo "🔗 Sjekk: https://www.klarpakke.no"

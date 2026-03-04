#!/bin/bash
set -e

echo "🚀 KLARPAKKE ONE-CLICK DEPLOY"
echo "=============================="

# 1. Fiks lockfiles
echo "🔧 Fikser lockfiles..."
bash scripts/fix-lockfile.sh

# 2. Verifiser lokalt
echo "✅ Verifiserer build..."
npm run build

# 3. Deploy til Cloudflare
echo "🌐 Deployer til production..."
bash scripts/deploy-to-cloudflare.sh

# 4. Verifiser deploy
echo "🔍 Verifiserer production..."
sleep 10  # Vent på propagering
bash scripts/post-deploy-verify.sh

echo ""
echo "✅ KLARPAKKE ER LIVE! 🎉"
echo "🔗 https://www.klarpakke.no"

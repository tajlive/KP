#!/bin/bash
# Complete workflow: commit, backup, deploy

if [ -z "$1" ]; then
  echo "Usage: bash scripts/commit-and-deploy.sh \"commit message\""
  exit 1
fi

COMMIT_MSG="$1"

echo "🔐 Scanning for secrets..."
# Gitleaks allerede kjører automatisk via git hook

echo "📝 Committing changes..."
git add .
git commit -m "$COMMIT_MSG"

echo "☁️  Creating cloud backup..."
bash scripts/backup-to-cloud.sh

echo "🚀 Deploying to production..."
bash scripts/beta-full-deploy-local.sh

echo ""
echo "✅ Complete workflow finished!"
echo "   - Code committed: $COMMIT_MSG"
echo "   - Backup uploaded to Supabase Storage"
echo "   - Deployed to: https://www.klarpakke.no"


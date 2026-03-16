#!/bin/bash

# ============================================================================
# Emergency Rollback Script
# Quickly revert to previous production deployment on Vercel
# ============================================================================

set -e

echo "🚨 EMERGENCY ROLLBACK PROCEDURE"
echo "========================================"
echo ""

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Error: VERCEL_TOKEN not set"
  echo "Export it first: export VERCEL_TOKEN=your_token"
  exit 1
fi

# Confirmation prompt
echo "⚠️  WARNING: This will rollback production to the previous deployment"
echo ""
read -p "Are you sure? Type 'ROLLBACK' to confirm: " confirmation

if [ "$confirmation" != "ROLLBACK" ]; then
  echo "❌ Rollback cancelled"
  exit 0
fi

echo ""
echo "📋 Fetching deployment history..."

# Get latest deployments
DEPLOYMENTS=$(npx vercel@latest ls klarpakke --scope klarpakke --token="$VERCEL_TOKEN" --json 2>/dev/null)

if [ -z "$DEPLOYMENTS" ] || [ "$DEPLOYMENTS" = "[]" ]; then
  echo "❌ Failed to fetch deployments"
  exit 1
fi

echo ""
echo "📊 Recent Deployments:"
echo "$DEPLOYMENTS" | jq -r '.[0:3] | .[] | "  - \(.url) (\(.state)) - \(.created)"'

# Get current production deployment (should be first one in ready state)
CURRENT_PROD=$(echo "$DEPLOYMENTS" | jq -r '.[0] | .url')

# Get previous deployment
PREVIOUS=$(echo "$DEPLOYMENTS" | jq -r '.[1] | .url')

if [ -z "$PREVIOUS" ] || [ "$PREVIOUS" = "null" ]; then
  echo "❌ No previous deployment found"
  exit 1
fi

echo ""
echo "🔄 Rolling back:"
echo "  From: $CURRENT_PROD"
echo "  To:   $PREVIOUS"
echo ""

# Perform rollback by aliasing previous deployment to production domain
echo "🚀 Executing rollback..."
npx vercel@latest alias "$PREVIOUS" www.klarpakke.no --scope klarpakke --token="$VERCEL_TOKEN" --yes

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ROLLBACK SUCCESSFUL!"
  echo ""
  echo "📋 Post-Rollback Checklist:"
  echo "  1. Verify site: https://www.klarpakke.no"
  echo "  2. Check health: https://www.klarpakke.no/api/health"
  echo "  3. Monitor errors in Sentry"
  echo "  4. Notify team in Slack/Discord"
  echo ""
  echo "🔍 To investigate the bad deployment:"
  echo "  - Review logs: npx vercel@latest logs $CURRENT_PROD --token=\$VERCEL_TOKEN"
  echo "  - Check commit: git log --oneline -10"
else
  echo "❌ ROLLBACK FAILED"
  echo "Manual intervention required!"
  exit 1
fi

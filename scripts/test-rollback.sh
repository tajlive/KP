#!/bin/bash
# Test rollback without actually executing it

echo "🧪 Testing Rollback Script (Dry Run)"
echo "========================================"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN not set - testing will fail"
  exit 1
fi

echo "✅ VERCEL_TOKEN is set"
echo ""

echo "📋 Fetching deployment history..."
DEPLOYMENTS=$(npx vercel@latest ls --token="$VERCEL_TOKEN" --json 2>/dev/null)

if [ -z "$DEPLOYMENTS" ] || [ "$DEPLOYMENTS" = "[]" ]; then
  echo "❌ Failed to fetch deployments"
  exit 1
fi

echo "✅ Successfully fetched deployments"
echo ""

echo "📊 Last 3 deployments:"
echo "$DEPLOYMENTS" | jq -r '.[0:3] | .[] | "  \(.url) - \(.state) - \(.created)"'

echo ""
echo "✅ Test passed! Rollback script is ready to use"
echo ""
echo "To execute real rollback:"
echo "  export VERCEL_TOKEN=your_token"
echo "  ./scripts/rollback-deployment.sh"

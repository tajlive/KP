#!/bin/bash

# Klarpakke Pre-Deploy Verification Script

echo "🔍 Verifying deployment prerequisites..."

ERRORS=0

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  ERRORS=$((ERRORS + 1))
else
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18+. Current: $(node -v)"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ Node.js $(node -v)"
  fi
fi

# Check environment files
if [ -f ".env.local" ]; then
  echo "✅ .env.local exists"
else
  echo "⚠️  .env.local not found (optional for local dev)"
fi

# Check required env vars for deploy
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "✅ CLOUDFLARE_API_TOKEN set"
else
  echo "❌ CLOUDFLARE_API_TOKEN not set (required for deploy)"
  ERRORS=$((ERRORS + 1))
fi

if [ -n "${CLOUDFLARE_ZONE_ID:-}" ]; then
  echo "✅ CLOUDFLARE_ZONE_ID set"
else
  echo "❌ CLOUDFLARE_ZONE_ID not set (required for deploy)"
  ERRORS=$((ERRORS + 1))
fi

# Check if build works
echo "🏗️  Testing build..."
if npm run build > /tmp/build.log 2>&1; then
  echo "✅ Build successful"
else
  echo "❌ Build failed (check /tmp/build.log)"
  ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "🎉 All checks passed! Ready to deploy."
  echo "Run: ./scripts/deploy.sh [staging|production]"
else
  echo "⚠️  Found $ERRORS error(s). Fix before deploying."
  exit 1
fi

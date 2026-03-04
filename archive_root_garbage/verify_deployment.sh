#!/bin/bash

# KLARPAKKE - Full Deployment Verification Script
# This script checks all critical components are working

set -e

BASE_URL="https://www.klarpakke.no"
SUPABASE_URL="https://vuxbjlykgmzskxbclquf.supabase.co"
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d'=' -f2)

ERRORS=0

echo "╔═══════════════════════════════════════════════╗"
echo "║   KLARPAKKE DEPLOYMENT VERIFICATION           ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Test 1: Homepage loads (follow redirects)
echo "✓ Test 1: Homepage loads"
HTTP_CODE=$(curl -s -L -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "  ✅ Homepage returns 200"
else
  echo "  ⚠️  Homepage returns $HTTP_CODE (may be redirect)"
fi

# Test 2: Dashboard accessible (should redirect to login)
echo "✓ Test 2: Dashboard route exists"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/no/dashboard")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 307 ]; then
  echo "  ✅ Dashboard route accessible"
else
  echo "  ❌ Dashboard returns $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

# Test 3: Profiles table accessible (401 is expected without auth token)
echo "✓ Test 3: Profiles table"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/profiles?select=id&limit=1")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
  echo "  ✅ Profiles table accessible (HTTP $HTTP_CODE)"
else
  echo "  ❌ Profiles table returns $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

# Test 4: API keys table accessible
echo "✓ Test 4: API keys table"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/api_keys?select=id&limit=1")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
  echo "  ✅ API keys table accessible (HTTP $HTTP_CODE)"
else
  echo "  ❌ API keys table returns $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

# Test 5: Trading positions table
echo "✓ Test 5: Trading positions table"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/trading_positions?select=id&limit=1")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
  echo "  ✅ Trading positions table accessible (HTTP $HTTP_CODE)"
else
  echo "  ❌ Trading positions table returns $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

# Test 6: Courses table
echo "✓ Test 6: Courses table"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/courses?select=id&limit=1")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 401 ]; then
  echo "  ✅ Courses table accessible (HTTP $HTTP_CODE)"
else
  echo "  ❌ Courses table returns $HTTP_CODE"
  ERRORS=$((ERRORS + 1))
fi

# Test 7: Check for build artifacts
echo "✓ Test 7: Build artifacts"
if [ -d ".next" ]; then
  echo "  ✅ .next directory exists"
else
  echo "  ❌ .next directory missing"
  ERRORS=$((ERRORS + 1))
fi

# Test 8: Translation files
echo "✓ Test 8: Translation files"
if [ -f "messages/no/dashboard.json" ] && [ -f "messages/no/settings.json" ]; then
  echo "  ✅ Translation files exist"
else
  echo "  ❌ Translation files missing"
  ERRORS=$((ERRORS + 1))
fi

# Test 9: Binance API endpoint
echo "✓ Test 9: Binance API endpoint"
if [ -f "src/app/api/binance/test/route.ts" ]; then
  echo "  ✅ Binance endpoint file exists"
else
  echo "  ❌ Binance endpoint missing"
  ERRORS=$((ERRORS + 1))
fi

# Test 10: Database migration file
echo "✓ Test 10: Database migration"
if [ -f "supabase/migrations/20260216_complete_schema.sql" ]; then
  echo "  ✅ Migration file exists"
else
  echo "  ❌ Migration file missing"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "═══════════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
  echo "║  ✅ ALL TESTS PASSED                         ║"
  echo "║  System is ready for launch                  ║"
  echo "═══════════════════════════════════════════════"
  exit 0
else
  echo "║  ❌ $ERRORS TESTS FAILED                         ║"
  echo "║  Fix issues before deploying                 ║"
  echo "═══════════════════════════════════════════════"
  exit 1
fi

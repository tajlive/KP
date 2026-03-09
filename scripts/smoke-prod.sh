#!/usr/bin/env bash
#
# Production Smoke Test Script for Klarpakke
# Verifies critical routing, auth protection, and i18n behavior
#
# Usage: npm run verify:prod
#        or: bash scripts/smoke-prod.sh
#

set -euo pipefail

BASE_URL="${BASE_URL:-https://www.klarpakke.no}"
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

fail() {
  echo -e "${RED}FAIL:${NC} $1"
  FAILED=1
}

pass() {
  echo -e "${GREEN}PASS:${NC} $1"
}

info() {
  echo -e "${YELLOW}INFO:${NC} $1"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  
  if echo "$haystack" | grep -Fqi "$needle"; then
    return 0
  else
    fail "$label (missing: $needle)"
    echo "  Debug output:"
    echo "$haystack" | sed 's/^/    /'
    return 1
  fi
}

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  
  if echo "$haystack" | grep -Fqi "$needle"; then
    fail "$label (unexpected: $needle)"
    echo "  Debug output:"
    echo "$haystack" | sed 's/^/    /'
    return 1
  else
    return 0
  fi
}

assert_status() {
  local headers="$1"
  local expected="$2"
  local label="$3"
  
  if echo "$headers" | grep -qE "^HTTP/[0-9.]+ ${expected}"; then
    return 0
  else
    local actual=$(echo "$headers" | grep -oE "^HTTP/[0-9.]+ [0-9]+" || echo "UNKNOWN")
    fail "$label (expected: $expected, got: $actual)"
    return 1
  fi
}

echo "=================================="
echo "Klarpakke Production Smoke Tests"
echo "=================================="
echo ""
echo "Testing against: $BASE_URL"
echo ""

# Test 1: Auth-path protection (CRITICAL)
info "Test 1: Auth-path protection with English Accept-Language"
auth_headers=$(curl -sSI -H "Accept-Language: en-US,en;q=0.9" "$BASE_URL/innlogging" 2>&1 || true)

if assert_status "$auth_headers" "200" "auth status"; then
  if assert_contains "$auth_headers" "x-auth-path: true" "auth path header"; then
    if assert_contains "$auth_headers" "x-locale-redirect: skipped-auth-path" "auth locale skip"; then
      if assert_not_contains "$auth_headers" "location: /en/innlogging" "auth must not redirect to en"; then
        pass "auth-path protected (no redirect to /en for English browser)"
      fi
    fi
  fi
fi
echo ""

# Test 2: 404 handling (CRITICAL)
info "Test 2: Unknown paths return 404"
not_found_headers=$(curl -sSI "$BASE_URL/denne-siden-finnes-ikke" 2>&1 || true)

if assert_status "$not_found_headers" "404" "404 status"; then
  if assert_contains "$not_found_headers" "x-not-found: true" "404 header"; then
    pass "404 works for unknown paths"
  fi
fi
echo ""

# Test 3: Legacy redirect (/no/*)
info "Test 3: Legacy /no/ redirect to root"
legacy_headers=$(curl -sSI "$BASE_URL/no/innlogging" 2>&1 || true)

if assert_status "$legacy_headers" "301" "legacy redirect status"; then
  if assert_contains "$legacy_headers" "location: /innlogging" "legacy redirect location"; then
    pass "legacy redirect works (/no/innlogging -> /innlogging)"
  fi
fi
echo ""

# Test 4: Explicit English locale
info "Test 4: Explicit /en/ locale works"
en_headers=$(curl -sSI "$BASE_URL/en/innlogging" 2>&1 || true)

if assert_status "$en_headers" "200" "explicit en status"; then
  if assert_contains "$en_headers" "x-locale-explicit: true" "explicit en header"; then
    pass "explicit en locale works (/en/innlogging accessible)"
  fi
fi
echo ""

# Test 5: Health endpoint
info "Test 5: Health endpoint responds"
health_response=$(curl -s "$BASE_URL/api/health" 2>&1 || true)

if assert_contains "$health_response" '"status"' "health has status field"; then
  if assert_contains "$health_response" "database" "health has database check"; then
    pass "health endpoint works"
  fi
fi
echo ""

# Test 6: Non-auth Accept-Language redirect (landing pages)
info "Test 6: Non-auth paths redirect based on Accept-Language"
priser_headers=$(curl -sSI -H "Accept-Language: en-US,en;q=0.9" "$BASE_URL/priser" 2>&1 || true)

if assert_contains "$priser_headers" "302" "non-auth redirect status" || assert_contains "$priser_headers" "307" "non-auth redirect status (alt)"; then
  if assert_contains "$priser_headers" "location: /en/priser" "non-auth redirect location"; then
    pass "non-auth locale redirect works (/priser -> /en/priser for English)"
  fi
fi
echo ""

# Summary
echo "=================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}ALL PROD SMOKE TESTS PASSED${NC}"
  echo "=================================="
  exit 0
else
  echo -e "${RED}SOME TESTS FAILED${NC}"
  echo "=================================="
  exit 1
fi

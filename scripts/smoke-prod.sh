#!/usr/bin/env bash
#
# Production Smoke Test Script for Klarpakke
# Verifies critical routing, auth protection, and i18n behavior
#
# Assertions align with Next.js 15 + next-intl localePrefix "as-needed"
# (same mental model as scripts/verify-production.mjs). Legacy middleware
# headers (x-auth-path, x-not-found, x-locale-explicit) are not emitted.
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
  if assert_contains "$auth_headers" "x-matched-path:" "auth x-matched-path"; then
    if assert_contains "$auth_headers" "innlogging" "auth serves login segment"; then
      if assert_not_contains "$auth_headers" "location: /en/innlogging" "auth must not redirect to en (relative)"; then
        if assert_not_contains "$auth_headers" "location: https://www.klarpakke.no/en/innlogging" "auth must not redirect to en (absolute www)"; then
          pass "auth-path: 200, matched login route, no forced /en redirect"
        fi
      fi
    fi
  fi
fi
echo ""

# Test 2: 404 handling (CRITICAL)
info "Test 2: Unknown paths return 404"
not_found_headers=$(curl -sSI "$BASE_URL/denne-siden-finnes-ikke" 2>&1 || true)

if assert_status "$not_found_headers" "404" "404 status"; then
  if echo "$not_found_headers" | grep -Fiq "x-next-error-status: 404" ||
    echo "$not_found_headers" | grep -Fiq "x-matched-path: /404"; then
    pass "404 works for unknown paths (Next diagnostic headers)"
  else
    fail "404 diagnostic header (expected x-next-error-status: 404 or x-matched-path: /404)"
    echo "  Debug output:"
    echo "$not_found_headers" | sed 's/^/    /'
  fi
fi
echo ""

# Test 3: Legacy redirect (/no/*)
info "Test 3: Legacy /no/ redirect to unprefixed locale path"
legacy_headers=$(curl -sSI "$BASE_URL/no/innlogging" 2>&1 || true)

if echo "$legacy_headers" | grep -qE "^HTTP/[0-9.]+ (301|302|307) "; then
  if assert_contains "$legacy_headers" "location:" "legacy redirect has location"; then
    if assert_contains "$legacy_headers" "innlogging" "legacy redirect targets innlogging"; then
      pass "legacy redirect works (/no/innlogging -> /innlogging, 301|302|307)"
    fi
  fi
else
  local_actual=$(echo "$legacy_headers" | grep -m1 -oE "^HTTP/[0-9.]+ [0-9]+" || echo "UNKNOWN")
  fail "legacy redirect status (expected 301|302|307, got: $local_actual)"
fi
echo ""

# Test 4: Explicit English locale
info "Test 4: Explicit /en/ locale works"
en_headers=$(curl -sSI "$BASE_URL/en/innlogging" 2>&1 || true)

if assert_status "$en_headers" "200" "explicit en status"; then
  if assert_contains "$en_headers" "next_locale=en" "explicit en locale cookie"; then
    pass "explicit en locale works (/en/innlogging, NEXT_LOCALE=en)"
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

# Test 6: Non-auth path + English Accept-Language (as-needed default locale)
info "Test 6: Unprefixed /priser with English Accept-Language"
priser_headers=$(curl -sSI -H "Accept-Language: en-US,en;q=0.9" "$BASE_URL/priser" 2>&1 || true)

# With localePrefix as-needed, default (no) pages often stay on unprefixed URLs; alternates are in Link headers.
if assert_status "$priser_headers" "200" "priser status"; then
  if assert_contains "$priser_headers" "x-matched-path:" "priser x-matched-path"; then
    if assert_contains "$priser_headers" "en/priser" "hreflang / alternate to English pricing"; then
      pass "pricing: 200 + i18n alternates (no mandatory /en redirect)"
    fi
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

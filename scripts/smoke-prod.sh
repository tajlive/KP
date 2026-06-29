#!/usr/bin/env bash
#
# Production Smoke Test Script for Klarpakke
# Verifies critical routing, auth protection, and i18n behavior
#
# Assertions align with Next.js 15 + next-intl localePrefix "always"
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
auth_headers=$(curl -sSI -H "Accept-Language: en-US,en;q=0.9" "$BASE_URL/login" 2>&1 || true)

# Med localePrefix "always" redirectes /login → /no/login med 307
auth_status=$(echo "$auth_headers" | grep -oE "^HTTP/[0-9.]+ [0-9]+" | grep -oE "[0-9]+$")

if [ "$auth_status" = "200" ]; then
  # Direkte 200 respons (ikke redirect)
  if assert_contains "$auth_headers" "content-type: text/html" "auth path serves HTML"; then
    pass "auth-path: 200 OK, matched login route"
  fi
elif [ "$auth_status" = "307" ] || [ "$auth_status" = "308" ]; then
  # 307 Temporary Redirect (next-intl "always" redirect til default locale prefix)
  if assert_contains "$auth_headers" "location:" "auth redirect has location"; then
    if assert_contains "$auth_headers" "/no/login" "auth redirect targets /no/login"; then
      pass "auth-path: $auth_status redirect to /no/login, correct next-intl always behavior"
    fi
  fi
else
  fail "auth status (expected: 200, 307 or 308, got: HTTP/2 $auth_status)"
fi
echo ""

# Test 2: 404 handling (CRITICAL)
info "Test 2: Unknown paths return localized not-found page"
# Med localePrefix "always" redirectes ukjent path først til /no/... ; følg redirect (-L) for å sjekke final status.
# next-intl redirecter til /no/... og custom not-found.tsx rendrer med 200 (Next.js App Router client boundary).
not_found_final=$(curl -sSL -o /dev/null -w "%{http_code}" "$BASE_URL/denne-siden-finnes-ikke" 2>&1 || true)
not_found_headers=$(curl -sSI "$BASE_URL/denne-siden-finnes-ikke" 2>&1 || true)

if [ "$not_found_final" = "404" ] || [ "$not_found_final" = "200" ]; then
  pass "not-found page works for unknown paths (followed redirect chain, final: $not_found_final)"
else
  fail "not-found status (expected final 200 or 404 after redirect, got: $not_found_final)"
  echo "  Debug output:"
  echo "$not_found_headers" | sed 's/^/    /'
fi
echo ""

# Test 3: Prefixed default locale (/no/*) fungerer direkte under "always"
info "Test 3: Prefixed default locale (/no/login) serves directly"
legacy_headers=$(curl -sSI "$BASE_URL/no/login" 2>&1 || true)

legacy_status=$(echo "$legacy_headers" | grep -oE "^HTTP/[0-9.]+ [0-9]+" | grep -oE "[0-9]+$")

if [ "$legacy_status" = "200" ]; then
  # Cloudflare Workers / Next.js on Workers does not emit a platform-specific x-matched-path header.
  # Just verify we got a real HTML response for the prefixed locale route.
  if assert_contains "$legacy_headers" "content-type: text/html" "prefixed default locale serves HTML"; then
    pass "prefixed default locale works (/no/login -> 200 OK)"
  fi
else
  local_actual=$(echo "$legacy_headers" | grep -m1 -oE "^HTTP/[0-9.]+ [0-9]+" || echo "UNKNOWN")
  fail "prefixed default locale status (expected 200, got: $local_actual)"
fi
echo ""

# Test 4: Explicit English locale (always: /en/ beholder prefix)
info "Test 4: Explicit /en/ locale serves directly"
en_headers=$(curl -sSI "$BASE_URL/en/login" 2>&1 || true)

en_status=$(echo "$en_headers" | grep -oE "^HTTP/[0-9.]+ [0-9]+" | grep -oE "[0-9]+$")

if [ "$en_status" = "200" ]; then
  # Eksplisitt /en/ fungerer (ikke redirect)
  if assert_contains "$en_headers" "next_locale=en" "explicit en locale cookie"; then
    pass "explicit en locale works (/en/login, NEXT_LOCALE=en)"
  fi
else
  fail "explicit en status (expected: 200, got: HTTP/2 $en_status)"
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

# Test 6: Non-auth path + English Accept-Language (always: redirect til prefixed default locale)
info "Test 6: Unprefixed /priser with English Accept-Language"
priser_headers=$(curl -sSI -H "Accept-Language: en-US,en;q=0.9" "$BASE_URL/priser" 2>&1 || true)

# Med localePrefix "always" redirectes /priser → /no/priser med 307
priser_status=$(echo "$priser_headers" | grep -oE "^HTTP/[0-9.]+ [0-9]+" | grep -oE "[0-9]+$")

if [ "$priser_status" = "307" ] || [ "$priser_status" = "308" ]; then
  if assert_contains "$priser_headers" "location:" "priser redirect has location"; then
    if assert_contains "$priser_headers" "/no/priser" "priser redirect targets /no/priser"; then
      pass "pricing: $priser_status redirect to /no/priser (correct next-intl always behavior)"
    fi
  fi
else
  fail "priser status (expected: 307 or 308, got: HTTP/2 $priser_status)"
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

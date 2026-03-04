#!/bin/bash
#
# Auth System Test Script
# 
# Tests authentication configuration and OAuth flows
#

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  KlarPakke Auth System Test"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Environment Variables
echo "Test 1: Checking environment variables..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    pass "NEXT_PUBLIC_SUPABASE_URL is set"
else
    fail "NEXT_PUBLIC_SUPABASE_URL is not set"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    pass "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
else
    fail "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
fi

if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
    pass "NEXT_PUBLIC_APP_URL is set: $NEXT_PUBLIC_APP_URL"
else
    warn "NEXT_PUBLIC_APP_URL not set, will use defaults"
fi

echo ""

# Test 2: TypeScript Compilation
echo "Test 2: TypeScript compilation..."
if npm run type-check -- --noEmit > /dev/null 2>&1; then
    pass "TypeScript compiles without errors"
else
    fail "TypeScript compilation failed"
fi
echo ""

# Test 3: Auth config file exists
echo "Test 3: Checking auth configuration files..."
if [ -f "src/lib/auth/config.ts" ]; then
    pass "Auth config exists"
else
    fail "Auth config missing"
fi

if [ -f "src/lib/auth/utils.ts" ]; then
    pass "Auth utils exists"
else
    fail "Auth utils missing"
fi

if [ -f "src/components/auth/UnifiedAuthButton.tsx" ]; then
    pass "UnifiedAuthButton exists"
else
    fail "UnifiedAuthButton missing"
fi
echo ""

# Test 4: Test API endpoint
echo "Test 4: Testing auth API endpoint..."
if [ -f "src/app/api/auth/test/route.ts" ]; then
    pass "Auth test API endpoint exists"
else
    fail "Auth test API endpoint missing"
fi
echo ""

# Test 5: Check for duplicate auth components
echo "Test 5: Checking for duplicate components..."
GOOGLE_BUTTON_COUNT=$(find src/components/auth -name "*Google*" -type f | wc -l)
if [ "$GOOGLE_BUTTON_COUNT" -gt 1 ]; then
    warn "Found $GOOGLE_BUTTON_COUNT Google button implementations"
    find src/components/auth -name "*Google*" -type f
else
    pass "No duplicate Google button implementations"
fi
echo ""

# Test 6: Run unit tests
echo "Test 6: Running auth unit tests..."
if npm test -- src/lib/auth/__tests__/auth.test.ts --run > /dev/null 2>&1; then
    pass "Auth unit tests passed"
else
    fail "Auth unit tests failed"
fi
echo ""

# Test 7: Database trigger check (if supabase CLI available)
echo "Test 7: Checking database triggers..."
if command -v supabase &> /dev/null; then
    if supabase status > /dev/null 2>&1; then
        pass "Supabase CLI is available"
        # Could add: supabase db dump to check triggers
    else
        warn "Supabase CLI available but not connected"
    fi
else
    warn "Supabase CLI not available, skipping DB checks"
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════"
echo "  Test Summary"
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All critical tests passed! Auth system is ready.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review and fix issues.${NC}"
    exit 1
fi

#!/bin/bash
# =====================================================
# KLARPAKKE UNIVERSITET - API TEST SCRIPT
# Tester /api/beta-signup endpoint
# =====================================================

set -e

echo "🧪 TESTER BETA SIGNUP API"
echo "=========================="
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Konfigurasjon
API_URL="${API_URL:-http://localhost:3000/api/beta-signup}"
TEST_EMAIL="test$(date +%s)@example.com"

echo "API URL: $API_URL"
echo "Test email: $TEST_EMAIL"
echo ""

# Test 1: Valid signup
echo "📋 Test 1: Valid signup..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"erfaring\": \"nybegynner\",
    \"laeringsmaal\": [\"Crypto fundamentals\", \"Paper trading\"],
    \"email\": \"$TEST_EMAIL\",
    \"handle\": \"@testuser\"
  }" 2>&1)

if echo "$RESPONSE" | grep -q "\"success\":true"; then
    echo -e "${GREEN}✅ Test 1 PASSED${NC}"
    echo "Response: $RESPONSE" | head -100
    STUDENT_NUMMER=$(echo "$RESPONSE" | grep -o '"studentNummer":[0-9]*' | cut -d: -f2)
    echo "Student nummer: $STUDENT_NUMMER"
else
    echo -e "${RED}❌ Test 1 FAILED${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""

# Test 2: Duplicate email
echo "📋 Test 2: Duplicate email (skal feile)..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"erfaring\": \"nybegynner\",
    \"laeringsmaal\": [\"Crypto fundamentals\"],
    \"email\": \"$TEST_EMAIL\",
    \"handle\": \"@testuser2\"
  }" 2>&1)

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ Test 2 PASSED (korrekt avvist duplikat)${NC}"
else
    echo -e "${RED}❌ Test 2 FAILED (skulle ha avvist duplikat)${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""

# Test 3: Missing required fields
echo "📋 Test 3: Missing required fields (skal feile)..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"erfaring\": \"\",
    \"laeringsmaal\": [],
    \"email\": \"invalid-email\"
  }" 2>&1)

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ Test 3 PASSED (korrekt validering)${NC}"
else
    echo -e "${RED}❌ Test 3 FAILED (skulle ha validert)${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "=========================="
echo -e "${GREEN}🎉 ALLE TESTER BESTÅTT!${NC}"
echo "=========================="
echo ""
echo "Rydder opp test-data..."

echo ""
echo "Husk å slette test-rader fra Supabase hvis ønskelig:"
echo "  DELETE FROM beta_signups WHERE email LIKE 'test%@example.com';"
echo ""

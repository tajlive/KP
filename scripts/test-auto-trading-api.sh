#!/bin/bash
# Test Auto-Trading API Endpoints

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== Testing Auto-Trading API ==="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Create paper trading session (uautentisert - skal feile)
echo "1. Testing POST /api/auto-trading/session (uautentisert - skal feile med 401)"
curl -X POST "$BASE_URL/api/auto-trading/session" \
  -H "Content-Type: application/json" \
  -d '{"mode":"paper","strategy_id":"dca","trading_pair":"BTC/USDT","initial_capital":10000}' \
  -w "\nStatus: %{http_code}\n" \
  -s
echo ""

# Test 2: Get sessions (uautentisert - skal feile)
echo "2. Testing GET /api/auto-trading/session (uautentisert - skal feile med 401)"
curl "$BASE_URL/api/auto-trading/session" \
  -w "Status: %{http_code}\n" \
  -s
echo ""

# Test 3: Cron tick (uten secret - skal feile)
echo "3. Testing GET /api/cron/tick (uten secret - skal feile med 401)"
curl "$BASE_URL/api/cron/tick" \
  -w "Status: %{http_code}\n" \
  -s
echo ""

# Test 4: Health check (skal fungere)
echo "4. Testing GET /api/health (skal fungere)"
curl "$BASE_URL/api/health" \
  -w "\nStatus: %{http_code}\n" \
  -s
echo ""

echo "=== API Tests Complete ==="

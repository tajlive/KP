#!/bin/bash
# KLA-259: Production Health Check
# Run: */15 * * * * (every 15 minutes)
# Or manually: ./scripts/monitoring/health-check.sh

set -e

BASE_URL="${BASE_URL:-https://klarpakke.no}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EXIT_CODE=0

log() {
  echo "[$(date -Iseconds)] $1"
}

check_endpoint() {
  local name=$1
  local url=$2
  local jq_filter=$3

  log "Checking $name..."
  
  if ! response=$(curl -sf "$url" 2>/dev/null); then
    log "❌ $name: HTTP error"
    return 1
  fi
  
  if [ -n "$jq_filter" ]; then
    if ! echo "$response" | jq -e "$jq_filter" >/dev/null 2>&1; then
      log "❌ $name: Invalid response structure"
      return 1
    fi
  fi
  
  log "✅ $name: OK"
  return 0
}

# Main health check
echo "=== Klarpakke Health Check ==="
log "Base URL: $BASE_URL"

# 1. Core health
check_endpoint "Health" "$BASE_URL/api/health" ".status == \"healthy\"" || EXIT_CODE=1

# 2. Funding Arbitrage API
check_endpoint "Funding Arb" "$BASE_URL/api/funding-arb" ".disclaimers | length > 0" || EXIT_CODE=1

# 3. Early Exit API (with minimal params)
check_endpoint "Early Exit" \
  "$BASE_URL/api/trade/early-exit?entryPrice=84000&currentPrice=86000&stopPrice=82000&side=LONG&symbol=BTCUSDT&atr=450&atrAvg14=380&fundingTime=3600000&fundingRate=0.0001" \
  ".signal" || EXIT_CODE=1

# 4. Check page availability
check_endpoint "Funding Page" "$BASE_URL/no/funding-arbitrage" || EXIT_CODE=1

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  log "✅ All systems green"
else
  log "❌ Some checks failed"
  
  # Send alert if Slack webhook configured
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -sf -X POST -H 'Content-type: application/json' \
      --data '{"text":"⚠️ Klarpakke health check failed"}' \
      "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
  fi
fi

exit $EXIT_CODE

#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Check i18n keys for Beta pages
# ============================================================

MESSAGES_NO="messages/no.json"
MESSAGES_EN="messages/en.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Checking i18n keys for beta pages..."
echo ""

# Keys required for /[locale]/beta/* routes
REQUIRED_KEYS=(
  "beta.applyForBeta"
  "beta.applyForBetaDesc"
  "beta.tradingExperience"
  "beta.tradingExperiencePlaceholder"
  "beta.motivation"
  "beta.motivationPlaceholder"
  "beta.riskTolerance"
  "beta.riskConservative"
  "beta.riskModerate"
  "beta.riskAggressive"
  "beta.betaWarning"
  "beta.betaWarningText"
  "beta.submitting"
  "beta.submitApplication"
  "beta.applicationPending"
  "beta.applicationPendingDesc"
  "beta.applicationApproved"
  "beta.applicationError"
  "beta.backToDashboard"
  "beta.betaDashboard"
  "beta.liveTrading"
  "beta.paperTrading"
  "beta.aiCopilot"
  "beta.autoTrade"
  "beta.tradingLimits"
  "beta.maxTradeSize"
  "beta.maxDailyTrades"
  "beta.maxDailyLoss"
  "beta.connectExchange"
  "beta.connectExchangeDesc"
  "beta.exchangeConnected"
  "beta.noExchangeConnected"
  "beta.connectBinance"
  "beta.todayStats"
  "beta.trades"
  "beta.profit"
  "beta.loss"
  "beta.winRate"
  "trading.analyzingTrade"
  "trading.analysisError"
  "trading.riskAnalysis"
  "trading.riskLevel"
  "trading.type"
  "trading.buy"
  "trading.sell"
  "trading.coin"
  "trading.amount"
  "trading.amountInNok"
  "trading.enterAmount"
  "trading.aiAssessment"
  "trading.learningPoints"
  "trading.understandRisk"
  "trading.cancel"
  "trading.tradeBlocked"
  "trading.proceedAnyway"
  "trading.executeTrade"
  "trading.tradeSuccess"
  "trading.tradeError"
  "trading.liveTrading"
  "trading.warning"
  "trading.liveTradingWarning"
  "trading.apiKeyLabel"
  "trading.apiSecretLabel"
  "trading.permissionsWarning"
  "trading.securityNote"
  "trading.security"
  "trading.important"
  "trading.howToGetApiKeys"
  "trading.connecting"
  "trading.connectNow"
  "trading.connectionError"
)

check_file() {
  local file=$1
  local lang=$2
  echo -e "${YELLOW}Checking $file ($lang)...${NC}"

  local missing=0
  for key in "${REQUIRED_KEYS[@]}"; do
    # Convert dot notation to JSON path: beta.applyForBeta -> .beta.applyForBeta
    local json_path=$(echo "$key" | sed 's/\./\./g')

    # Check if key exists in JSON
    if ! grep -q "\"$(echo $key | cut -d. -f2)\"" "$file" 2>/dev/null; then
      echo -e "  ${RED}✗ Missing: $key${NC}"
      ((missing++))
    fi
  done

  if [[ $missing -eq 0 ]]; then
    echo -e "  ${GREEN}✓ All keys present${NC}"
  else
    echo -e "  ${RED}✗ Missing $missing keys${NC}"
  fi
  echo ""
}

check_file "$MESSAGES_NO" "Norwegian"
check_file "$MESSAGES_EN" "English"

echo -e "${GREEN}✓ i18n check complete${NC}"

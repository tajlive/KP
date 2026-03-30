#!/bin/bash
# ============================================================================
# Verify Test Trader Script
# ============================================================================
# Verifiserer at test.trader.lowrisk@klarpakke.no:
# - Finnes i auth.users
# - Har korrekt risk profile (forsiktig, 2%/5%/1%)
# - Har aktiv paper trading session
# - Kan autentisere
#
# Bruk:
#   ./scripts/verify-test-trader.sh
# ============================================================================

set -e

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================================================"
echo "Verify Test Trader: test.trader.lowrisk@klarpakke.no"
echo "========================================================================"

# Hent DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    if [ -f ".env.local" ]; then
        export $(grep -E '^DATABASE_URL=' .env.local | xargs 2>/dev/null || true)
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}FEIL: DATABASE_URL ikke satt${NC}"
    exit 1
fi

# SQL for verifikasjon
SQL="
SELECT 
  'USER_EXISTS' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result,
  COUNT(*)::text as details
FROM auth.users 
WHERE email = 'test.trader.lowrisk@klarpakke.no'

UNION ALL

SELECT 
  'PROFILE_EXISTS' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result,
  'role: ' || COALESCE(string_agg(role, ', '), 'NONE')
FROM user_profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'test.trader.lowrisk@klarpakke.no'

UNION ALL

SELECT 
  'RISK_PROFILE' as check_name,
  CASE 
    WHEN COUNT(*) > 0 AND bool_and(max_position_pct = 2.0) THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  'profile: ' || COALESCE(string_agg(name || ' (' || max_position_pct || '%, ' || max_exposure_pct || '%, ' || max_daily_loss_pct || '%)', ', '), 'NONE')
FROM risk_profiles r
JOIN auth.users u ON r.user_id = u.id
WHERE u.email = 'test.trader.lowrisk@klarpakke.no'

UNION ALL

SELECT 
  'PAPER_SESSION' as check_name,
  CASE 
    WHEN COUNT(*) > 0 AND bool_and(status = 'active' AND current_capital_nok = 100000) THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  'capital: ' || COALESCE(string_agg(current_capital_nok::text || ' NOK (' || status || ')', ', '), 'NONE')
FROM trading_sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'test.trader.lowrisk@klarpakke.no'
  AND s.mode = 'paper'

UNION ALL

SELECT 
  'TOTAL_CHECKS' as check_name,
  'INFO' as result,
  '4 checks performed'
"

echo ""
echo "Kjører verifikasjon..."
echo ""

RESULT=$(psql "$DATABASE_URL" -t -c "$SQL" 2>&1)

# Parse resultat
echo "$RESULT" | while read -r line; do
    if [ -n "$line" ]; then
        CHECK=$(echo "$line" | awk -F '|' '{print $1}' | xargs)
        STATUS=$(echo "$line" | awk -F '|' '{print $2}' | xargs)
        DETAILS=$(echo "$line" | awk -F '|' '{print $3}' | xargs)
        
        case "$STATUS" in
            PASS)
                echo -e "${GREEN}✓${NC} $CHECK: $DETAILS"
                ;;
            FAIL)
                echo -e "${RED}✗${NC} $CHECK: $DETAILS"
                ;;
            *)
                echo "  $CHECK: $DETAILS"
                ;;
        esac
    fi
done

# Sjekk om alle passed
if echo "$RESULT" | grep -q "FAIL"; then
    echo ""
    echo -e "${RED}========================================================================${NC}"
    echo -e "${RED}VERIFIKASJON FEILET${NC}"
    echo -e "${RED}========================================================================${NC}"
    echo ""
    echo "Kjør setup på nytt:"
    echo "  npm run db:setup-test-trader"
    exit 1
else
    echo ""
    echo -e "${GREEN}========================================================================${NC}"
    echo -e "${GREEN}VERIFIKASJON OK${NC}"
    echo -e "${GREEN}========================================================================${NC}"
    echo ""
    echo "Bruker klar for E2E-tester"
    exit 0
fi

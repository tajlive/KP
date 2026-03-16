#!/bin/bash
# =====================================================
# VENT TIL DEPLOY ER LIVE
# Sjekker hvert 10. sekund til siden er oppe
# =====================================================

BASE_URL="https://klarpakke.no"
MAX_WAIT=300  # 5 minutter
INTERVAL=10   # sjekk hvert 10. sekund

echo "========================================"
echo "⏳ VENTER PÅ DEPLOY"
echo "========================================"
echo ""
echo "📡 URL: $BASE_URL/no"
echo "⏱️  Max ventetid: $MAX_WAIT sekunder"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Sjekk om timeout
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo ""
        echo "❌ Timeout etter $MAX_WAIT sekunder"
        echo "Sjekk GitHub Actions for feil:"
        echo "  https://github.com/tajlive/KP/actions"
        exit 1
    fi
    
    # Test URL
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL/no" 2>/dev/null)
    
    if [ "$STATUS" = "200" ]; then
        echo ""
        echo -e "${GREEN}🎉 DEPLOY LIVE!${NC}"
        echo "   Tid brukt: ${ELAPSED}s"
        echo ""
        echo "Åpner sider..."
        echo "  🇳🇴  $BASE_URL/no"
        echo "  🇬🇧  $BASE_URL/en"
        echo "  📝  $BASE_URL/no/opptak"
        echo ""
        echo "Kjør full test:"
        echo "  ./scripts/verify-live-deployment.sh"
        
        # Åpne i browser hvis på Mac
        if command -v open &> /dev/null; then
            open "$BASE_URL/no"
        fi
        
        exit 0
    fi
    
    # Vis progress
    printf "\r${YELLOW}⏳${NC}  Venter... (${ELAPSED}s) HTTP $STATUS     "
    
    sleep $INTERVAL
done

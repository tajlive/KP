#!/bin/bash
# =============================================================================
# FIX API GATEWAY AUTH
# =============================================================================

echo "🔧 Fikser API Gateway autentisering..."
echo ""

# Sett token
supabase secrets set API_GATEWAY_TOKEN=klarpakke-dev-token --project-ref vuxbjlykgmzskxbclquf

if [ $? -eq 0 ]; then
    echo "✅ Token satt!"
    echo ""
    echo "Tester..."
    sleep 2
    
    # Test
    curl -s https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/api-gateway/health \
        -H "Authorization: Bearer klarpakke-dev-token" | jq
else
    echo "❌ Feilet. Prøv manuelt:"
    echo "supabase secrets set API_GATEWAY_TOKEN=klarpakke-dev-token --project-ref vuxbjlykgmzskxbclquf"
fi

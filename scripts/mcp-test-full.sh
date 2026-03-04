#!/bin/bash
# =============================================================================
# MCP TEST - Full sjekk og fiks
# =============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     MCP FULL SYSTEM TEST                                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_REF="vuxbjlykgmzskxbclquf"
TOKEN="klarpakke-dev-token"

echo "1️⃣  Sjekker Supabase CLI..."
supabase --version || exit 1
echo ""

echo "2️⃣  Lister eksisterende secrets..."
supabase secrets list --project-ref $PROJECT_REF
echo ""

echo "3️⃣  Setter API_GATEWAY_TOKEN..."
supabase secrets set API_GATEWAY_TOKEN=$TOKEN --project-ref $PROJECT_REF
echo ""

echo "4️⃣  Verifiserer at secret er satt..."
supabase secrets list --project-ref $PROJECT_REF | grep API_GATEWAY_TOKEN
echo ""

echo "5️⃣  Tester API Gateway..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://$PROJECT_REF.functions.supabase.co/api-gateway/health")

echo "Respons: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ API Gateway fungerer!"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║     🎉 SYSTEMET ER LIVE!                                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    exit 0
else
    echo "❌ Feil - sjekk output over"
    exit 1
fi

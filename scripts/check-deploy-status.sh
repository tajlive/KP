#!/bin/bash
# =====================================================
# SJEKK DEPLOY STATUS
# =====================================================

echo "========================================"
echo "🔍 DEPLOY VERIFISERING"
echo "========================================"
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

URL="https://klarpakke.no"

echo "📡 Tester live URL-er..."
echo ""

ROUTES=(
  "/no:Norsk landing"
  "/en:English landing"
  "/no/opptak:Signup NO"
  "/en/opptak:Signup EN"
)

for route_info in "${ROUTES[@]}"; do
  IFS=':' read -r route description <<< "$route_info"
  full_url="${URL}${route}"
  
  # Test med curl
  status=$(curl -s -o /dev/null -w "%{http_code}" -L "$full_url" 2>/dev/null)
  
  if [ "$status" = "200" ]; then
    echo -e "  ${GREEN}✅${NC} $description"
    echo "     $full_url → $status"
  elif [ "$status" = "000" ]; then
    echo -e "  ${YELLOW}⏳${NC} $description"
    echo "     $full_url → Venter..."
  else
    echo -e "  ${RED}❌${NC} $description"
    echo "     $full_url → $status"
  fi
done

echo ""
echo "🔗 Dashboard URLer:"
echo "  GitHub Actions: https://github.com/tombomann/klarpakke/actions"
echo "  Cloudflare:   https://dash.cloudflare.com/pages"
echo ""
echo "⏰ Normal deploy-tid: 2-3 minutter"

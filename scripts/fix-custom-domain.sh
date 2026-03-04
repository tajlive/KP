#!/bin/bash
# =============================================================================
# FIX CUSTOM DOMAIN - Cloudflare Pages Domain Redirect Loop Fix
# =============================================================================
# Dette scriptet guider deg gjennom fiksing av redirect loop mellom
# klarpakke.no og www.klarpakke.no
#
# Bruk: ./scripts/fix-custom-domain.sh
# =============================================================================

set -e

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🔧 FIX CUSTOM DOMAIN - Cloudflare Pages                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Sjekk at wrangler er logget inn
echo -e "${YELLOW}1. Sjekker Wrangler login...${NC}"
if ! npx wrangler whoami &>/dev/null; then
    echo -e "${RED}❌ Du må logge inn med Wrangler først:${NC}"
    echo "   npx wrangler login"
    exit 1
fi
echo -e "${GREEN}✅ Logget inn${NC}"
echo ""

# Hent Pages prosjekt info
echo -e "${YELLOW}2. Sjekker Pages prosjekt...${NC}"
npx wrangler pages deployment list --project-name=klarpakke-new 2>&1 | head -20
echo ""

# Sjekk nåværende deployment
echo -e "${YELLOW}3. Sjekker nåværende deployment...${NC}"
LATEST_DEPLOYMENT=$(npx wrangler pages deployment list --project-name=klarpakke-new 2>&1 | grep -E "^│ [a-f0-9]+.*Production" | head -1 | awk '{print $2}')
if [ -n "$LATEST_DEPLOYMENT" ]; then
    echo -e "${GREEN}✅ Siste deployment: $LATEST_DEPLOYMENT${NC}"
    echo "   URL: https://${LATEST_DEPLOYMENT}.klarpakke-new.pages.dev"
else
    echo -e "${RED}❌ Fant ikke deployment${NC}"
fi
echo ""

# Test custom domain
echo -e "${YELLOW}4. Tester custom domain...${NC}"
echo "   Testing klarpakke.no..."
STATUS_KLAR=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 https://klarpakke.no/no 2>&1 || echo "ERROR")
echo "   Status: $STATUS_KLAR"

echo "   Testing www.klarpakke.no..."
STATUS_WWW=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 https://www.klarpakke.no/no 2>&1 || echo "ERROR")
echo "   Status: $STATUS_WWW"
echo ""

# Hvis 301/308, sjekk Location header
if [ "$STATUS_KLAR" = "301" ] || [ "$STATUS_KLAR" = "308" ]; then
    echo -e "${YELLOW}   Location header:${NC}"
    curl -s -I https://klarpakke.no/no 2>&1 | grep -i "location:" || echo "   (ingen location)"
fi
echo ""

# Manual fix guide
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  📋 MANUELL FIX-GUIDE                                            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Steget over viser status. Nå må du fikse i Cloudflare Dashboard:"
echo ""
echo -e "${GREEN}Steg 1: Sjekk DNS Records${NC}"
echo "   → https://dash.cloudflare.com/80d5b1d56a3e907150ba7348b6182894/klarpakke.no/dns"
echo "   → Sjekk at disse finnes:"
echo "      CNAME  www  klarpakke-new.pages.dev"
echo "      CNAME  @    klarpakke-new.pages.dev  (eller A/AAAA record)"
echo ""
echo -e "${GREEN}Steg 2: Sjekk SSL/TLS${NC}"
echo "   → https://dash.cloudflare.com/80d5b1d56a3e907150ba7348b6182894/klarpakke.no/ssl-tls"
echo "   → Sett Encryption mode til: Full (strict)"
echo "   → DISABLE 'Always Use HTTPS' (kan forårsake loop)"
echo ""
echo -e "${GREEN}Steg 3: Sjekk Pages Custom Domains${NC}"
echo "   → https://dash.cloudflare.com/80d5b1d56a3e907150ba7348b6182894/pages/view/klarpakke-new/domains"
echo "   → Sjekk at begge er listet:"
echo "      ✅ klarpakke.no"
echo "      ✅ www.klarpakke.no"
echo "   → Hvis status er 'Error', fjern og legg til på nytt"
echo ""
echo -e "${GREEN}Steg 4: Sjekk Rules${NC}"
echo "   → https://dash.cloudflare.com/80d5b1d56a3e907150ba7348b6182894/klarpakke.no/rules"
echo "   → Slett eventuelle Page Rules med redirects"
echo ""

# Etter fix test
echo -e "${YELLOW}Etter du har gjort endringer i Dashboard, trykk ENTER for å teste på nytt...${NC}"
read -r

echo ""
echo -e "${BLUE}Tester på nytt...${NC}"
echo ""

# Test med redirect following
echo "Testing klarpakke.no/no (med redirects):"
FINAL_URL=$(curl -s -L --max-redirs 5 -o /dev/null -w "%{url_effective}" https://klarpakke.no/no 2>&1 || echo "FAILED")
if echo "$FINAL_URL" | grep -q "klarpakke"; then
    echo -e "${GREEN}✅ Ferdig URL: $FINAL_URL${NC}"
else
    echo -e "${RED}❌ Fortsatt problemer. Siste URL: $FINAL_URL${NC}"
fi

echo ""
echo "Testing www.klarpakke.no/no (med redirects):"
FINAL_URL_WWW=$(curl -s -L --max-redirs 5 -o /dev/null -w "%{url_effective}" https://www.klarpakke.no/no 2>&1 || echo "FAILED")
if echo "$FINAL_URL_WWW" | grep -q "klarpakke"; then
    echo -e "${GREEN}✅ Ferdig URL: $FINAL_URL_WWW${NC}"
else
    echo -e "${RED}❌ Fortsatt problemer. Siste URL: $FINAL_URL_WWW${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Hvis begge URLer viser riktig side, er fiksen vellykket! 🎉"
echo ""
echo "Test API:"
echo "  curl -X POST https://klarpakke.no/api/beta-signup \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"erfaring\":\"nybegynner\",\"email\":\"test@example.com\",\"laeringsmaal\":[\"riskmanagement\"]}'"
echo ""

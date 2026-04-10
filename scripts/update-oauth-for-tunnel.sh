#!/bin/bash
# Update OAuth configuration for current Cloudflare tunnel URL
# Usage: ./scripts/update-oauth-for-tunnel.sh

set -e

echo "🔧 OAuth Tunnel Configuration Updater"
echo "======================================"
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Sjekk om cloudflared kjører
if ! pgrep -f "cloudflared" > /dev/null; then
    echo -e "${RED}❌ Cloudflared er ikke kjørende${NC}"
    echo "Start tunnel først med: cloudflared tunnel --url http://localhost:3000"
    exit 1
fi

# Hent tunnel URL fra cloudflared log (hvis tilgjengelig)
TUNNEL_URL=""

# Prøv å finne URL fra lokal log
if [ -f "/tmp/cloudflare-tunnel.url" ]; then
    TUNNEL_URL=$(cat /tmp/cloudflare-tunnel.url)
elif [ -f "/tmp/cloudflare-tunnel.log" ]; then
    TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/cloudflare-tunnel.log | tail -1)
fi

# Fallback: Bruk nåværende fra .env.local hvis ingen log
if [ -z "$TUNNEL_URL" ]; then
    if [ -f ".env.local" ]; then
        TUNNEL_URL=$(grep NEXT_PUBLIC_APP_URL .env.local | cut -d'=' -f2 | tr -d ' ')
        echo -e "${YELLOW}⚠️  Bruker eksisterende URL fra .env.local${NC}"
    fi
fi

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}❌ Kunne ikke finne tunnel URL${NC}"
    echo "Skriv inn tunnel URL manuelt:"
    read -r TUNNEL_URL
fi

echo -e "${BLUE}🌐 Tunnel URL: $TUNNEL_URL${NC}"
echo ""

# Oppdater .env.local
if [ -f ".env.local" ]; then
    # Backup
    cp .env.local .env.local.backup.$(date +%s)
    
    # Oppdater NEXT_PUBLIC_APP_URL
    if grep -q "NEXT_PUBLIC_APP_URL=" .env.local; then
        sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$TUNNEL_URL|" .env.local
    else
        echo "NEXT_PUBLIC_APP_URL=$TUNNEL_URL" >> .env.local
    fi
    
    echo -e "${GREEN}✅ Oppdatert .env.local${NC}"
else
    echo -e "${RED}❌ .env.local finnes ikke${NC}"
    exit 1
fi

# Vis nødvendige manuelle steg
echo ""
echo -e "${YELLOW}📋 MANUELLE KONFIGURASJONER NØDVENDIG:${NC}"
echo "======================================"
echo ""

echo -e "${BLUE}1. Google Cloud Console${NC}"
echo "   URL: https://console.cloud.google.com/apis/credentials"
echo "   Legg til disse Authorized redirect URIs:"
echo -e "   ${GREEN}$TUNNEL_URL/auth/callback${NC}"
echo -e "   ${GREEN}$TUNNEL_URL/api/auth/callback${NC}"
echo ""

echo -e "${BLUE}2. GitHub OAuth Apps (hvis aktuelt)${NC}"
echo "   URL: https://github.com/settings/developers"
echo "   Authorization callback URL:"
echo -e "   ${GREEN}$TUNNEL_URL/api/auth/callback${NC}"
echo ""

echo -e "${BLUE}3. Supabase Auth${NC}"
echo "   URL: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration"
echo "   Site URL:"
echo -e "   ${GREEN}$TUNNEL_URL${NC}"
echo "   Redirect URLs (legg til):"
echo -e "   ${GREEN}$TUNNEL_URL/auth/callback${NC}"
echo -e "   ${GREEN}$TUNNEL_URL/api/auth/callback${NC}"
echo -e "   ${GREEN}$TUNNEL_URL/auth/v1/callback${NC}"
echo ""

# Verifiser at URL er gyldig
echo -e "${BLUE}🧪 Verifiserer tunnel...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL" | grep -q "200\|307"; then
    echo -e "${GREEN}✅ Tunnel er tilgjengelig${NC}"
else
    echo -e "${YELLOW}⚠️  Tunnel svarer ikke (kan være OK hvis server ikke kjører)${NC}"
fi

# Vis nåværende konfigurasjon
echo ""
echo -e "${BLUE}📊 Nåværende konfigurasjon:${NC}"
echo "======================================"
grep NEXT_PUBLIC_APP_URL .env.local || echo "Ikke satt"

echo ""
echo -e "${GREEN}🚀 Klar! Start dev server med: npm run dev${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC} Cloudflare quick tunnel genererer ny URL ved restart."
echo "    Kjør dette scriptet igjen etter ny tunnel-start."

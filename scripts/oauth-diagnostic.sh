#!/bin/bash
# OAuth Diagnostic Script for Klarpakke
# Sjekker konfigurasjon på tvers av tjenester

echo "═══════════════════════════════════════════════════════════════"
echo "  OAuth Diagnostic Report - Klarpakke"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===================== GOOGLE CLOUD =====================
echo "🔍 SJEKKER GOOGLE CLOUD KONFIGURASJON..."
echo "───────────────────────────────────────────────────────────────"

# Sjekk gcloud innlogging
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✓${NC} gcloud CLI installert"
    
    ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
    if [ -n "$ACCOUNT" ]; then
        echo -e "${GREEN}✓${NC} Logget inn som: $ACCOUNT"
    else
        echo -e "${RED}✗${NC} Ikke logget inn i gcloud"
        echo "   Kjør: gcloud auth login"
    fi
    
    PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ -n "$PROJECT" ]; then
        echo -e "${GREEN}✓${NC} Prosjekt satt: $PROJECT"
    else
        echo -e "${RED}✗${NC} Ingen prosjekt satt"
        echo "   Kjør: gcloud config set project PROSJEKT-ID"
    fi
else
    echo -e "${RED}✗${NC} gcloud CLI ikke installert"
    echo "   Installer: brew install --cask google-cloud-sdk"
fi

echo ""
echo "📋 MANUELL SJEKK (Google Cloud Console):"
echo "   1. Gå til: https://console.cloud.google.com/apis/credentials"
echo "   2. Velg prosjekt: klarpakke"
echo "   3. Klikk på 'OAuth 2.0 Client ID' (Web client)"
echo "   4. Verifiser følgende:"
echo ""
echo "   Autoriserte JavaScript-opphav (Authorized JavaScript origins):"
echo "   ${YELLOW}⚠${NC}  http://localhost:3000"
echo "   ${YELLOW}⚠${NC}  https://www.klarpakke.no"
echo "   ${YELLOW}⚠${NC}  https://klarpakke.no"
echo "   ${YELLOW}⚠${NC}  https://ringtones-dedicated-mutual-scoring.trycloudflare.com"
echo ""
echo "   Autoriserte videresendings-URIer (Authorized redirect URIs):"
echo "   ${YELLOW}⚠${NC}  http://localhost:3000/auth/callback"
echo "   ${YELLOW}⚠${NC}  https://www.klarpakke.no/auth/callback"
echo "   ${YELLOW}⚠${NC}  https://klarpakke.no/auth/callback"
echo "   ${YELLOW}⚠${NC}  https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/callback"
echo ""

# ===================== SUPABASE =====================
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 SJEKKER SUPABASE KONFIGURASJON..."
echo "───────────────────────────────────────────────────────────────"

# Sjekk .env.local
if [ -f "/Users/taj/klarpakke/.env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local funnet"
    
    # Sjekk Supabase URL
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" /Users/taj/klarpakke/.env.local; then
        SB_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" /Users/taj/klarpakke/.env.local | cut -d'=' -f2)
        echo -e "${GREEN}✓${NC} Supabase URL: $SB_URL"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL mangler"
    fi
    
    # Sjekk App URL
    if grep -q "NEXT_PUBLIC_APP_URL" /Users/taj/klarpakke/.env.local; then
        APP_URL=$(grep "NEXT_PUBLIC_APP_URL" /Users/taj/klarpakke/.env.local | cut -d'=' -f2)
        echo -e "${GREEN}✓${NC} App URL: $APP_URL"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_APP_URL mangler"
    fi
else
    echo -e "${RED}✗${NC} .env.local ikke funnet"
fi

echo ""
echo "📋 MANUELL SJEKK (Supabase Dashboard):"
echo "   1. Gå til: https://supabase.com/dashboard/project/_/auth/url-configuration"
echo "   2. Sjekk 'Site URL' matcher:"
echo "   ${YELLOW}⚠${NC}  https://ringtones-dedicated-mutual-scoring.trycloudflare.com"
echo ""
echo "   3. Sjekk 'Redirect URLs' inneholder:"
echo "   ${YELLOW}⚠${NC}  https://ringtones-dedicated-mutual-scoring.trycloudflare.com/auth/callback"
echo ""
echo "   4. Gå til Authentication → Providers → Google"
echo "   5. Verifiser:"
echo "   ${YELLOW}⚠${NC}  Enabled: ON"
echo "   ${YELLOW}⚠${NC}  Client ID: (fra Google Cloud)"
echo "   ${YELLOW}⚠${NC}  Secret: (fra Google Cloud)"
echo "   ${YELLOW}⚠${NC}  Redirect URL: https://...trycloudflare.com/auth/callback"
echo ""

# ===================== LOKAL KONFIG =====================
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 LOKAL KONFIGURASJON..."
echo "───────────────────────────────────────────────────────────────"

# Sjekk dev server
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dev server kjører på port 3000"
else
    echo -e "${RED}✗${NC} Dev server IKKE kjørende"
    echo "   Start med: npm run dev"
fi

# Sjekk cloudflared
if pgrep -x "cloudflared" > /dev/null; then
    echo -e "${GREEN}✓${NC} Cloudflared tunnel aktiv"
    echo "   URL: https://ringtones-dedicated-mutual-scoring.trycloudflare.com"
else
    echo -e "${RED}✗${NC} Ingen aktiv tunnel"
    echo "   Start med: cloudflared tunnel --url http://localhost:3000"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  OPPSUMMERING"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "For å utelukke OAuth-problemer:"
echo ""
echo "1. ${YELLOW}Sjekk Google Cloud Console${NC}:"
echo "   - Har alle nødvendige redirect URIs blitt lagt til?"
echo "   - Stemmer Client ID og Secret i Supabase?"
echo ""
echo "2. ${YELLOW}Sjekk Supabase Dashboard${NC}:"
echo "   - Er Google Provider aktivert?"
echo "   - Stemmer Redirect URL?"
echo ""
echo "3. ${YELLOW}Test steg-for-steg${NC}:"
echo "   a) Åpne https://ringtones-dedicated-mutual-scoring.trycloudflare.com/login"
echo "   b) Klikk 'Logg inn med Google'"
echo "   c) Sjekk nettleser console for feilmeldinger"
echo "   d) Sjekk at du blir redirected tilbake til /auth/callback"
echo ""
echo "4. ${YELLOW}Vanlige feil${NC}:"
echo "   - 'redirect_uri_mismatch' = URI ikke whitelistet i Google Cloud"
echo "   - 'invalid_client' = Feil Client ID i Supabase"
echo "   - 'access_denied' = Bruker avviste tilgang"
echo ""
echo "═══════════════════════════════════════════════════════════════"

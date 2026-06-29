#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🐛 AUTH DEBUG TOOLKIT - Klarpakke                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== METODE 1: Sentry Check =====
echo "📊 METODE 1: Sjekker Sentry for auth-feil..."
echo "----------------------------------------"

# Sjekk om sentry-cli er tilgjengelig
if command -v sentry-cli &> /dev/null || [ -f node_modules/.bin/sentry-cli ]; then
    SENTRY_CLI="${SENTRY_CLI:-node_modules/.bin/sentry-cli}"
    echo "Sentry CLI funnet"

    # Hent siste auth-relaterte issues (hvis SENTRY_AUTH_TOKEN finnes)
    if [ -n "$SENTRY_AUTH_TOKEN" ]; then
        echo "Henter siste auth-feil fra Sentry..."
        curl -s "https://sentry.io/api/0/projects/klarpakke/klarpakke/issues/" \
            -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" 2>/dev/null | \
            grep -i "auth\|login\|session\|oauth" | head -5 || echo "Ingen auth-feil funnet i Sentry"
    else
        echo -e "${YELLOW}⚠️ SENTRY_AUTH_TOKEN ikke satt${NC}"
        echo "   Sjekk manuelt: https://klarpakke.sentry.io/issues/"
    fi
else
    echo -e "${YELLOW}⚠️ sentry-cli ikke installert${NC}"
fi

echo ""

# ===== METODE 2: Curl Header Check =====
echo "🌐 METODE 2: Sjekker HTTP headers..."
echo "----------------------------------------"

# Test callback endpoint
echo "Tester: https://www.klarpakke.no/no/auth/callback"
RESPONSE=$(curl -sI -X GET "https://www.klarpakke.no/no/auth/callback?test=1" 2>/dev/null | head -20 || echo "")

if [ -n "$RESPONSE" ]; then
    echo "$RESPONSE" | grep -E "(HTTP|Location|Set-Cookie|cache-control)" || true
else
    echo -e "${YELLOW}⚠️ curl feilet - kanskje ingen nettverk?${NC}"
fi

echo ""

# ===== METODE 3: Cloudflare Workers Logs =====
echo "🚀 METODE 3: Sjekker Cloudflare Workers logs..."
echo "----------------------------------------"

if command -v wrangler &> /dev/null || [ -f node_modules/.bin/wrangler ]; then
    WRANGLER="${WRANGLER:-node_modules/.bin/wrangler}"
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        echo "Henter siste auth-relaterte logs (avslutt med Ctrl+C)..."
        "$WRANGLER" tail --format=short 2>/dev/null | \
            grep -iE "(auth|session|oauth|cookie|login)" | \
            tail -10 || echo "Ingen auth logs funnet"
    else
        echo -e "${YELLOW}⚠️ CLOUDFLARE_API_TOKEN ikke satt${NC}"
        echo "   Sjekk Wrangler logs manuelt: wrangler tail"
    fi
else
    echo -e "${YELLOW}⚠️ wrangler CLI ikke installert${NC}"
    echo "   Installer: npm i -D wrangler"
fi

echo ""

# ===== METODE 4: Database Check =====
echo "🗄️ METODE 4: Sjekker database auth status..."
echo "----------------------------------------"

# Bruk Supabase MCP hvis tilgjengelig, ellers gi instruksjoner
echo "Sjekk manuelt i Supabase Dashboard:"
echo "   URL: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf"
echo ""
echo "SQL å kjøre:"
cat << 'SQL'
-- Sjekk siste auth events
SELECT
    email,
    last_sign_in_at,
    confirmed_at,
    raw_app_meta_data->>'provider' as provider
FROM auth.users
WHERE email = 'tomarnejensen@gmail.com'
ORDER BY last_sign_in_at DESC;

-- Sjekk aktive sessions
SELECT
    user_id,
    created_at,
    updated_at
FROM auth.sessions
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'tomarnejensen@gmail.com'
);
SQL

echo ""

# ===== METODE 5: MCP Tools =====
echo "🔧 METODE 5: Tilgjengelige MCP-verktøy..."
echo "----------------------------------------"
echo "Du har følgende MCP-verktøy for debugging:"
echo ""
echo "1. ${GREEN}Playwright MCP${NC} (@playwright/mcp)"
echo "   - Automatisk browser testing"
echo "   - Screenshot ved feil"
echo "   - Network logging"
echo ""
echo "2. ${GREEN}Chrome DevTools MCP${NC} (chrome-devtools-mcp)"
echo "   - Network inspection"
echo "   - Console logging"
echo "   - Performance profiling"
echo ""
echo "3. ${GREEN}Sentry MCP${NC}"
echo "   - Error tracking"
echo "   - Performance monitoring"
echo ""
echo "4. ${GREEN}Supabase MCP${NC}"
echo "   - DB queries"
echo "   - Auth users/sessions"
echo "   - Realtime logs"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                   🎯 ANBEFALT FREMANGSMÅTE                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "1. ${GREEN}Rask sjekk${NC}:"
echo "   npm run debug:auth:quick"
echo ""
echo "2. ${GREEN}Full Playwright test${NC}:"
echo "   npm run debug:auth"
echo ""
echo "3. ${GREEN}Manuell debugging i Chrome${NC}:"
echo "   1. Åpne DevTools (F12)"
echo "   2. Gå til Application → Cookies"
echo "   3. Logg inn med Google"
echo "   4. Sjekk at cookies har:"
echo "      - Domain: .klarpakke.no (med punktum!)"
echo "      - SameSite: None"
echo "      - Secure: true"
echo ""
echo "4. ${GREEN}Sjekk Sentry${NC}:"
echo "   https://klarpakke.sentry.io/issues/?query=is%3Aunresolved+auth"
echo ""
echo "5. ${GREEN}Database verifikasjon${NC}:"
echo "   npm run db:auth:check"

echo ""

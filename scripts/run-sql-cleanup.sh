#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# KLARPAKKE: AUTOMATISK SQL CLEANUP MED VERCEL/SUPABASE INTEGRASJON
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  KLARPAKKE SQL CLEANUP - AUTOMATISK                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Sjekk om vi er i riktig directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Feil: Kjør fra prosjektrot${NC}"
    exit 1
fi

echo "📦 Sjekker avhengigheter..."

# Sjekk om supabase-js er installert
if ! npm list @supabase/supabase-js >/dev/null 2>&1; then
    echo "📥 Installerer @supabase/supabase-js..."
    npm install @supabase/supabase-js
fi

echo ""
echo "🔑 Henter credentials fra Vercel..."

# Hent env variabler fra Vercel
if command -v vercel &> /dev/null; then
    echo "   Henter fra Vercel..."
    vercel env pull .env.temp --yes 2>/dev/null || true
fi

# Les env fil
if [ -f ".env.local" ]; then
    source .env.local
elif [ -f ".env" ]; then
    source .env
elif [ -f ".env.temp" ]; then
    source .env.temp
fi

# Sjekk at vi har nødvendige variabler
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ Feil: NEXT_PUBLIC_SUPABASE_URL ikke funnet${NC}"
    echo "   Kjør: vercel env pull"
    exit 1
fi

# Hent service role key hvis ikke allerede satt
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    # Prøv å hente fra vercel
    if command -v vercel &> /dev/null; then
        echo "   Henter SUPABASE_SERVICE_ROLE_KEY fra Vercel..."
        SUPABASE_SERVICE_ROLE_KEY=$(vercel env get SUPABASE_SERVICE_ROLE_KEY 2>/dev/null || echo "")
    fi
    
    # Hvis fortsatt ikke satt, be brukeren
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_SERVICE_ROLE_KEY ikke funnet${NC}"
        echo ""
        echo "Gå til Supabase Dashboard:"
        echo "https://app.supabase.com/project/vuxbjlykgmzskxbclquf/settings/api"
        echo ""
        echo "Kopier 'service_role key' og lim inn under:"
        read -s SUPABASE_SERVICE_ROLE_KEY
        echo ""
    fi
fi

export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "🚀 Kjører SQL cleanup..."
echo ""

# Kjør Node.js script
node scripts/execute-sql-cleanup.js

# Rydd opp
if [ -f ".env.temp" ]; then
    rm .env.temp
fi

echo ""
echo -e "${GREEN}✅ Fullført!${NC}"

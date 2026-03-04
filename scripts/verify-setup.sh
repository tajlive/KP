#!/bin/bash
# =====================================================
# KLARPAKKE UNIVERSITET - VERIFISERINGS-SCRIPT
# Sjekker at alt er på plass før testing/deploy
# =====================================================

set -e  # Exit on error

echo "🔍 VERIFISERER KLARPAKKE SETUP"
echo "=============================="
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Hjelpefunksjon for å sjekke
check_pass() {
    echo -e "${GREEN}✅${NC} $1"
}

check_fail() {
    echo -e "${RED}❌${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# 1. Sjekk Node.js
echo "📦 Sjekker Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js installert: $NODE_VERSION"
else
    check_fail "Node.js ikke installert"
fi

# 2. Sjekk package.json
echo ""
echo "📋 Sjekker package.json..."
if [ -f "package.json" ]; then
    check_pass "package.json finnes"
    
    # Sjekk etter nødvendige scripts
    if grep -q '"dev"' package.json; then
        check_pass "Script 'dev' definert"
    else
        check_fail "Script 'dev' mangler"
    fi
    
    if grep -q '"build"' package.json; then
        check_pass "Script 'build' definert"
    else
        check_fail "Script 'build' mangler"
    fi
else
    check_fail "package.json mangler!"
fi

# 3. Sjekk node_modules
echo ""
echo "📦 Sjekker dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules finnes"
    
    # Sjekk etter viktige pakker
    if [ -d "node_modules/next" ]; then
        check_pass "Next.js installert"
    else
        check_fail "Next.js mangler - kjør: npm install"
        ((ERRORS--))  # Ikke kritisk hvis vi kan fikse det
    fi
    
    if [ -d "node_modules/@sendgrid/mail" ]; then
        check_pass "@sendgrid/mail installert"
    else
        check_warn "@sendgrid/mail mangler - kjør: npm install @sendgrid/mail"
    fi
    
    if [ -d "node_modules/@supabase/supabase-js" ]; then
        check_pass "@supabase/supabase-js installert"
    else
        check_warn "@supabase/supabase-js mangler"
    fi
else
    check_fail "node_modules mangler - kjør: npm install"
fi

# 4. Sjekk source filer
echo ""
echo "📁 Sjekker source filer..."

REQUIRED_FILES=(
    "src/app/page.tsx"
    "src/app/layout.tsx"
    "src/app/opptak/page.tsx"
    "src/app/opptak/takk/page.tsx"
    "src/app/api/beta-signup/route.ts"
    "src/components/landing/Hero.tsx"
    "src/components/landing/Studieprogram.tsx"
    "src/components/landing/FoundersOffer.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file"
    else
        check_fail "$file mangler!"
    fi
done

# 5. Sjekk .env.local
echo ""
echo "🔐 Sjekker environment variables..."
if [ -f ".env.local" ]; then
    check_pass ".env.local finnes"
    
    # Sjekk etter placeholders
    if grep -q "SG\.xxxx" .env.local 2>/dev/null || \
       grep -q "your-project" .env.local 2>/dev/null || \
       grep -q "eyJ\.\.\." .env.local 2>/dev/null; then
        check_warn ".env.local inneholder placeholders - må fylles ut"
    else
        check_pass ".env.local ser ut til å være fylt ut"
    fi
    
    # Sjekk etter nødvendige variabler
    if grep -q "SENDGRID_API_KEY" .env.local; then
        check_pass "SENDGRID_API_KEY definert"
    else
        check_warn "SENDGRID_API_KEY mangler"
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        check_pass "SUPABASE_SERVICE_ROLE_KEY definert"
    else
        check_warn "SUPABASE_SERVICE_ROLE_KEY mangler"
    fi
else
    check_fail ".env.local mangler - kopier fra .env.local.example"
fi

# 6. Sjekk konfigurasjonsfiler
echo ""
echo "⚙️  Sjekker konfigurasjon..."

if [ -f "next.config.js" ]; then
    check_pass "next.config.js finnes"
else
    check_warn "next.config.js mangler"
fi

if [ -f "tsconfig.json" ]; then
    check_pass "tsconfig.json finnes"
else
    check_warn "tsconfig.json mangler"
fi

if [ -f "tailwind.config.js" ] || [ -f "tailwind.config.ts" ]; then
    check_pass "Tailwind config finnes"
else
    check_warn "Tailwind config mangler"
fi

# 7. Sjekk SQL setup fil
echo ""
echo "🗄️  Sjekker database setup..."
if [ -f "supabase-setup.sql" ]; then
    check_pass "supabase-setup.sql finnes"
else
    check_warn "supabase-setup.sql mangler"
fi

# Oppsummering
echo ""
echo "=============================="
echo "📊 OPPSUMMERING"
echo "=============================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALT SER BRA UT!${NC}"
    echo ""
    echo "Du kan nå:"
    echo "  npm run dev      # Starte dev server"
    echo "  npm run build    # Bygge for production"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} advarsel(er) funnet${NC}"
    echo ""
    echo "Det er OK å fortsette, men sjekk advarslene over."
    echo ""
else
    echo -e "${RED}❌ ${ERRORS} feil funnet${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  ${WARNINGS} advarsel(er) funnet${NC}"
    fi
    echo ""
    echo "Fiks feilene over før du fortsetter."
    echo ""
fi

echo "Neste steg:"
echo "  1. Hvis du ser feil - fiks dem først"
echo "  2. Kjør: npm run dev"
echo "  3. Test: http://localhost:3000/opptak"
echo ""

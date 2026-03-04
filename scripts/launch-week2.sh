#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# KLARPAKKE UKE 2 - LANSEINGS SCRIPT
# Bygger og deployer komplett trading-plattform
# ============================================================

echo "🚀 KLARPAKKE UKE 2 - LANSEING"
echo "=============================="

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hopp til repo-root
cd "$(dirname "$0")/.."
REPO_ROOT=$(pwd)

echo ""
echo "📁 Repo: $REPO_ROOT"
echo ""

# ============================================================
# 1. VERIFISER ENV
# ============================================================
echo -e "${BLUE}1/5 Verifiserer miljøvariabler...${NC}"

if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local finnes ikke!${NC}"
    echo "Kopier .env.local.example til .env.local og fyll inn verdier."
    exit 1
fi

# Sjekk kritiske variabler
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "NEXT_PUBLIC_SITE_URL"
)

MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env.local || grep -q "^$var=$" .env.local || grep -q "^$var=your-" .env.local; then
        echo -e "${RED}  ❌ Mangler: $var${NC}"
        MISSING=1
    else
        echo -e "${GREEN}  ✅ $var${NC}"
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${RED}Fyll inn alle påkrevde variabler i .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Alle kritiske env-variabler er satt${NC}"
echo ""

# ============================================================
# 2. VERIFISER BYGG
# ============================================================
echo -e "${BLUE}2/5 Verifiserer kode...${NC}"

# TypeScript check
echo "  🔍 TypeScript sjekk..."
if npm run type-check 2>/dev/null || npx tsc --noEmit; then
    echo -e "${GREEN}  ✅ TypeScript OK${NC}"
else
    echo -e "${YELLOW}  ⚠️  TypeScript advarsler (fortsetter...)${NC}"
fi

# Lint
echo "  🔍 Linting..."
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}  ✅ Lint OK${NC}"
else
    echo -e "${YELLOW}  ⚠️  Lint advarsler (fortsetter...)${NC}"
fi

echo ""

# ============================================================
# 3. BYGG
# ============================================================
echo -e "${BLUE}3/5 Bygger prosjektet...${NC}"

export NODE_ENV=production

if npm run build; then
    echo -e "${GREEN}✅ Build vellykket!${NC}"
else
    echo -e "${RED}❌ Build feilet!${NC}"
    exit 1
fi

echo ""

# ============================================================
# 4. VERIFISER BUILD OUTPUT
# ============================================================
echo -e "${BLUE}4/5 Verifiserer build output...${NC}"

CRITICAL_PATHS=(
    # Merk: out/index.html genereres IKKE av Next.js 14 med i18n
    # Root (/) håndteres av Cloudflare redirect til /no
    "out/no/innlogging.html"
    "out/no/opptak.html"
    "out/no/konto.html"
    "out/no/velkommen.html"
    "out/priser.html"
    "out/spar-bot.html"
    "out/varsler.html"
    "out/leaderboard.html"
    "out/paper-trading.html"
    "out/auth/callback.html"
    "out/admin.html"
)

MISSING_FILES=0
for path in "${CRITICAL_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo -e "${GREEN}  ✅ $path${NC}"
    else
        echo -e "${RED}  ❌ Mangler: $path${NC}"
        MISSING_FILES=1
    fi
done

if [ $MISSING_FILES -eq 1 ]; then
    echo ""
    echo -e "${RED}Kritiske filer mangler i build!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Alle kritiske sider finnes i build${NC}"
echo ""

# Sjekk 404 redirects
echo "  🔍 Sjekker Cloudflare redirects..."
if [ -f "out/_redirects" ]; then
    echo -e "${GREEN}  ✅ _redirects finnes${NC}"
    if grep -q "/innlogging" out/_redirects; then
        echo -e "${GREEN}  ✅ /innlogging → /no/innlogging redirect konfigurert${NC}"
    fi
    if grep -q "/opptak" out/_redirects; then
        echo -e "${GREEN}  ✅ /opptak → /no/opptak redirect konfigurert${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠️  _redirects mangler${NC}"
fi

echo ""

# ============================================================
# 5. DEPLOY
# ============================================================
echo -e "${BLUE}5/5 Deployer...${NC}"
echo ""

# Sjekk om Wrangler er tilgjengelig
if command -v wrangler &> /dev/null || npx wrangler --version &> /dev/null; then
    echo "  🚀 Deployer til Cloudflare Pages..."
    
    # Hvis brukeren har satt CF_PROJECT_NAME i env
    PROJECT_NAME=${CF_PROJECT_NAME:-klarpakke}
    
    echo "  📦 Prosjekt: $PROJECT_NAME"
    echo ""
    
    read -p "Er du sikker på at du vil deploye til PRODUKSJON? (ja/nei): " confirm
    if [ "$confirm" = "ja" ]; then
        if npx wrangler pages deploy out --project-name="$PROJECT_NAME"; then
            echo ""
            echo -e "${GREEN}✅ Deploy vellykket!${NC}"
            echo ""
            echo "🌐 Production URL: https://www.klarpakke.no"
            echo ""
        else
            echo -e "${RED}❌ Deploy feilet!${NC}"
            exit 1
        fi
    else
        echo "Avbrutt av bruker."
        exit 0
    fi
else
    echo -e "${YELLOW}Wrangler ikke funnet. Pusher til GitLab i stedet...${NC}"
    echo ""
    
    if git diff --quiet HEAD; then
        echo "Ingen endringer å committe."
    else
        git add -A
        git commit -m "deploy: launch week 2 features"
    fi
    
    git push origin main
    
    echo ""
    echo -e "${GREEN}✅ Pushed til GitLab!${NC}"
    echo "🔄 Cloudflare vil auto-deploye om 2-3 minutter"
    echo ""
fi

# ============================================================
# 6. POST-DEPLOY VERIFIKASJON
# ============================================================
echo ""
echo -e "${BLUE}6/6 Post-deploy verifikasjon...${NC}"
echo ""
echo "Venter 10 sekunder på at deploy skal propagere..."
sleep 10

TEST_URLS=(
    "https://www.klarpakke.no"
    "https://www.klarpakke.no/innlogging"
    "https://www.klarpakke.no/opptak"
    "https://www.klarpakke.no/priser"
)

echo ""
echo "Tester kritiske URL-er..."
for url in "${TEST_URLS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
        echo -e "${GREEN}  ✅ $url (HTTP $STATUS)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  $url (HTTP $STATUS)${NC}"
    fi
done

echo ""
echo "=============================="
echo -e "${GREEN}🎉 LANSEING FULLFØRT!${NC}"
echo "=============================="
echo ""
echo "Test følgende:"
echo "  1. https://www.klarpakke.no - Landing med ticker"
echo "  2. https://www.klarpakke.no/innlogging - Login med Google/MS"
echo "  3. https://www.klarpakke.no/priser - Stripe betaling"
echo "  4. https://www.klarpakke.no/spar-bot - DCA Bot"
echo ""
echo "God lansering! 🚀"

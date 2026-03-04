#!/bin/bash
# =====================================================
# KLARPAKKE UNIVERSITET - BETA SIGNUP SETUP
# Sjekker at alt er på plass før deploy
# =====================================================

echo "🎓 KLARPAKKE UNIVERSITET - Setup Checklist"
echo "=========================================="
echo ""

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Sjekk 1: Resend installert
echo -n "✅ 1. Resend package installert... "
if [ -d "node_modules/resend" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANGLER${NC}"
    echo "   → Kjør: npm install resend"
fi

# Sjekk 2: Filer finnes
echo -n "✅ 2. Filer opprettet... "
if [ -f "src/app/[locale]/opptak/page.tsx" ] && \
   [ -f "src/app/[locale]/opptak/takk/page.tsx" ] && \
   [ -f "src/app/api/beta-signup/route.ts" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANGLER${NC}"
    echo "   → Filer mangler - kontakt Kimi!"
fi

# Sjekk 3: .env.local finnes
echo -n "✅ 3. .env.local fil... "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANGLER${NC}"
    echo "   → Opprett .env.local fra template"
fi

# Sjekk 4: Env vars satt (ikke placeholder)
echo -n "✅ 4. Env vars fylt ut... "
if grep -q "re_xxxx" .env.local 2>/dev/null || \
   grep -q "your-project" .env.local 2>/dev/null || \
   grep -q "eyJ\.\.\." .env.local 2>/dev/null; then
    echo -e "${YELLOW}DELVIS${NC}"
    echo "   → Fyll ut med ekte verdier i .env.local"
else
    echo -e "${GREEN}OK${NC} (ser ut til å være fylt ut)"
fi

# Sjekk 5: Supabase SQL kjørt
echo -n "✅ 5. Supabase SQL kjørt... "
echo -e "${YELLOW}MANUELL SJEKK${NC}"
echo "   → Gå til Supabase → SQL Editor → kjør:"
echo "   → SELECT COUNT(*) FROM beta_signups;"

echo ""
echo "=========================================="
echo ""

# Vis gjenværende steg
echo "📋 GJENSTÅENDE STEG:"
echo ""

echo "${YELLOW}1. Supabase Setup (5 min):${NC}"
echo "   a) Gå til https://supabase.com/dashboard"
echo "   b) Åpne SQL Editor"
echo "   c) Copy-paste fra: supabase-setup.sql"
echo "   d) Kjør SQL"
echo ""

echo "${YELLOW}2. Resend Setup (10 min):${NC}"
echo "   a) Gå til https://resend.com"
echo "   b) Sign up (gratis: 100 emails/dag)"
echo "   c) Verifiser domenet: klarpakke.no"
echo "   d) Generer API key"
echo "   e) Copy API key (starter med re_)"
echo ""

echo "${YELLOW}3. Fyll inn .env.local:${NC}"
echo "   RESEND_API_KEY=re_din_ekte_key"
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJ..."
echo "   NEXT_PUBLIC_SUPABASE_URL=https://..."
echo ""

echo "${YELLOW}4. Test lokalt:${NC}"
echo "   npm run dev"
echo "   open http://localhost:3000/no/opptak"
echo ""

echo "${YELLOW}5. Deploy:${NC}"
echo "   a) Legg til env vars i Cloudflare/Vercel"
echo "   b) git add ."
echo "   c) git commit -m 'feat: beta signup ready'"
echo "   d) git push origin main"
echo ""

echo "=========================================="
echo "🚀 KLAR TIL DEPLOY NÅR ALLE SJEKKENE ER GRØNNE!"
echo "=========================================="

#!/bin/bash
# =============================================================================
# FIX DEPLOY - API Gateway
# =============================================================================
# Kjør denne filen for å deploye API Gateway
# =============================================================================

echo "🚀 Deployer API Gateway..."
echo ""

# Metode 1: Prøv standard deploy
echo "1️⃣  Prøver standard deploy..."
supabase functions deploy api-gateway --project-ref vuxbjlykgmzskxbclquf

if [ $? -eq 0 ]; then
    echo "✅ Deploy vellykket!"
    exit 0
fi

echo ""
echo "2️⃣  Standard deploy feilet. Prøver alternativ..."
echo ""

# Metode 2: Bruk --use-api flagg
cd ~/klarpakke
supabase functions deploy api-gateway --use-api --project-ref vuxbjlykgmzskxbclquf

if [ $? -eq 0 ]; then
    echo "✅ Deploy vellykket!"
    exit 0
fi

echo ""
echo "❌ Begge metoder feilet."
echo ""
echo "👉 Bruk Dashboard-metoden isteden:"
echo "   1. Gå til https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/functions"
echo "   2. Klikk 'New Function'"
echo "   3. Navn: api-gateway"
echo "   4. Kopier innholdet fra:"
echo "      ~/klarpakke/supabase/functions/api-gateway/index.ts"
echo "   5. Klikk 'Deploy'"

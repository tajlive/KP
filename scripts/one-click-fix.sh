#!/bin/bash
# =============================================================================
# ONE-CLICK MIGRATION FIX
# =============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🚀 ONE-CLICK MIGRATION FIX                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

SQL_FILE="/Users/taj/klarpakke/supabase/migrations/20260215000005_security_hardening.sql"

echo "📋 Steg 1: Sjekker SQL-fil..."
if [ -f "$SQL_FILE" ]; then
    echo "✅ SQL-fil funnet!"
    echo "   Linjer: $(wc -l < $SQL_FILE)"
else
    echo "❌ SQL-fil ikke funnet!"
    exit 1
fi

echo ""
echo "📋 Steg 2: Kopierer SQL til utklippstavlen..."
if command -v pbcopy &> /dev/null; then
    cat "$SQL_FILE" | pbcopy
    echo "✅ SQL kopiert! (Cmd+V for å lime inn)"
elif command -v xclip &> /dev/null; then
    cat "$SQL_FILE" | xclip -selection clipboard
    echo "✅ SQL kopiert! (Ctrl+V for å lime inn)"
else
    echo "⚠️  Kunne ikke kopiere automatisk."
    echo "   Åpner filen isteden..."
    open "$SQL_FILE"
fi

echo ""
echo "📋 Steg 3: Åpner Supabase Dashboard..."
open "https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 NESTE STEG (Gjør dette manuelt):"
echo ""
echo "1. Lim inn SQL i Supabase SQL Editor"
echo "2. Klikk 'Run'"
echo "3. Vent på 'Success'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Trykk ENTER når du har kjørt SQL..."
read

echo ""
echo "📋 Steg 4: Verifiserer..."
cd /Users/taj/klarpakke

# Test API
echo "Tester API Gateway..."
RESPONSE=$(curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  https://vuxbjlykgmzskxbclquf.functions.supabase.co/api-gateway/health)

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ API Gateway fungerer!"
else
    echo "⚠️  API Gateway: $RESPONSE"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     ✅ ONE-CLICK FIX COMPLETE!                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

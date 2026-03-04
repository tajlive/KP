#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# KLARPAKKE: AUTOMATISK SQL CLEANUP - ENKEL VERSJON
# ═══════════════════════════════════════════════════════════════════════════
# 
# Denne scripten:
# 1. Åpner Supabase SQL Editor i browser (hvis tilgjengelig)
# 2. Kopierer SQL til clipboard
# 3. Gir instruksjoner for manuell kjøring
#
# For FULL automatisering, se instruksjoner nederst.
# ═══════════════════════════════════════════════════════════════════════════

set -e

PROJECT_REF="vuxbjlykgmzskxbclquf"
SQL_FILE="supabase/migrations/performance_cleanup_20260224/EXECUTE_NOW.sql"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  KLARPAKKE SQL CLEANUP - AUTO-SETUP                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Sjekk at filen finnes
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Feil: $SQL_FILE ikke funnet"
    exit 1
fi

# Kopier SQL til clipboard hvis mulig
SQL_CONTENT=$(cat "$SQL_FILE")

if command -v pbcopy &> /dev/null; then
    # macOS
    echo "$SQL_CONTENT" | pbcopy
    echo "✅ SQL kopiert til clipboard (macOS)"
elif command -v xclip &> /dev/null; then
    # Linux
    echo "$SQL_CONTENT" | xclip -selection clipboard
    echo "✅ SQL kopiert til clipboard (Linux)"
elif command -v clip &> /dev/null; then
    # Windows
    echo "$SQL_CONTENT" | clip
    echo "✅ SQL kopiert til clipboard (Windows)"
else
    echo "⚠️  Kunne ikke kopiere til clipboard automatisk"
fi

echo ""
echo "🔗 Åpner Supabase SQL Editor..."
SQL_URL="https://app.supabase.com/project/$PROJECT_REF/sql/new"

if command -v open &> /dev/null; then
    open "$SQL_URL"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$SQL_URL"
elif command -v start &> /dev/null; then
    start "$SQL_URL"
else
    echo "   Kunne ikke åpne browser automatisk"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  INSTRUKSJONER                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Supabase SQL Editor er åpnet (eller åpne manuelt):"
echo "   $SQL_URL"
echo ""
echo "2. Lim inn SQL (allerede kopiert til clipboard)"
echo ""
echo "3. Klikk 'Run' i SQL Editoren"
echo ""
echo "4. Kopier output og lim inn her for rapportgenerering"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  FULL AUTOMATISERING (Valgfritt)                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "For 100% automatisering uten manuell kopiering:"
echo ""
echo "1. Hent service_role key fra Supabase:"
echo "   https://app.supabase.com/project/$PROJECT_REF/settings/api"
echo ""
echo "2. Sett environment variable:"
echo "   export SUPABASE_SERVICE_ROLE_KEY=your_key_here"
echo ""
echo "3. Kjør: node scripts/execute-sql-cleanup.js"
echo ""

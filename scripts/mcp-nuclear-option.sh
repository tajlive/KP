#!/bin/bash
# =============================================================================
# MCP NUCLEAR OPTION - Tving push
# =============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     ☢️  NUCLEAR OPTION - FORCE SYNC                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/taj/klarpakke

# Alternativ 1: Bruk db reset (tømmer og gjenoppretter)
echo "⚠️  Alternativ 1: db reset (tømmer databasen og kjører alle migrasjoner)"
echo "   Kommando: supabase db reset"
echo ""

# Alternativ 2: Link på nytt
echo "⚠️  Alternativ 2: Unlink og link på nytt"
echo "   Kommando:"
echo "   supabase unlink"
echo "   supabase link --project-ref vuxbjlykgmzskxbclquf"
echo "   supabase db push"
echo ""

# Alternativ 3: Manuell SQL
echo "⚠️  Alternativ 3: Manuell SQL i Supabase Dashboard"
echo "   Gå til: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql"
echo "   Kjør sikkerhets-migrasjonen manuelt"
echo ""

# Sjekk hvilke migrasjoner som finnes lokalt
echo "📁 Lokale migrasjoner:"
ls -1 supabase/migrations/ | tail -10

echo ""
echo "💡 ANBEFALING:"
echo "   Siden du har 20260215000005_security_hardening.sql"
echo "   Anbefaler jeg Alternativ 3 - kjør SQL manuelt i Dashboard."
echo ""
echo "   Eller: Slett konflikt-migrasjoner og prøv igjen:"
echo "   rm supabase/migrations/20260213.sql 2>/dev/null"
echo "   rm supabase/migrations/20240214*.sql 2>/dev/null"
echo "   supabase db pull && supabase db push"

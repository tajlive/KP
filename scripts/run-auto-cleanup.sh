#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AUTO CLEANUP - Henter key fra .env.local automatisk
# ═══════════════════════════════════════════════════════════════════════════

set -e

cd "$(dirname "$0")/.."

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  KLARPAKKE AUTO CLEANUP                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Les .env.local
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Sjekk om vi har service_role key
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY ikke funnet i .env.local"
  echo ""
  echo "Legg til denne linjen i .env.local:"
  echo "SUPABASE_SERVICE_ROLE_KEY=din_service_role_key_her"
  echo ""
  echo "Hent key fra: https://app.supabase.com/project/vuxbjlykgmzskxbclquf/settings/api"
  exit 1
fi

echo "✅ Key funnet i .env.local"
echo ""

# Kjør auto-fix
echo "🚀 Starter auto-fix av 186 slow RLS policies..."
echo ""

node scripts/auto-fix-rls.cjs

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  FULLFØRT!                                                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"

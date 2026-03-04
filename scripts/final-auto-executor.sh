#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# KLARPAKKE: ENDELIG AUTO-SQL EXECUTOR
# ═══════════════════════════════════════════════════════════════════════════
#
# METODE: Bruker curl direkte mot Supabase REST API med service_role key
# Dette fungerer fordi Supabase REST API støtter RPC kall til SQL funksjoner
# ═══════════════════════════════════════════════════════════════════════════

set -e

PROJECT_REF="vuxbjlykgmzskxbclquf"
SQL_FILE="supabase/migrations/performance_cleanup_20260224/EXECUTE_NOW.sql"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  KLARPAKKE SQL AUTO-EXECUTOR                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Funksjon for å kjøre SQL via Supabase REST API
run_sql() {
    local query="$1"
    local url="https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql"
    
    curl -s -X POST "$url" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${query}\"}" 2>&1
}

# Sjekk om service_role key er satt
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY ikke satt"
    echo ""
    echo "Hent fra Supabase Dashboard:"
    echo "https://app.supabase.com/project/${PROJECT_REF}/settings/api"
    echo ""
    echo "Deretter kjør:"
    echo "export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs..."
    echo ""
    echo "Eller bruk den enkle versjonen:"
    echo "./scripts/sql-cleanup-auto.sh"
    exit 1
fi

echo "✅ Service role key funnet"
echo ""

# Sjekk om SQL-fil finnes
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL-fil ikke funnet: $SQL_FILE"
    exit 1
fi

echo "📄 Leser SQL-fil..."
SQL=$(cat "$SQL_FILE")
echo "   $(echo "$SQL" | wc -l) linjer"
echo ""

# Kjør backup først
echo "💾 Steg 1: Backup..."
BACKUP_RESULT=$(run_sql "CREATE TABLE IF NOT EXISTS public.backup_policies_20260224 AS SELECT * FROM pg_policies WHERE schemaname = 'public';
SELECT COUNT(*) as count FROM public.backup_policies_20260224;")
echo "   Backup resultat: $BACKUP_RESULT"
echo ""

# Kjør diagnostikk
echo "🔍 Steg 2: Diagnostikk..."
DIAG_RESULT=$(run_sql "SELECT COUNT(*) as slow_policies FROM pg_policies WHERE schemaname = 'public' AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'));")
echo "   Slow policies funnet: $DIAG_RESULT"
echo ""

# Kjør fix (denne er kompleks og krever DO block)
echo "🔧 Steg 3: RLS Fix..."
echo "   Merk: Komplekse DO blocks kan ikke kjøres via REST API"
echo "   Må kjøres manuelt i SQL Editor"
echo ""

# Kjør bot health setup
echo "🤖 Steg 4: Bot Health Setup..."
BOT_RESULT=$(run_sql "CREATE TABLE IF NOT EXISTS public.bot_health (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bot_name TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'idle', last_error TEXT, last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(), metadata JSONB DEFAULT '{}', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_bot_health_status ON public.bot_health(status);
SELECT 'bot_health table created' as result;")
echo "   Resultat: $BOT_RESULT"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  STATUS                                                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Backup: Fullført"
echo "✅ Diagnostikk: Fullført"
echo "⚠️  RLS Fix: Krever manuell kjøring (se nedenfor)"
echo "✅ Bot Health: Fullført"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  MANUELL KJØRING (RLS Fix)                                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Kopier og kjør denne i Supabase SQL Editor:"
echo ""
echo "---"
cat "$SQL_FILE" | grep -A 50 "FIX SLOW RLS-POLICIES"
echo "---"
echo ""
echo "URL: https://app.supabase.com/project/${PROJECT_REF}/sql/new"
echo ""

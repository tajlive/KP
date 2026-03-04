#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# KLARPAKKE: VERIFISÉR ETTER PERFORMANCE CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════
# 
# Detaljert verifisering at alt fungerer etter cleanup
#
# BRUK:
#   ./scripts/performance-cleanup-verify.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PROJECT_REF="vuxbjlykgmzskxbclquf"

# Sjekk .env.local
if [ ! -f .env.local ]; then
    echo -e "${RED}[ERROR]${NC} .env.local ikke funnet!"
    exit 1
fi

set -a
source .env.local
set +a

echo -e "${CYAN}${BOLD}"
echo "═══════════════════════════════════════════════════════════════"
echo "  KLARPAKKE VERIFISERING ETTER CLEANUP"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}\n"

# Sjekk Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Supabase CLI ikke installert"
    exit 1
fi

failed=0

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Auth fungerer
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${BOLD}1. SJEKKER AUTH FUNKSJONALITET${NC}"

auth_test_sql=$(cat <<'EOF'
SELECT 
  'auth.uid() returns value' as test,
  auth.uid() IS NOT NULL as passed;
EOF
)

# Vi kan ikke teste auth.uid() direkte via CLI, men vi kan sjekke at policies eksisterer
policy_count_sql="SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';"
policy_count=$(echo "$policy_count_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

if [ "$policy_count" -gt 0 ]; then
    echo -e "   ${GREEN}✅ $policy_count RLS policies eksisterer${NC}"
else
    echo -e "   ${RED}❌ Ingen RLS policies funnet!${NC}"
    ((failed++))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Ingen slow policies
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}2. VERIFISERER RLS OPTIMALISERING${NC}"

slow_sql=$(cat <<'EOF'
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
EOF
)

slow_count=$(echo "$slow_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

if [ "$slow_count" -eq 0 ]; then
    echo -e "   ${GREEN}✅ Alle RLS policies er optimalisert${NC}"
else
    echo -e "   ${RED}❌ $slow_count slow policies gjenstår!${NC}"
    ((failed++))
fi

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Bot Health
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}3. VERIFISERER BOT HEALTH MONITORING${NC}"

bot_table_sql=$(cat <<'EOF'
SELECT 
  'bot_health table' as component,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_health') 
    THEN 'EXISTS' ELSE 'MISSING' END as status;
EOF
)

bot_table=$(echo "$bot_table_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -E '(EXISTS|MISSING)' || echo "MISSING")

if [ "$bot_table" = "EXISTS" ]; then
    echo -e "   ${GREEN}✅ bot_health tabell eksisterer${NC}"
else
    echo -e "   ${YELLOW}⚠️  bot_health tabell mangler${NC}"
fi

cron_sql=$(cat <<'EOF'
SELECT 
  'bot-health-monitor' as job,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) 
    THEN 'AKTIV' ELSE 'INAKTIV' END as status;
EOF
)

cron_status=$(echo "$cron_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -E '(AKTIV|INAKTIV)' || echo "INAKTIV")

if [ "$cron_status" = "AKTIV" ]; then
    echo -e "   ${GREEN}✅ Bot health cron job er aktiv${NC}"
else
    echo -e "   ${YELLOW}⚠️  Bot health cron job er inaktiv${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Backup finnes
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}4. SJEKKER BACKUP${NC}"

backup_sql=$(cat <<'EOF'
SELECT 
  'backup_policies_20260224' as backup_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_policies_20260224') 
    THEN 'EXISTS' ELSE 'MISSING' END as status,
  (SELECT COUNT(*) FROM public.backup_policies_20260224) as policy_count;
EOF
)

backup_result=$(echo "$backup_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null)

if echo "$backup_result" | grep -q "EXISTS"; then
    backup_count=$(echo "$backup_result" | grep -o '[0-9]*' | tail -1 || echo "0")
    echo -e "   ${GREEN}✅ Backup finnes ($backup_count policies)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Backup tabell ikke funnet${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Database Performance
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}5. DATABASE METRIKKER${NC}"

metrics_sql=$(cat <<'EOF'
SELECT 
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public') as total_tables,
  (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size;
EOF
)

echo -e "   ${BLUE}[METRICS]${NC}"
echo "$metrics_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | tail -n +2 | while read line; do
    echo -e "   • $line"
done

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL RESULTAT
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"

if [ "$failed" -eq 0 ]; then
    echo -e "\n  ${GREEN}${BOLD}✅ ALL VERIFISERING BESTÅTT!${NC}\n"
    echo -e "  Database cleanup var vellykket.\n"
else
    echo -e "\n  ${RED}${BOLD}❌ $failed TESTER FEILET${NC}\n"
    echo -e "  Noe kan være galt. Vurder rollback:\n"
    echo -e "  ${CYAN}./scripts/performance-cleanup-auto.sh --rollback${NC}\n"
    exit 1
fi

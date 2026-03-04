#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# KLARPAKKE: SJEKK STATUS FØR PERFORMANCE CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════
# 
# Rask sjekk av database status uten å gjøre endringer
# Brukes for å vurdere om cleanup er nødvendig
#
# BRUK:
#   ./scripts/performance-cleanup-check.sh
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
echo "  KLARPAKKE DATABASE STATUS CHECK"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}\n"

# Sjekk Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Supabase CLI ikke installert"
    exit 1
fi

echo -e "${BLUE}[CHECK]${NC} Sjekker database status...\n"

# ═══════════════════════════════════════════════════════════════════════════════
# SJEKK 1: Slow RLS Policies
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${BOLD}1. SLOW RLS POLICIES (auth.uid() problem)${NC}"

slow_count_sql=$(cat <<'EOF'
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
EOF
)

slow_count=$(echo "$slow_count_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

if [ "$slow_count" -gt 0 ]; then
    echo -e "   ${RED}❌ $slow_count policies har auth.uid() uten SELECT${NC}"
    echo -e "   ${YELLOW}   Impact: 10-100x tregere queries på store tabeller${NC}"
    
    # Vis top 5
    echo -e "\n   ${BOLD}Top 5 tabeller med størst impact:${NC}"
    top_tables_sql=$(cat <<'EOF'
SELECT 
  p.tablename,
  COUNT(*) as policy_count,
  COALESCE(s.n_live_tup, 0) as row_count
FROM pg_policies p
LEFT JOIN pg_stat_user_tables s ON s.relname = p.tablename AND s.schemaname = 'public'
WHERE p.schemaname = 'public'
  AND (
    (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(SELECT auth.uid())%')
    OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(SELECT auth.uid())%')
  )
GROUP BY p.tablename, s.n_live_tup
ORDER BY s.n_live_tup DESC NULLS LAST
LIMIT 5;
EOF
)
    echo "$top_tables_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | tail -n +2 | while read line; do
        echo -e "   • $line"
    done
else
    echo -e "   ${GREEN}✅ Ingen slow RLS policies funnet${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SJEKK 2: Unused Indexes
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}2. UNUSED INDEXES${NC}"

unused_sql=$(cat <<'EOF'
SELECT 
  COUNT(*) as count,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%';
EOF
)

unused_result=$(echo "$unused_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null)
unused_count=$(echo "$unused_result" | grep -o '[0-9]*' | head -1 || echo "0")
unused_size=$(echo "$unused_result" | grep -oE '[0-9]+ [KMGT]B' || echo "0 MB")

if [ "$unused_count" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  $unused_count unused indexes ($unused_size)${NC}"
    echo -e "   ${YELLOW}   Kan frigjøre diskplass og forbedre write-performance${NC}"
else
    echo -e "   ${GREEN}✅ Ingen unused indexes${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SJEKK 3: Overlappende Policies
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}3. OVERLAPPENDE POLICIES${NC}"

overlap_sql=$(cat <<'EOF'
SELECT COUNT(*) FROM (
  SELECT tablename, cmd 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND permissive = 'PERMISSIVE' 
  GROUP BY tablename, cmd 
  HAVING COUNT(*) > 2
) t;
EOF
)

overlap_count=$(echo "$overlap_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

if [ "$overlap_count" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  $overlap_count tabeller har overlappende policies${NC}"
else
    echo -e "   ${GREEN}✅ Ingen overlappende policies funnet${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SJEKK 4: Bot Health Cron
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${BOLD}4. BOT HEALTH MONITORING${NC}"

cron_sql=$(cat <<'EOF'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) 
    THEN 'AKTIV'
    ELSE 'INAKTIV'
  END as status;
EOF
)

cron_status=$(echo "$cron_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -E '(AKTIV|INAKTIV)' || echo "INAKTIV")

if [ "$cron_status" = "AKTIV" ]; then
    echo -e "   ${GREEN}✅ Bot health cron job er aktiv${NC}"
else
    echo -e "   ${YELLOW}⚠️  Bot health cron job er inaktiv${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# OPPSUMMERING
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}OPPSUMMERING${NC}\n"

total_issues=0

if [ "$slow_count" -gt 0 ]; then
    echo -e "  ${RED}● $slow_count slow RLS policies må fikses${NC}"
    ((total_issues+=slow_count))
fi

if [ "$unused_count" -gt 0 ]; then
    echo -e "  ${YELLOW}● $unused_count unused indexes kan droppes${NC}"
    ((total_issues+=unused_count))
fi

if [ "$overlap_count" -gt 0 ]; then
    echo -e "  ${YELLOW}● $overlap_count tabeller har overlappende policies${NC}"
    ((total_issues+=overlap_count))
fi

if [ "$cron_status" != "AKTIV" ]; then
    echo -e "  ${YELLOW}● Bot health monitoring må aktiveres${NC}"
    ((total_issues+=1))
fi

if [ "$total_issues" -eq 0 ]; then
    echo -e "\n  ${GREEN}${BOLD}✅ Database er optimal! Ingen cleanup nødvendig.${NC}\n"
else
    echo -e "\n  ${YELLOW}${BOLD}⚠️  $total_issues issues funnet${NC}"
    echo -e "\n  ${BOLD}Kjør cleanup med:${NC}"
    echo -e "  ${CYAN}./scripts/performance-cleanup-auto.sh${NC}\n"
fi

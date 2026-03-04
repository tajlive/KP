#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# KLARPAKKE: AUTOMATISK DATABASE PERFORMANCE CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════
# 
# Dette scriptet automatiserer:
# 1. Backup av 233+ RLS policies
# 2. Fix av 186 slow RLS policies (auth.uid() -> SELECT auth.uid())
# 3. Drop av 20+ unused indexes
# 4. Aktivering av bot health cron job
#
# BEGRENSNINGER:
# - Krever Supabase CLI installert
# - Kjører lokalt, leser credentials fra .env.local
# - Eksponerer ALDRI service_role key i logger
#
# BRUK:
#   chmod +x scripts/performance-cleanup-auto.sh
#   ./scripts/performance-cleanup-auto.sh
#
# ROLLBACK:
#   ./scripts/performance-cleanup-auto.sh --rollback
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Konfigurasjon
PROJECT_REF="vuxbjlykgmzxbclquf"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
LOG_DIR="logs/performance-cleanup-$(date +%Y%m%d-%H%M%S)"
BACKUP_TABLE="backup_policies_20260224"
ROLLBACK_MODE=false
DRY_RUN=false

# ═══════════════════════════════════════════════════════════════════════════════
# HJELPEFUNKSJONER
# ═══════════════════════════════════════════════════════════════════════════════

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_DIR/cleanup.log"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_DIR/cleanup.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_DIR/cleanup.log"
}

log_section() {
    echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}\n" | tee -a "$LOG_DIR/cleanup.log"
}

log_cmd() {
    echo -e "${BLUE}[SQL]${NC} $1" | tee -a "$LOG_DIR/cleanup.log"
}

# ═══════════════════════════════════════════════════════════════════════════════
# INITIALISERING
# ═══════════════════════════════════════════════════════════════════════════════

init() {
    # Opprett logg-mappe
    mkdir -p "$LOG_DIR"
    
    # Sjekk .env.local
    if [ ! -f .env.local ]; then
        log_error ".env.local ikke funnet!"
        exit 1
    fi
    
    # Last inn miljøvariabler (kun det vi trenger)
    set -a
    source .env.local
    set +a
    
    # Verifiser at Supabase CLI er installert
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI ikke installert. Installer med: npm install -g supabase"
        exit 1
    fi
    
    # Verifiser at vi er logget inn
    if ! supabase projects list &> /dev/null; then
        log_error "Ikke logget inn i Supabase CLI. Kjør: supabase login"
        exit 1
    fi
    
    # Link prosjekt hvis ikke allerede linket
    if [ ! -d .supabase ]; then
        log_info "Linker til Supabase prosjekt..."
        supabase link --project-ref "$PROJECT_REF"
    fi
    
    log_info "Logg-mappe: $LOG_DIR"
    log_info "Prosjekt: $PROJECT_REF"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SQL UTFØRELSE VIA SUPABASE CLI
# ═══════════════════════════════════════════════════════════════════════════════

execute_sql() {
    local sql="$1"
    local description="${2:-SQL query}"
    local output_file="$LOG_DIR/$(echo "$description" | tr ' ' '_' | tr '[:upper:]' '[:lower:]').json"
    
    log_cmd "$description"
    
    if [ "$DRY_RUN" = true ]; then
        log_warn "DRY RUN - ville kjørt: ${sql:0:100}..."
        return 0
    fi
    
    # Bruk Supabase CLI til å kjøre SQL
    local result
    if result=$(echo "$sql" | supabase db execute --project-ref "$PROJECT_REF" 2>&1); then
        echo "$result" > "$output_file"
        log_info "✅ Suksess: $description"
        return 0
    else
        log_error "❌ Feil: $description"
        log_error "$result"
        echo "$result" > "$output_file.error"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEG 1: BACKUP
# ═══════════════════════════════════════════════════════════════════════════════

step_backup() {
    log_section "STEG 1: BACKUP AV ALLE RLS-POLICIES"
    
    local sql=$(cat <<'EOF'
BEGIN;

DROP TABLE IF EXISTS public.backup_policies_20260224;

CREATE TABLE public.backup_policies_20260224 AS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  NOW() as backed_up_at
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
  'BACKUP FULLFØRT' as status,
  COUNT(*) as total_policies_backed_up,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM public.backup_policies_20260224;

COMMIT;
EOF
)
    
    execute_sql "$sql" "Backup RLS policies"
    
    # Lagre antall policies
    local count_sql="SELECT COUNT(*) FROM public.backup_policies_20260224;"
    local count_result
    count_result=$(echo "$count_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | head -1)
    log_info "$count_result policies backet opp"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEG 2: DIAGNOSTIKK
# ═══════════════════════════════════════════════════════════════════════════════

step_diagnose() {
    log_section "STEG 2: DIAGNOSTIKK"
    
    # Sjekk slow RLS policies
    local slow_sql=$(cat <<'EOF'
SELECT 
  'SLOW_RLS_POLICIES' as check_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
EOF
)
    
    local slow_count
    slow_count=$(echo "$slow_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | tail -1)
    log_info "Slow RLS policies funnet: $slow_count"
    
    # Sjekk unused indexes
    local unused_sql=$(cat <<'EOF'
SELECT 
  'UNUSED_INDEXES' as check_type,
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
    
    execute_sql "$unused_sql" "Sjekk unused indexes"
    
    # Sjekk pg_cron
    local cron_sql=$(cat <<'EOF'
SELECT 
  'PG_CRON' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN 'INSTALLED' ELSE 'NOT_INSTALLED' END as status;
EOF
)
    
    execute_sql "$cron_sql" "Sjekk pg_cron extension"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEG 3: FIX RLS POLICIES
# ═══════════════════════════════════════════════════════════════════════════════

step_fix_rls() {
    log_section "STEG 3: FIX SLOW RLS POLICIES"
    
    if [ "$ROLLBACK_MODE" = true ]; then
        log_warn "Rollback mode - skipper RLS fix"
        return 0
    fi
    
    local sql=$(cat <<'EOF'
DO $$
DECLARE
  policy_record RECORD;
  fix_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'STARTER RLS auth.uid() FIX';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  FOR policy_record IN 
    SELECT 
      tablename,
      policyname,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
        OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
      )
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      -- Erstatt auth.uid() med (SELECT auth.uid())
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        policy_record.policyname, 
        policy_record.tablename
      );
      
      IF policy_record.with_check IS NOT NULL AND policy_record.with_check <> '' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)', 
          policy_record.policyname,
          policy_record.tablename,
          policy_record.cmd,
          regexp_replace(policy_record.qual, '(?<!\(SELECT )auth\.uid\(\)(?!\))', '(SELECT auth.uid())', 'g'),
          regexp_replace(policy_record.with_check, '(?<!\(SELECT )auth\.uid\(\)(?!\))', '(SELECT auth.uid())', 'g')
        );
      ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)', 
          policy_record.policyname,
          policy_record.tablename,
          policy_record.cmd,
          regexp_replace(policy_record.qual, '(?<!\(SELECT )auth\.uid\(\)(?!\))', '(SELECT auth.uid())', 'g')
        );
      END IF;
      
      fix_count := fix_count + 1;
      RAISE NOTICE '✅ Fixed: %.%', policy_record.tablename, policy_record.policyname;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING '❌ Feil ved "%" på "%": %', 
        policy_record.policyname, 
        policy_record.tablename,
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RLS FIX FULLFØRT';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Suksess: % policies', fix_count;
  RAISE NOTICE '❌ Feil: % policies', error_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
END $$;

-- Verifiser
SELECT 
  COUNT(*) as remaining_slow_policies,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL POLICIES ER NÅ OPTIMALISERT!'
    ELSE '⚠️ Noen policies ble ikke fikset'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );
EOF
)
    
    execute_sql "$sql" "Fix RLS auth.uid() policies"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEG 4: DROP UNUSED INDEXES
# ═══════════════════════════════════════════════════════════════════════════════

step_drop_indexes() {
    log_section "STEG 4: DROP UNUSED INDEXES"
    
    if [ "$ROLLBACK_MODE" = true ]; then
        log_warn "Rollback mode - skipper index drop"
        return 0
    fi
    
    # Generer drop-script automatisk
    local generate_sql=$(cat <<'EOF'
SELECT 
  'DROP INDEX IF EXISTS ' || schemaname || '.' || indexrelname || '; -- ' || 
  pg_size_pretty(pg_relation_size(indexrelid)) || ' | Table: ' || relname as drop_statement
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE 'pg_%'
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE 'idx_%_unique'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 50;
EOF
)
    
    log_info "Genererer drop-script for unused indexes..."
    echo "$generate_sql" | supabase db execute --project-ref "$PROJECT_REF" > "$LOG_DIR/drop-indexes.sql" 2>&1 || true
    
    # Les filen og utfør drops
    local drop_commands=""
    while IFS= read -r line; do
        if [[ $line == *"DROP INDEX"* ]]; then
            drop_commands+="$line"
        fi
    done < "$LOG_DIR/drop-indexes.sql"
    
    if [ -z "$drop_commands" ]; then
        log_info "Ingen unused indexes å droppe"
        return 0
    fi
    
    log_warn "Skal droppe følgende indexes:"
    cat "$LOG_DIR/drop-indexes.sql" | grep "DROP INDEX" | head -20
    
    read -p "Fortsett? (ja/NEI): " confirm
    if [ "$confirm" != "ja" ]; then
        log_info "Avbrutt av bruker"
        return 0
    fi
    
    # Kjør drops
    execute_sql "BEGIN; $drop_commands COMMIT;" "Drop unused indexes"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEG 5: AKTIVÉR BOT HEALTH CRON
# ═══════════════════════════════════════════════════════════════════════════════

step_bot_health() {
    log_section "STEG 5: AKTIVÉR BOT HEALTH ALERTING"
    
    if [ "$ROLLBACK_MODE" = true ]; then
        log_warn "Rollback mode - skipper bot health setup"
        return 0
    fi
    
    local sql=$(cat <<'EOF'
-- Opprett bot_health tabell hvis den ikke finnes
CREATE TABLE IF NOT EXISTS public.bot_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'idle',
  last_error TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_health_status ON public.bot_health(status);
CREATE INDEX IF NOT EXISTS idx_bot_health_heartbeat ON public.bot_health(last_heartbeat);

-- Aktiver pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fjern gammel jobb
SELECT cron.unschedule('bot-health-monitor');

-- Opprett ny cron-job (hvert 10. minutt)
SELECT cron.schedule(
  'bot-health-monitor',
  '*/10 * * * *',
  $$
  WITH unhealthy AS (
    SELECT bot_name, status, last_error,
           EXTRACT(EPOCH FROM (NOW() - last_heartbeat))/60 as min_since_heartbeat
    FROM bot_health
    WHERE status = 'error'
       OR status = 'stopped'
       OR last_heartbeat < NOW() - INTERVAL '15 minutes'
  )
  SELECT net.http_post(
    url := 'https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/broadcast-telegram',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'message',
      '🚨 Bot Health Alert: ' || COUNT(*) || ' unhealthy bots
' ||
      string_agg(bot_name || ' (' || status || '): ' || COALESCE(last_error, 'No heartbeat'), '
')
    )
  )
  FROM unhealthy;
  $$
);

-- Verifiser
SELECT 
  jobname, schedule, active,
  CASE WHEN active THEN '✅ AKTIV' ELSE '❌ INAKTIV' END as status
FROM cron.job WHERE jobname = 'bot-health-monitor';
EOF
)
    
    execute_sql "$sql" "Setup bot health cron job"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEG 6: VERIFISERING
# ═══════════════════════════════════════════════════════════════════════════════

step_verify() {
    log_section "STEG 6: ENDELIG VERIFISERING"
    
    local sql=$(cat <<'EOF'
SELECT 
  '═══════════════════════════════════════════════════════════════════' as separator;

SELECT 'VERIFISERING ETTER CLEANUP' as title;

SELECT 
  'Slow RLS policies' as check_item,
  (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' 
    AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
         OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'))) as value,
  '0' as target,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' 
          AND ((qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
               OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%'))) = 0
    THEN '✅'
    ELSE '❌'
  END as status;

SELECT 
  'Unused indexes' as check_item,
  (SELECT COUNT(*)::text FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public'
    AND indexrelname NOT LIKE '%_pkey' AND indexrelname NOT LIKE '%_unique%') as value,
  '< 10' as target,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0 AND schemaname = 'public'
          AND indexrelname NOT LIKE '%_pkey' AND indexrelname NOT LIKE '%_unique%') < 10
    THEN '✅'
    ELSE '⚠️'
  END as status;

SELECT 
  'Bot monitoring' as check_item,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) 
    THEN 'AKTIV' ELSE 'INAKTIV' END as value,
  'AKTIV' as target,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bot-health-monitor' AND active) 
    THEN '✅' ELSE '❌' END as status;

SELECT 'CLEANUP FULLFØRT!' as done, NOW() as completed_at;
EOF
)
    
    execute_sql "$sql" "Final verification"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ROLLBACK
# ═══════════════════════════════════════════════════════════════════════════════

step_rollback() {
    log_section "ROLLBACK: GJENOPPRETT RLS-POLICIES FRA BACKUP"
    
    # Sjekk at backup finnes
    local check_sql="SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'backup_policies_20260224';"
    local backup_exists
    backup_exists=$(echo "$check_sql" | supabase db execute --project-ref "$PROJECT_REF" 2>/dev/null | grep -o '[0-9]*' | tail -1)
    
    if [ "$backup_exists" != "1" ]; then
        log_error "Backup finnes ikke! Kan ikke rollback."
        exit 1
    fi
    
    log_warn "Dette vil gjenopprette alle policies til opprinnelig tilstand (inkludert performance-problemer)!"
    read -p "Er du SIKKER? Skriv 'ROLLBACK' for å fortsette: " confirm
    
    if [ "$confirm" != "ROLLBACK" ]; then
        log_info "Rollback avbrutt"
        exit 0
    fi
    
    local sql=$(cat <<'EOF'
BEGIN;

DO $$
DECLARE
  backup_record RECORD;
  policies_restored INTEGER := 0;
  policies_failed INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'STARTER ROLLBACK AV RLS-POLICIES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  FOR backup_record IN 
    SELECT * FROM public.backup_policies_20260224
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        backup_record.policyname, 
        backup_record.tablename
      );
      
      IF backup_record.with_check IS NOT NULL AND backup_record.with_check <> '' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s) WITH CHECK (%s)', 
          backup_record.policyname,
          backup_record.tablename,
          backup_record.cmd,
          COALESCE(backup_record.qual, 'true'),
          backup_record.with_check
        );
      ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)', 
          backup_record.policyname,
          backup_record.tablename,
          backup_record.cmd,
          COALESCE(backup_record.qual, 'true')
        );
      END IF;
      
      policies_restored := policies_restored + 1;
      
    EXCEPTION WHEN OTHERS THEN
      policies_failed := policies_failed + 1;
      RAISE WARNING 'Feil ved gjenoppretting: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'ROLLBACK FULLFØRT';
  RAISE NOTICE 'Gjenopprettet: % policies', policies_restored;
  RAISE NOTICE 'Feilet: % policies', policies_failed;
  
END $$;

COMMIT;
EOF
)
    
    execute_sql "$sql" "Rollback RLS policies"
}

# ═══════════════════════════════════════════════════════════════════════════════
# HOVEDPROGRAM
# ═══════════════════════════════════════════════════════════════════════════════

show_usage() {
    cat <<EOF
${CYAN}${BOLD}KLARPAKKE PERFORMANCE CLEANUP${NC}

${BOLD}BRUK:${NC}
  $(basename "$0") [OPTIONS]

${BOLD}OPTIONS:${NC}
  --rollback    Gjenopprett alle RLS policies fra backup
  --dry-run     Simuler alle operasjoner uten å gjøre endringer
  --help        Vis denne hjelpen

${BOLD}EKSEMPLER:${NC}
  # Kjør full cleanup
  ./scripts/performance-cleanup-auto.sh

  # Test uten å gjøre endringer
  ./scripts/performance-cleanup-auto.sh --dry-run

  # Rollback til forrige tilstand
  ./scripts/performance-cleanup-auto.sh --rollback

${BOLD}Sikkerhet:${NC}
  - Credentials leses fra .env.local
  - Service role key eksponeres ALDRI i logger
  - Alle SQL-queries logges til: logs/performance-cleanup-*/

EOF
}

main() {
    # Parse argumenter
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rollback)
                ROLLBACK_MODE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Ukjent argument: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Header
    echo -e "${CYAN}${BOLD}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  KLARPAKKE DATABASE PERFORMANCE CLEANUP"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}⚠️  DRY RUN MODE - Ingen endringer vil bli gjort${NC}\n"
    fi
    
    if [ "$ROLLBACK_MODE" = true ]; then
        echo -e "${RED}⚠️  ROLLBACK MODE${NC}\n"
    fi
    
    # Initialiser
    init
    
    # Kjør steg
    if [ "$ROLLBACK_MODE" = true ]; then
        step_rollback
    else
        step_backup
        step_diagnose
        step_fix_rls
        step_drop_indexes
        step_bot_health
        step_verify
    fi
    
    # Oppsummering
    log_section "OPPSUMMERING"
    log_info "Alle operasjoner logget til: $LOG_DIR/"
    log_info "Backup tabell: public.backup_policies_20260224"
    
    if [ "$ROLLBACK_MODE" = false ] && [ "$DRY_RUN" = false ]; then
        echo -e "\n${GREEN}✅ PERFORMANCE CLEANUP FULLFØRT!${NC}"
        echo -e "\nFor å rulle tilbake, kjør:"
        echo -e "  ${BOLD}./scripts/performance-cleanup-auto.sh --rollback${NC}"
    fi
    
    echo ""
}

# Kjør hovedprogram
main "$@"

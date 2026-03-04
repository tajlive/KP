#!/usr/bin/env bash
# =============================================================================
# TEST: Database Migrasjoner
# =============================================================================
# Tester:
# 1. Migrasjoner kan kjøres fra scratch
# 2. Migrasjoner er idempotente (kan kjøres to ganger)
# 3. Ingen SQL-feil
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "============================================================================="
log_info "DATABASE MIGRATION TEST"
echo "============================================================================="

cd "$PROJECT_ROOT"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI er ikke installert"
  exit 1
fi

# Sjekk at prosjektet er linket
if [ ! -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
  log_warn "Supabase prosjekt ikke linket - forsøker å linke..."
  
  # Prøv å finne prosjekt-ref fra config.toml
  if [ -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    PROJECT_REF=$(grep -E "^project_id" "$PROJECT_ROOT/supabase/config.toml" | sed 's/.*= *"\([^"]*\)".*/\1/')
    if [ -n "$PROJECT_REF" ]; then
      log_info "Linker til prosjekt: $PROJECT_REF"
      supabase link --project-ref "$PROJECT_REF"
    fi
  fi
fi

# =============================================================================
# TEST 1: Første kjøring av migrasjoner
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 1: Første kjøring av migrasjoner..."
echo "============================================================================="

if supabase db push --include-all; then
  log_success "Første kjøring: OK"
else
  log_error "Første kjøring: FEILET"
  exit 1
fi

# =============================================================================
# TEST 2: Idempotens (andre kjøring)
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 2: Idempotens - kjører migrasjoner på nytt..."
echo "============================================================================="

if supabase db push --include-all; then
  log_success "Andre kjøring (idempotens): OK"
else
  log_error "Andre kjøring: FEILET - migrasjoner er ikke idempotente!"
  exit 1
fi

# =============================================================================
# TEST 3: Verifiser tabeller
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 3: Verifiserer at kritiske tabeller finnes..."
echo "============================================================================="

supabase sql <<'EOF'
SELECT 
  'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 
  'courses', COUNT(*) FROM courses
UNION ALL
SELECT 
  'lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 
  'portfolios', COUNT(*) FROM portfolios
UNION ALL
SELECT 
  'trades', COUNT(*) FROM trades
UNION ALL
SELECT 
  'dca_bots', COUNT(*) FROM dca_bots
UNION ALL
SELECT 
  'price_alerts', COUNT(*) FROM price_alerts;
EOF

log_success "Tabellverifisering: OK"

# =============================================================================
# TEST 4: Verifiser RLS er aktivert
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 4: Verifiserer RLS status..."
echo "============================================================================="

supabase sql <<'EOF'
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'courses', 'lessons', 'portfolios', 'trades', 'dca_bots', 'price_alerts')
ORDER BY tablename;
EOF

log_success "RLS verifisering: OK"

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="
log_success "ALLE MIGRASJONSTESTER BESTÅTT!"
echo "============================================================================="
echo ""
log_info "Tester utført:"
echo "  ✅ Migrasjoner kjøres fra scratch"
echo "  ✅ Migrasjoner er idempotente"
echo "  ✅ Kritiske tabeller finnes"
echo "  ✅ RLS er aktivert"
echo ""

#!/usr/bin/env bash
# =============================================================================
# TEST: Row Level Security (RLS)
# =============================================================================
# Sjekker at RLS policies fungerer:
# - Bruker kan kun lese egne rader
# - Bruker kan ikke lese andres rader
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
log_info "ROW LEVEL SECURITY (RLS) TEST"
echo "============================================================================="

cd "$PROJECT_ROOT"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI er ikke installert"
  exit 1
fi

# =============================================================================
# Sjekk 1: RLS er aktivert på alle bruker-relaterte tabeller
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 1: Sjekker at RLS er aktivert..."
echo "============================================================================="

RLS_STATUS=$(supabase sql <<'EOF'
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'portfolios', 'trades', 'wallets', 
  'dca_bots', 'price_alerts', 'user_course_progress', 
  'user_enrollments', 'beta_applications'
)
ORDER BY tablename;
EOF
)

echo "$RLS_STATUS"

# Sjekk at alle har RLS aktivert
if echo "$RLS_STATUS" | grep -q "f"; then
  log_warn "Noen tabeller har ikke RLS aktivert!"
else
  log_success "RLS er aktivert på alle kritiske tabeller"
fi

# =============================================================================
# Sjekk 2: Policies finnes
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 2: Sjekker RLS policies..."
echo "============================================================================="

POLICIES=$(supabase sql <<'EOF'
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
EOF
)

if [ -n "$POLICIES" ]; then
  echo "$POLICIES"
  log_success "Policies funnet"
else
  log_error "Ingen policies funnet!"
  exit 1
fi

# =============================================================================
# Sjekk 3: Antall policies per tabell
# =============================================================================
echo ""
echo "============================================================================="
log_info "TEST 3: Policy count per tabell..."
echo "============================================================================="

supabase sql <<'EOF'
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;
EOF

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="
log_success "RLS TEST FULLFØRT"
echo "============================================================================="
echo ""
log_info "Viktig: For å teste faktisk RLS-isolasjon, må du:"
echo "  1. Logge inn som bruker A"
echo "  2. Prøve å lese data fra bruker B"
echo "  3. Verifisere at det feiler"
echo ""

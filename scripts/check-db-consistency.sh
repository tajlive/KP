#!/usr/bin/env bash
# =============================================================================
# CHECK: Database Consistency
# =============================================================================
# Sjekker for:
# - Orphaned rows (foreign keys som peker på non-existent rows)
# - NULL i kolonner som burde være NOT NULL
# - Duplikater i kolonner som burde være UNIQUE
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

ERRORS=0

echo "============================================================================="
log_info "DATABASE CONSISTENCY CHECK"
echo "============================================================================="

cd "$PROJECT_ROOT"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI er ikke installert"
  exit 1
fi

# =============================================================================
# Sjekk 1: Orphaned rows i lessons (course_id)
# =============================================================================
echo ""
log_info "Sjekker orphaned lessons..."

ORPHANED_LESSONS=$(supabase sql <<'EOF' 2>/dev/null | tail -1
SELECT COUNT(*) FROM lessons l
LEFT JOIN courses c ON l.course_id = c.id
WHERE c.id IS NULL;
EOF
)

if [ "${ORPHANED_LESSONS:-0}" -eq 0 ]; then
  log_success "Ingen orphaned lessons"
else
  log_error "Fant $ORPHANED_LESSONS orphaned lessons!"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Sjekk 2: Orphaned rows i portfolios (user_id)
# =============================================================================
echo ""
log_info "Sjekker orphaned portfolios..."

ORPHANED_PORTFOLIOS=$(supabase sql <<'EOF' 2>/dev/null | tail -1
SELECT COUNT(*) FROM portfolios p
LEFT JOIN profiles prof ON p.user_id = prof.id
WHERE prof.id IS NULL;
EOF
)

if [ "${ORPHANED_PORTFOLIOS:-0}" -eq 0 ]; then
  log_success "Ingen orphaned portfolios"
else
  log_error "Fant $ORPHANED_PORTFOLIOS orphaned portfolios!"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Sjekk 3: Duplikater i courses.slug
# =============================================================================
echo ""
log_info "Sjekker duplikater i courses.slug..."

DUPLICATE_SLUGS=$(supabase sql <<'EOF' 2>/dev/null | tail -1
SELECT COUNT(*) FROM (
  SELECT slug FROM courses
  GROUP BY slug
  HAVING COUNT(*) > 1
) AS dups;
EOF
)

if [ "${DUPLICATE_SLUGS:-0}" -eq 0 ]; then
  log_success "Ingen duplikater i courses.slug"
else
  log_error "Fant $DUPLICATE_SLUGS duplikater i courses.slug!"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Sjekk 4: Duplikater i lessons (course_id, slug)
# =============================================================================
echo ""
log_info "Sjekker duplikater i lessons (course_id, slug)..."

DUPLICATE_LESSONS=$(supabase sql <<'EOF' 2>/dev/null | tail -1
SELECT COUNT(*) FROM (
  SELECT course_id, slug FROM lessons
  GROUP BY course_id, slug
  HAVING COUNT(*) > 1
) AS dups;
EOF
)

if [ "${DUPLICATE_LESSONS:-0}" -eq 0 ]; then
  log_success "Ingen duplikater i lessons"
else
  log_error "Fant $DUPLICATE_LESSONS duplikater i lessons!"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Sjekk 5: NULL i NOT NULL kolonner
# =============================================================================
echo ""
log_info "Sjekker NULL i kritiske kolonner..."

# Sjekk profiles.email
NULL_EMAILS=$(supabase sql <<'EOF' 2>/dev/null | tail -1
SELECT COUNT(*) FROM profiles WHERE email IS NULL;
EOF
)

if [ "${NULL_EMAILS:-0}" -eq 0 ]; then
  log_success "Ingen NULL i profiles.email"
else
  log_error "Fant $NULL_EMAILS NULL i profiles.email!"
  ERRORS=$((ERRORS + 1))
fi

# =============================================================================
# Sjekk 6: Verifiser foreign key constraints
# =============================================================================
echo ""
log_info "Sjekker foreign key constraints..."

supabase sql <<'EOF' 2>/dev/null
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;
EOF

log_success "Foreign key constraints funnet"

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="

if [ $ERRORS -eq 0 ]; then
  log_success "ALLE KONSISTENSSJEKKER BESTÅTT!"
  echo "============================================================================="
  exit 0
else
  log_error "FANT $ERRORS KONSISTENSFEIL!"
  echo "============================================================================="
  exit 1
fi

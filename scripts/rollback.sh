#!/usr/bin/env bash
# =============================================================================
# ROLLBACK: Database Rollback
# =============================================================================
# Ruller tilbake migrasjoner til en spesifikk versjon.
# BRUK MED FORSIKTIGHET - kan føre til tap av data!
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

# Hent target migrasjon fra argument
TARGET_MIGRATION="${1:-}"

if [ -z "$TARGET_MIGRATION" ]; then
  echo "============================================================================="
  log_error "Mangler target migrasjon!"
  echo "============================================================================="
  echo ""
  log_info "Bruk: $0 <migration_timestamp>"
  echo ""
  log_info "Eksempler:"
  echo "  $0 20260201000000"
  echo ""
  log_info "Tilgjengelige migrasjoner:"
  ls -1 "$PROJECT_ROOT/supabase/migrations/"*.sql | tail -10
  echo ""
  exit 1
fi

echo "============================================================================="
log_warn "DATABASE ROLLBACK - BRUK MED FORSIKTIGHET!"
echo "============================================================================="
echo ""
log_warn "Dette vil rulle tilbake til migrasjon: $TARGET_MIGRATION"
log_warn "Alle nyere migrasjoner vil bli markert som 'reverted'"
echo ""

# Bekreftelse
read -p "Er du sikker? Skriv 'ROLLBACK' for å fortsette: " CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
  log_info "Avbrutt av bruker"
  exit 0
fi

cd "$PROJECT_ROOT"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI er ikke installert"
  exit 1
fi

# =============================================================================
# Lager backup først
# =============================================================================
echo ""
log_info "Lager backup før rollback..."
bash "$SCRIPT_DIR/backup-db.sh" || {
  log_error "Backup feilet! Avbryter rollback."
  exit 1
}

# =============================================================================
# Hent liste over migrasjoner som skal reverteres
# =============================================================================
echo ""
log_info "Henter migrasjonsliste..."

# Reverter alle migrasjoner nyere enn target
echo ""
log_info "Reverterer migrasjoner nyere enn $TARGET_MIGRATION..."

# Bruk supabase migration repair for å markere som reverted
for migration in $(ls -1 "$PROJECT_ROOT/supabase/migrations/"*.sql | sort -r); do
  migration_name=$(basename "$migration" .sql)
  
  # Stopp når vi når target
  if [[ "$migration_name" == "$TARGET_MIGRATION"* ]]; then
    log_success "Nådde target migrasjon: $migration_name"
    break
  fi
  
  log_info "Reverterer: $migration_name"
  supabase migration repair --status reverted "$migration_name" || {
    log_warn "Kunne ikke revertere $migration_name (kan være OK)"
  }
done

# =============================================================================
# Verifiser status
# =============================================================================
echo ""
log_info "Verifiserer migrasjonsstatus..."
supabase migration list

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="
log_warn "ROLLBACK FULLFØRT!"
echo "============================================================================="
echo ""
log_warn "VIKTIG:"
echo "  1. Sjekk at applikasjonen fungerer korrekt"
echo "  2. Kjør tester for å verifisere funksjonalitet"
echo "  3. Hvis noe er galt, vurder å gjenopprette fra backup"
echo ""
log_info "For å gjenopprette fra backup:"
echo "  bash scripts/backup-db.sh"
echo ""

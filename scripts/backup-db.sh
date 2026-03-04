#!/usr/bin/env bash
# =============================================================================
# BACKUP: Database Backup
# =============================================================================
# Lager backup av databasen og lagrer lokalt.
# Kan utvides til å laste opp til S3/Cloudflare R2.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"

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

# Dato for filnavn
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/klarpakke_backup_$DATE.sql"

echo "============================================================================="
log_info "DATABASE BACKUP"
echo "============================================================================="

cd "$PROJECT_ROOT"

# Sjekk at Supabase CLI er installert
if ! command -v supabase &> /dev/null; then
  log_error "Supabase CLI er ikke installert"
  exit 1
fi

# Opprett backup directory
mkdir -p "$BACKUP_DIR"

# =============================================================================
# Lager backup
# =============================================================================
echo ""
log_info "Lager backup: $BACKUP_FILE"

if supabase db dump > "$BACKUP_FILE"; then
  log_success "Backup opprettet: $BACKUP_FILE"
else
  log_error "Backup feilet!"
  exit 1
fi

# Komprimer backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"
log_success "Backup komprimert: $BACKUP_FILE"

# Vis filstørrelse
ls -lh "$BACKUP_FILE"

# =============================================================================
# Rens gamle backups ( behold siste 10)
# =============================================================================
echo ""
log_info "Renser gamle backups (beholder siste 10)..."

ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +11 | xargs -r rm -v

log_success "Cleanup fullført"

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="
log_success "BACKUP FULLFØRT!"
echo "============================================================================="
echo ""
log_info "Backup lokasjon: $BACKUP_FILE"
echo ""
log_info "For å gjenopprette:"
echo "  gunzip $BACKUP_FILE"
echo "  supabase db restore < ${BACKUP_FILE%.gz}"
echo ""

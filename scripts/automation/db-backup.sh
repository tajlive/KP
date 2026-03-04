#!/bin/bash
# Database Backup Automatisering
# Kjør: bash scripts/automation/db-backup.sh

set -e

PROJECT_REF="vuxbjlykgmzskxbclquf"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/klarpakke_${TIMESTAMP}.sql"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}💾 Database Backup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p "$BACKUP_DIR"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Hent database connection string
log_info "Henter database connection info..."

# Bruk Supabase CLI for backup
log_info "Kjører backup..."

if supabase db dump --data-only --file "$BACKUP_FILE" 2>/dev/null; then
    log_success "Backup fullført: $BACKUP_FILE"
    
    # Komprimer backup
    gzip "$BACKUP_FILE"
    log_success "Backup komprimert: ${BACKUP_FILE}.gz"
    
    # Slett gamle backups (behold siste 10)
    ls -t ${BACKUP_DIR}/klarpakke_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f
    log_info "Gamle backups ryddet opp (beholder siste 10)"
    
else
    log_warning "Kunne ikke kjøre backup via CLI"
    echo "Alternativ: Bruk Supabase Dashboard > Database > Backups"
fi

echo ""
echo "Backups i: $BACKUP_DIR/"
ls -lh ${BACKUP_DIR}/*.gz 2>/dev/null | tail -5 || echo "Ingen backups funnet"

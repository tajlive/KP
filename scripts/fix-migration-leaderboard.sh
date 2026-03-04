#!/usr/bin/env bash
# =============================================================================
# FIX: paper_trading_leaderboard migrasjon
# =============================================================================
# Dette scriptet sikrer at leaderboard-viewet er korrekt og idempotent.
# Det:
# 1. Verifiserer at SQL er idempotent
# 2. Sikrer at view bruker riktig JOIN (via paper_accounts)
# 3. Kjrer supabase db push
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_ROOT/supabase/migrations/20260209000002_uke2_core_features.sql"

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
log_info "FIX: paper_trading_leaderboard migrasjon"
echo "============================================================================="

# Sjekk at migrasjonsfil finnes
if [ ! -f "$MIGRATION_FILE" ]; then
  log_error "Fant ikke $MIGRATION_FILE"
  exit 1
fi

log_info "Sjekker migrasjonsfil: $MIGRATION_FILE"

# =============================================================================
# Sjekk 1: Verifiser at leaderboard-view er idempotent
# =============================================================================
if ! grep -q "CREATE MATERIALIZED VIEW IF NOT EXISTS paper_trading_leaderboard" "$MIGRATION_FILE"; then
  log_warn "Leaderboard-view mangler IF NOT EXISTS - legger til..."
  
  # Backup original
  cp "$MIGRATION_FILE" "$MIGRATION_FILE.backup"
  
  # Erstatt CREATE MATERIALIZED VIEW med IF NOT EXISTS versjon
  sed -i.bak 's/CREATE MATERIALIZED VIEW paper_trading_leaderboard/CREATE MATERIALIZED VIEW IF NOT EXISTS paper_trading_leaderboard/g' "$MIGRATION_FILE"
  rm -f "$MIGRATION_FILE.bak"
  
  log_success "Leaderboard-view nå idempotent"
fi

# =============================================================================
# Sjekk 2: Verifiser at CREATE INDEX bruker IF NOT EXISTS
# =============================================================================
if grep -q "CREATE INDEX idx_paper_trading_leaderboard_profit" "$MIGRATION_FILE" && \
   ! grep -q "CREATE INDEX IF NOT EXISTS idx_paper_trading_leaderboard_profit" "$MIGRATION_FILE"; then
  log_warn "Index uten IF NOT EXISTS funnet - fikser..."
  
  sed -i.bak 's/CREATE INDEX idx_paper_trading_leaderboard_profit/CREATE INDEX IF NOT EXISTS idx_paper_trading_leaderboard_profit/g' "$MIGRATION_FILE"
  rm -f "$MIGRATION_FILE.bak"
  
  log_success "Index nå idempotent"
fi

# =============================================================================
# Sjekk 3: Verifiser JOIN-struktur (ikke referer pt.user_id eller pt.status)
# =============================================================================
log_info "Verifiserer JOIN-struktur..."

# Sjekk at vi ikke har pt.user_id (feil fra tidligere)
if grep -q "pt.user_id" "$MIGRATION_FILE"; then
  log_error "FEIL: Migrasjonen inneholder pt.user_id som ikke finnes i paper_trades!"
  log_info "Fikser ved å fjerne pt.user_id referanse..."
  
  sed -i.bak 's/AND pt.user_id = p.id//g' "$MIGRATION_FILE"
  rm -f "$MIGRATION_FILE.bak"
  
  log_success "pt.user_id referanse fjernet"
fi

# Sjekk at vi ikke har pt.status filter (kan gi problemer)
if grep -q "pt.status" "$MIGRATION_FILE"; then
  log_warn "Migrasjonen inneholder pt.status filter - fjerner for kompatibilitet..."
  
  # Fjern pt.status = 'executed' filter
  sed -i.bak "s/AND pt.status = 'executed'//g" "$MIGRATION_FILE"
  sed -i.bak "s/AND pt.status = 'completed'//g" "$MIGRATION_FILE"
  sed -i.bak 's/AND pt.status = .executed.//g' "$MIGRATION_FILE"
  rm -f "$MIGRATION_FILE.bak"
  
  log_success "pt.status filter fjernet"
fi

# Verifiser at JOIN går via paper_accounts (riktig)
if ! grep -q "LEFT JOIN paper_accounts pa" "$MIGRATION_FILE"; then
  log_warn "Mangler paper_accounts JOIN - dette kan være et problem"
else
  log_success "paper_accounts JOIN funnet"
fi

# =============================================================================
# Sjekk 4: Sikre at refresh_leaderboard funksjonen er idempotent
# =============================================================================
if ! grep -q "CREATE OR REPLACE FUNCTION refresh_leaderboard" "$MIGRATION_FILE"; then
  if grep -q "CREATE FUNCTION refresh_leaderboard" "$MIGRATION_FILE"; then
    log_warn "refresh_leaderboard bruker CREATE FUNCTION - bør være CREATE OR REPLACE"
    
    sed -i.bak 's/CREATE FUNCTION refresh_leaderboard/CREATE OR REPLACE FUNCTION refresh_leaderboard/g' "$MIGRATION_FILE"
    rm -f "$MIGRATION_FILE.bak"
    
    log_success "refresh_leaderboard nå idempotent"
  fi
fi

# =============================================================================
# Sjekk 5: Sikre at triggers er idempotente
# =============================================================================
if ! grep -q "CREATE OR REPLACE FUNCTION update_updated_at_column" "$MIGRATION_FILE"; then
  if grep -q "CREATE FUNCTION update_updated_at_column" "$MIGRATION_FILE"; then
    log_warn "update_updated_at_column bruker CREATE FUNCTION - fikser..."
    
    sed -i.bak 's/CREATE FUNCTION update_updated_at_column/CREATE OR REPLACE FUNCTION update_updated_at_column/g' "$MIGRATION_FILE"
    rm -f "$MIGRATION_FILE.bak"
    
    log_success "update_updated_at_column nå idempotent"
  fi
fi

# =============================================================================
# Step 6: Kjør db push
# =============================================================================
echo ""
log_info "Kjører supabase db push..."

cd "$PROJECT_ROOT"
supabase db push || {
  log_error "supabase db push feilet"
  log_info "Sjekk migrasjonsstatus med: supabase migration list"
  exit 1
}

log_success "Migration push fullført"

# =============================================================================
# Oppsummering
# =============================================================================
echo ""
echo "============================================================================="
log_success "Leaderboard migrasjon verifisert og pushet!"
echo "============================================================================="

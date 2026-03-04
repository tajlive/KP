#!/bin/bash
# =============================================================================
# KLARPAKKE: Ultimate SQL Executor
# Bruker DATABASE_URL direkte fra .env.production
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║           ⚡ ULTIMATE SUPABASE SQL EXECUTOR ⚡                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC}  $1"; }

# ============================================================================
# Hent DATABASE_URL fra .env.production
# ============================================================================
get_database_url() {
    local env_file="$PROJECT_ROOT/.env.production"
    
    if [ ! -f "$env_file" ]; then
        log_error ".env.production ikke funnet!"
        return 1
    fi
    
    # Ekstraher DATABASE_URL (fjerner quotes, \n og trailing whitespace)
    local db_url=$(grep "^DATABASE_URL=" "$env_file" | cut -d'=' -f2- | sed 's/["'\''"]*//g' | sed 's/\\n//g' | sed 's/[[:space:]]*$//')
    
    if [ -z "$db_url" ]; then
        log_error "DATABASE_URL ikke funnet i .env.production"
        return 1
    fi
    
    echo "$db_url"
}

# ============================================================================
# Kjør SQL via psql
# ============================================================================
execute_sql() {
    local sql_file="$1"
    local db_url="$2"
    
    log_info "Kobler til Supabase PostgreSQL..."
    
    # Kjør SQL
    if psql "$db_url" -f "$sql_file" 2>&1; then
        log_success "SQL kjørt vellykket!"
        return 0
    else
        log_error "SQL-kjøring feilet"
        return 1
    fi
}

# ============================================================================
# Hovedprogram
# ============================================================================
main() {
    show_banner
    
    # Sjekk argument
    if [ $# -lt 1 ]; then
        echo "Bruk: $0 <sql-fil>"
        echo ""
        echo "Eksempel:"
        echo "  $0 setup-supabase-cron.sql"
        echo "  $0 /tmp/klarpakke-cron-ready.sql"
        exit 1
    fi
    
    local sql_file="$1"
    
    # Sjekk at filen finnes
    if [ ! -f "$sql_file" ]; then
        # Prøv relativt fra script directory
        if [ -f "$SCRIPT_DIR/$sql_file" ]; then
            sql_file="$SCRIPT_DIR/$sql_file"
        else
            log_error "SQL-fil ikke funnet: $sql_file"
            exit 1
        fi
    fi
    
    log_info "SQL-fil: $(basename "$sql_file")"
    
    # Hent database URL
    log_info "Henter DATABASE_URL fra .env.production..."
    DB_URL=$(get_database_url)
    
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Masker passord for logging
    local masked_url=$(echo "$DB_URL" | sed 's/:[^:@]*@/@/')
    log_info "Database: $masked_url"
    
    # Sjekk at psql er installert
    if ! command -v psql &> /dev/null; then
        log_error "psql er ikke installert!"
        echo ""
        echo "Installer:"
        echo "  macOS:  brew install libpq"
        echo "  Ubuntu: sudo apt-get install postgresql-client"
        exit 1
    fi
    
    echo ""
    log_info "Kjører SQL..."
    echo ""
    
    # Kjør SQL
    if execute_sql "$sql_file" "$DB_URL"; then
        echo ""
        echo -e "${GREEN}"
        echo "╔══════════════════════════════════════════════════════════════════╗"
        echo "║                    🎉 SUCCESS! 🎉                                ║"
        echo "╠══════════════════════════════════════════════════════════════════╣"
        echo "║  SQL er kjørt i Supabase!                                        ║"
        echo "╚══════════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}"
        echo "╔══════════════════════════════════════════════════════════════════╗"
        echo "║                    ❌ FAILED ❌                                  ║"
        echo "╚══════════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        exit 1
    fi
}

main "$@"

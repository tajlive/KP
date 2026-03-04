#!/bin/bash
# ============================================================================
# Supabase SQL Deploy via PSQL (Direkte PostgreSQL connection)
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_REF:-vuxbjlykgmzskxbclquf}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    log_error "SUPABASE_DB_PASSWORD is not set!"
    echo ""
    echo "Get your database password from:"
    echo "https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
    echo ""
    echo "Then run: export SUPABASE_DB_PASSWORD=your_password"
    exit 1
fi

# Connection string
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Function to deploy SQL file
deploy_file() {
    local file=$1
    local filename=$(basename "$file")
    
    log_info "Deploying: $filename"
    
    if PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -f "$file" 2>&1; then
        log_success "$filename - DEPLOYED"
        return 0
    else
        log_error "$filename - FAILED"
        return 1
    fi
}

# Main
echo "═══════════════════════════════════════════════════════════════"
echo "           🗄️  SUPABASE SQL DEPLOY (PSQL)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    log_error "psql is not installed!"
    echo ""
    echo "Install PostgreSQL client:"
    echo "  macOS:   brew install libpq"
    echo "  Ubuntu:  sudo apt-get install postgresql-client"
    echo "  Windows: https://www.postgresql.org/download/windows/"
    exit 1
fi

# Test connection
log_info "Testing database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to database!"
    echo ""
    echo "Check:"
    echo "  1. Password is correct"
    echo "  2. Project ref is correct: $PROJECT_REF"
    echo "  3. Database is not paused"
    exit 1
fi

log_success "Database connection OK"
echo ""

# Deploy files
if [ -n "$1" ]; then
    # Specific file
    if [ -f "$1" ]; then
        deploy_file "$1"
    else
        log_error "File not found: $1"
        exit 1
    fi
else
    # All migrations
    MIGRATIONS_DIR="supabase/migrations"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi
    
    # Get list of SQL files
    files=($(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))
    
    if [ ${#files[@]} -eq 0 ]; then
        log_warning "No migration files found"
        exit 0
    fi
    
    log_info "Found ${#files[@]} migration files"
    echo ""
    
    success=0
    failed=0
    
    for file in "${files[@]}"; do
        if deploy_file "$file"; then
            ((success++))
        else
            ((failed++))
        fi
        echo ""
    done
    
    echo "═══════════════════════════════════════════════════════════════"
    echo "                      📊 SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"
    log_success "Deployed: $success"
    [ $failed -gt 0 ] && log_error "Failed: $failed"
    echo "═══════════════════════════════════════════════════════════════"
    
    [ $failed -eq 0 ] || exit 1
fi

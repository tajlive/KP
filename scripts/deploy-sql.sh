#!/bin/bash
# ============================================================================
# Auto-deploy SQL migrations to Supabase
# Usage: ./scripts/deploy-sql.sh [migration_file]
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_REF="${SUPABASE_PROJECT_REF:-vuxbjlykgmzskxbclquf}"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    log_error "SUPABASE_ACCESS_TOKEN is not set!"
    echo "Get your token from: https://supabase.com/dashboard/account/tokens"
    echo "Then run: export SUPABASE_ACCESS_TOKEN=your_token"
    exit 1
fi

# Function to run SQL via Supabase API
run_sql() {
    local sql_file=$1
    log_info "Executing: $sql_file"
    
    # Read SQL content
    sql_content=$(cat "$sql_file")
    
    # Execute via Supabase Management API
    response=$(curl -s -X POST \
        "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
        -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}" 2>&1)
    
    if echo "$response" | grep -q "error"; then
        log_error "Failed to execute SQL"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 1
    fi
    
    log_success "SQL executed successfully"
    return 0
}

# Main execution
main() {
    echo "═══════════════════════════════════════════════════════════════"
    echo "           🗄️  SUPABASE SQL AUTO-DEPLOY"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Check if specific file provided
    if [ -n "$1" ]; then
        if [ -f "$1" ]; then
            run_sql "$1"
        else
            log_error "File not found: $1"
            exit 1
        fi
    else
        # Deploy all pending migrations
        log_info "Deploying all migrations from supabase/migrations/"
        
        for file in supabase/migrations/*.sql; do
            if [ -f "$file" ]; then
                echo ""
                log_info "Processing: $(basename $file)"
                
                # Show first 5 lines
                echo "   Preview:"
                head -5 "$file" | sed 's/^/     /'
                echo ""
                
                read -p "   Deploy this migration? (Y/n): " confirm
                if [[ $confirm =~ ^[Yy]$ ]] || [ -z "$confirm" ]; then
                    run_sql "$file"
                else
                    log_warning "Skipped: $(basename $file)"
                fi
            fi
        done
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    log_success "Deploy complete!"
    echo "═══════════════════════════════════════════════════════════════"
}

main "$@"

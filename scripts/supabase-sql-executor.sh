#!/bin/bash
# =============================================================================
# KLARPAKKE: Automated Supabase SQL Executor
# Kjører SQL automatisk uten manuell kopiering!
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_REF="vuxbjlykgmzskxbclquf"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║      🤖 SUPABASE SQL EXECUTOR - FULL AUTOMATION 🤖            ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC}  $1"; }

# ============================================================================
# METODE 1: Direkte via Database Connection (psql)
# ============================================================================
execute_via_psql() {
    log_info "Prøver kjøring via PostgreSQL direkte..."
    
    # Sjekk om psql er installert
    if ! command -v psql &> /dev/null; then
        log_warn "psql ikke installert. Hopper over..."
        return 1
    fi
    
    # Hent database password
    local db_password="${SUPABASE_DB_PASSWORD:-${DB_PASSWORD:-}}"
    if [ -z "$db_password" ]; then
        log_warn "DB_PASSWORD ikke satt. Prøv å hente fra .env..."
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            db_password=$(grep -E "^(SUPABASE_DB_PASSWORD|DB_PASSWORD)=" "$PROJECT_ROOT/.env.local" | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        fi
    fi
    
    if [ -z "$db_password" ]; then
        log_warn "Ingen DB password funnet. Hopper over psql-metoden."
        return 1
    fi
    
    # Bygg connection string
    local db_host="db.${PROJECT_REF}.supabase.co"
    local db_url="postgresql://postgres:${db_password}@${db_host}:5432/postgres?sslmode=require"
    
    log_info "Kobler til PostgreSQL..."
    
    if PGPASSWORD="$db_password" psql "$db_url" -f "$1" 2>&1; then
        log_success "SQL kjørt via PostgreSQL!"
        return 0
    else
        log_error "PostgreSQL-kjøring feilet"
        return 1
    fi
}

# ============================================================================
# METODE 2: Via Supabase CLI (krever linking)
# ============================================================================
execute_via_cli() {
    log_info "Prøver kjøring via Supabase CLI..."
    
    if ! command -v supabase &> /dev/null; then
        log_warn "Supabase CLI ikke funnet. Hopper over..."
        return 1
    fi
    
    # Sjekk om vi er logget inn
    if ! supabase projects list &>/dev/null 2>&1; then
        log_warn "Ikke logget inn i Supabase CLI"
        log_info "Kjør: supabase login"
        return 1
    fi
    
    # Sjekk om prosjektet er linket
    if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
        log_info "Linker prosjekt..."
        cd "$PROJECT_ROOT" && supabase link --project-ref "$PROJECT_REF" || {
            log_error "Kunne ikke linke prosjekt"
            return 1
        }
    fi
    
    # Kjør SQL via CLI
    log_info "Kjører SQL via Supabase CLI..."
    if cd "$PROJECT_ROOT" && supabase db execute --file "$1" 2>&1; then
        log_success "SQL kjørt via Supabase CLI!"
        return 0
    else
        log_error "CLI-kjøring feilet"
        return 1
    fi
}

# ============================================================================
# METODE 3: Via Management API (REST)
# ============================================================================
execute_via_api() {
    log_info "Prøver kjøring via Supabase Management API..."
    
    local access_token="${SUPABASE_ACCESS_TOKEN:-}"
    
    if [ -z "$access_token" ]; then
        # Prøv å hente fra .env
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            access_token=$(grep "SUPABASE_ACCESS_TOKEN=" "$PROJECT_ROOT/.env.local" | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        fi
    fi
    
    if [ -z "$access_token" ]; then
        log_warn "SUPABASE_ACCESS_TOKEN ikke funnet"
        log_info "Generer token på: https://supabase.com/dashboard/account/tokens"
        return 1
    fi
    
    # Les SQL-fil og escape for JSON
    local sql_content
    sql_content=$(cat "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g; s/$/\\n/' | tr -d '\n')
    
    # Bygg JSON payload
    local json_payload="{\"query\":\"${sql_content}\"}"
    
    log_info "Sender SQL via Management API..."
    
    local response
    response=$(curl -s -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Content-Type: application/json" \
        -d "$json_payload" 2>&1) || {
        log_error "API-kall feilet"
        return 1
    }
    
    # Sjekk respons
    if echo "$response" | grep -q '"error"'; then
        log_error "API returnerte feil:"
        echo "$response"
        return 1
    fi
    
    log_success "SQL kjørt via Management API!"
    echo "$response" | head -20
    return 0
}

# ============================================================================
# METODE 4: Via pg_net (Edge Function approach)
# ============================================================================
execute_via_edge_function() {
    log_info "Prøver kjøring via Edge Function..."
    
    # Dette krever at vi har en Edge Function som kan kjøre SQL
    # Dette er en avansert metode som krever deployment først
    log_warn "Edge Function-metoden krever forhåndsoppsett"
    log_info "Se: scripts/deploy-sql-executor-function.sh"
    return 1
}

# ============================================================================
# METODE 5: Via Service Role Key + pg (Node.js/Python script)
# ============================================================================
execute_via_service_role() {
    log_info "Prøver kjøring via Service Role + pg..."
    
    local service_key="${SUPABASE_SERVICE_ROLE_KEY:-}"
    
    if [ -z "$service_key" ]; then
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            service_key=$(grep "SUPABASE_SERVICE_ROLE_KEY=" "$PROJECT_ROOT/.env.local" | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        fi
    fi
    
    if [ -z "$service_key" ]; then
        log_warn "SUPABASE_SERVICE_ROLE_KEY ikke funnet"
        return 1
    fi
    
    # Sjekk om vi har Node.js script
    if [ -f "$SCRIPT_DIR/execute-sql-node.mjs" ]; then
        log_info "Kjører via Node.js..."
        if node "$SCRIPT_DIR/execute-sql-node.mjs" "$1" "$service_key" 2>&1; then
            log_success "SQL kjørt via Node.js!"
            return 0
        fi
    fi
    
    # Sjekk om vi har Python script
    if [ -f "$SCRIPT_DIR/execute-sql-python.py" ]; then
        log_info "Kjører via Python..."
        if python3 "$SCRIPT_DIR/execute-sql-python.py" "$1" "$service_key" 2>&1; then
            log_success "SQL kjørt via Python!"
            return 0
        fi
    fi
    
    return 1
}

# ============================================================================
# HOVEDFUNKSJON
# ============================================================================
main() {
    show_banner
    
    # Sjekk argumenter
    if [ $# -lt 1 ]; then
        echo "Bruk: $0 <sql-fil> [--method <metode>]"
        echo ""
        echo "Tilgjengelige metoder:"
        echo "  psql          - Direkte PostgreSQL connection"
        echo "  cli           - Supabase CLI"
        echo "  api           - Supabase Management API"
        echo "  service-role  - Via service role key"
        echo "  auto          - Prøv alle metoder (default)"
        echo ""
        echo "Eksempel:"
        echo "  $0 setup-supabase-cron.sql"
        echo "  $0 setup-supabase-cron.sql --method psql"
        exit 1
    fi
    
    local sql_file="$1"
    local method="${2:-auto}"
    
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
    log_info "Metode: $method"
    echo ""
    
    # Velg metode
    case "$method" in
        psql)
            execute_via_psql "$sql_file"
            ;;
        cli)
            execute_via_cli "$sql_file"
            ;;
        api)
            execute_via_api "$sql_file"
            ;;
        service-role)
            execute_via_service_role "$sql_file"
            ;;
        auto|*)
            # Prøv alle metoder i rekkefølge
            log_info "Prøver automatisk alle metoder..."
            
            if execute_via_psql "$sql_file"; then
                exit 0
            fi
            
            echo ""
            if execute_via_cli "$sql_file"; then
                exit 0
            fi
            
            echo ""
            if execute_via_service_role "$sql_file"; then
                exit 0
            fi
            
            echo ""
            if execute_via_api "$sql_file"; then
                exit 0
            fi
            
            echo ""
            log_error "Alle automatiske metoder feilet!"
            echo ""
            echo "═══════════════════════════════════════════════════════════════"
            echo "  MANUELL FALLBACK:"
            echo "═══════════════════════════════════════════════════════════════"
            echo ""
            echo "1. Gå til: https://supabase.com/dashboard/project/${PROJECT_REF}"
            echo "2. Klikk: SQL Editor → + New query"
            echo "3. Kopier innholdet fra: $sql_file"
            echo "4. Klikk: Run (Ctrl+Enter)"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"

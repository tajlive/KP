#!/bin/bash
# MCP Master Control Script
# Hovedstyring for alle MCP-verktøy
# Bruk: ./mcp.sh [kategori] [handling] [args...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MCP_DIR="$PROJECT_DIR/klarpakke-mcp-server"
ENV_FILE="$MCP_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# HJELPERE
# ============================================

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Last env vars
load_env() {
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    else
        log_error "MCP .env ikke funnet: $ENV_FILE"
        exit 1
    fi
}

# Sjekk om vi har nødvendige tokens
check_mcp_ready() {
    local missing=()
    
    [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && missing+=("SUPABASE_SERVICE_ROLE_KEY")
    [ -z "${VERCEL_TOKEN:-}" ] && missing+=("VERCEL_TOKEN")
    [ -z "${GITHUB_PAT:-}" ] && missing+=("GITHUB_PAT")
    
    if [ ${#missing[@]} -eq 0 ]; then
        return 0
    else
        log_error "Mangler MCP tokens:"
        for item in "${missing[@]}"; do
            echo "  - $item"
        done
        echo ""
        echo "Sett de i: $ENV_FILE"
        return 1
    fi
}

# ============================================
# KATEGORIER
# ============================================

cmd_database() {
    load_env
    local action="${2:-help}"
    
    case "$action" in
        "check"|"test")
            log_info "Tester database-tilkobling..."
            if psql "${DATABASE_URL:-postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.vuxbjlykgmzskxbclquf.supabase.co:5432/postgres}" -c "SELECT 1;" > /dev/null 2>&1; then
                log_success "Database-tilkobling OK"
            else
                log_error "Database-tilkobling feilet"
                exit 1
            fi
            ;;
        "query"|"q")
            load_env
            local query="${3:-}"
            [ -z "$query" ] && { log_error "Mangler query. Bruk: mcp database query 'SELECT...'"; exit 1; }
            psql "${DATABASE_URL:-postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.vuxbjlykgmzskxbclquf.supabase.co:5432/postgres}" -c "$query"
            ;;
        "tables")
            load_env
            psql "${DATABASE_URL:-postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.vuxbjlykgmzskxbclquf.supabase.co:5432/postgres}" -c "\dt"
            ;;
        "migrate")
            log_info "Kjører database migrasjoner..."
            for file in "$PROJECT_DIR"/supabase/migrations/*.sql; do
                [ -f "$file" ] || continue
                log_info "Kjører: $(basename "$file")"
                psql "${DATABASE_URL:-postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.vuxbjlykgmzskxbclquf.supabase.co:5432/postgres}" -f "$file" || log_warning "Migrasjon kan ha feilet (kanskje allerede kjørt)"
            done
            log_success "Migrasjoner fullført"
            ;;
        *)
            cat << 'EOF'
Database kommandoer:
  mcp database check          Test tilkobling
  mcp database query "SQL"    Kjør SQL query
  mcp database tables         List alle tabeller
  mcp database migrate        Kjør alle migrasjoner
EOF
            ;;
    esac
}

cmd_deploy() {
    load_env
    local action="${2:-status}"
    
    case "$action" in
        "status")
            log_info "Sjekker Vercel deploy status..."
            curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
                "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID:-prj_TIvFmpMttYsHLC4eFkxxCEoILLEY}" | \
                jq -r '.deployments[0] | "Status: \(.state) | URL: \(.url)"'
            ;;
        "trigger")
            log_info "Trigger GitHub Actions deploy..."
            curl -X POST \
                -H "Authorization: token $GITHUB_PAT" \
                -H "Accept: application/vnd.github.v3+json" \
                "https://api.github.com/repos/${GITHUB_OWNER:-tomarnejensen}/${GITHUB_REPO_NAME:-klarpakke}/actions/workflows/deploy-with-migrations.yml/dispatches" \
                -d '{"ref":"main"}'
            log_success "Deploy workflow trigget!"
            ;;
        "full")
            log_info "🚀 Starter FULL deploy pipeline..."
            echo ""
            
            # Step 1: Build verification
            log_info "📦 Steg 1/4: Build verifisering..."
            cd "$PROJECT_DIR"
            npm run lint > /dev/null 2>&1 && log_success "Lint OK" || { log_error "Lint feilet"; exit 1; }
            npm run type-check > /dev/null 2>&1 && log_success "Type-check OK" || { log_error "Type-check feilet"; exit 1; }
            npm run build > /dev/null 2>&1 && log_success "Build OK" || { log_error "Build feilet"; exit 1; }
            
            # Step 2: Database migrations
            echo ""
            log_info "🗄️  Steg 2/4: Database migrasjoner..."
            for file in "$PROJECT_DIR"/supabase/migrations/*.sql; do
                [ -f "$file" ] || continue
                log_info "Kjører: $(basename "$file")"
                psql "${DATABASE_URL:-postgresql://postgres:${SUPABASE_SERVICE_ROLE_KEY}@db.vuxbjlykgmzskxbclquf.supabase.co:5432/postgres}" -f "$file" > /dev/null 2>&1 || log_warning "$(basename "$file") kan ha feilet (kanskje allerede kjørt)"
            done
            log_success "Migrasjoner fullført"
            
            # Step 3: Vercel deploy
            echo ""
            log_info "🚀 Steg 3/4: Vercel deploy..."
            cd "$PROJECT_DIR"
            DEPLOY_URL=$(vercel --prod --token "$VERCEL_TOKEN" --yes 2>&1 | tail -n 1)
            log_success "Deploy fullført: $DEPLOY_URL"
            
            # Step 4: Verification
            echo ""
            log_info "🔍 Steg 4/4: Verifisering..."
            sleep 3
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" 2>/dev/null || echo "000")
            [ "$HTTP_CODE" == "200" ] && log_success "Verifisering OK (HTTP $HTTP_CODE)" || log_warning "Verifisering usikker (HTTP $HTTP_CODE)"
            
            echo ""
            log_success "🎉 FULL DEPLOY PIPELINE FULLFØRT!"
            echo ""
            echo "🔗 URL: $DEPLOY_URL"
            echo "🔗 Admin: $DEPLOY_URL/no7admin"
            ;;
        "logs")
            log_info "Henter siste deploy logs..."
            curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
                "https://api.vercel.com/v2/deployments" | \
                jq -r '.deployments[0:3] | .[] | "\(.state) | \(.url) | \(.created)"'
            ;;
        *)
            cat << 'EOF'
Deploy kommandoer:
  mcp deploy status     Sjekk siste deploy status
  mcp deploy trigger    Trigg ny deploy via GitHub Actions
  mcp deploy logs       Vis siste deploy logs
  mcp deploy full       Full pipeline: build + migrations + deploy + verify
EOF
            ;;
    esac
}

cmd_github() {
    load_env
    local action="${2:-status}"
    
    case "$action" in
        "status"|"commits")
            log_info "Siste commits..."
            curl -s -H "Authorization: token $GITHUB_PAT" \
                "https://api.github.com/repos/${GITHUB_OWNER:-tomarnejensen}/${GITHUB_REPO_NAME:-klarpakke}/commits?per_page=5" | \
                jq -r '.[] | "\(.sha[:8]) \(.commit.message | split("\n")[0])"'
            ;;
        "workflows")
            log_info "GitHub Actions workflows..."
            curl -s -H "Authorization: token $GITHUB_PAT" \
                "https://api.github.com/repos/${GITHUB_OWNER:-tomarnejensen}/${GITHUB_REPO_NAME:-klarpakke}/actions/runs?per_page=5" | \
                jq -r '.workflow_runs[] | "\(.status) | \(.name) | \(.created_at)"'
            ;;
        *)
            cat << 'EOF'
GitHub kommandoer:
  mcp github status      Vis siste commits
  mcp github workflows   Vis workflow kjøringer
EOF
            ;;
    esac
}

cmd_check() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          KIMI 2.5 MCP VERKTØY STATUS                   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ -f "$ENV_FILE" ]; then
        log_success "MCP .env funnet"
    else
        log_error "MCP .env IKKE funnet"
        return 1
    fi
    
    load_env > /dev/null 2>&1
    
    echo ""
    echo "Token status:"
    [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && log_success "SUPABASE_SERVICE_ROLE_KEY" || log_error "SUPABASE_SERVICE_ROLE_KEY mangler"
    [ -n "${VERCEL_TOKEN:-}" ] && log_success "VERCEL_TOKEN" || log_error "VERCEL_TOKEN mangler"
    [ -n "${GITHUB_PAT:-}" ] && log_success "GITHUB_PAT" || log_error "GITHUB_PAT mangler"
    [ -n "${DATABASE_URL:-}" ] && log_success "DATABASE_URL" || log_warning "DATABASE_URL (bruker fallback)"
    
    echo ""
    echo "Tilgjengelige kategorier:"
    echo "  ./mcp.sh database [check|query|tables|migrate]"
    echo "  ./mcp.sh deploy   [status|trigger|logs|full]"
    echo "  ./mcp.sh github   [status|workflows]"
}

# ============================================
# HOVED
# ============================================

main() {
    local category="${1:-check}"
    
    case "$category" in
        "database"|"db")
            cmd_database "$@"
            ;;
        "deploy")
            cmd_deploy "$@"
            ;;
        "github"|"gh")
            cmd_github "$@"
            ;;
        "check"|"status")
            cmd_check
            ;;
        "help"|*)
            cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║              KIMI 2.5 MCP MASTER CONTROL                   ║
╚════════════════════════════════════════════════════════════╝

Bruk: ./mcp.sh [kategori] [kommando] [args...]

KATEGORIER:
  database (db)    Database operasjoner (SQL)
  deploy           Vercel deploy management
  github (gh)      GitHub Actions & commits
  check            Sjekk MCP status

EKSEMPLER:
  ./mcp.sh check                        # Sjekk status
  ./mcp.sh database check               # Test DB tilkobling
  ./mcp.sh database query "SELECT *..." # Kjør SQL
  ./mcp.sh database migrate             # Kjør migrasjoner
  ./mcp.sh deploy status                # Sjekk deploy status
  ./mcp.sh deploy trigger               # Trigg ny deploy
  ./mcp.sh deploy full                  # Full pipeline
  ./mcp.sh github status                # Vis commits

MCP-verktøy gir deg:
  ✅ Direkte SQL tilgang til database
  ✅ Trigger deploy uten manuell Git push
  ✅ Sjekk status på alle systemer
  ✅ Automatisert drift og vedlikehold

For mer info: cat klarpakke-mcp-server/MCP-MASTER-GUIDE.md
EOF
            ;;
    esac
}

main "$@"

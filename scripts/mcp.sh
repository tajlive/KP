#!/usr/bin/env bash
# MCP master control script
# Bruk: ./mcp.sh [kategori] [handling] [args...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"
LEGACY_ENV_FILE="$PROJECT_DIR/klarpakke-mcp-server/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}i $1${NC}"; }
log_success() { echo -e "${GREEN}+ $1${NC}"; }
log_warning() { echo -e "${YELLOW}! $1${NC}"; }
log_error() { echo -e "${RED}x $1${NC}"; }

load_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0

  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      value="${value%\"}"; value="${value#\"}"
      value="${value%\'}"; value="${value#\'}"
      if [ -z "${!key:-}" ]; then
        export "$key=$value"
      fi
    fi
  done < "$file"
}

load_env() {
  load_env_file "$ENV_FILE"
  load_env_file "$LEGACY_ENV_FILE"
}

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    log_error "Mangler variabel: $name"
    return 1
  fi
}

require_database() {
  command -v psql >/dev/null 2>&1 || { log_error "psql er ikke installert"; return 1; }
  require_var DATABASE_URL
}

repo_slug() {
  if [ -n "${GITHUB_REPOSITORY:-}" ]; then
    echo "$GITHUB_REPOSITORY"
    return 0
  fi
  local remote
  remote="$(git -C "$PROJECT_DIR" remote get-url origin 2>/dev/null || true)"
  if [ -n "$remote" ]; then
    echo "$remote" | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\.git)?#\1#'
    return 0
  fi
  echo "tajlive/KP"
}

cmd_database() {
  load_env
  local action="${2:-help}"

  case "$action" in
    check|test)
      log_info "Tester database-tilkobling..."
      require_database || exit 1
      if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database-tilkobling OK"
      else
        log_error "Database-tilkobling feilet"
        exit 1
      fi
      ;;
    query|q)
      require_database || exit 1
      local query="${3:-}"
      [ -z "$query" ] && { log_error "Mangler query. Bruk: ./mcp.sh database query 'SELECT ...'"; exit 1; }
      psql "$DATABASE_URL" -c "$query"
      ;;
    tables)
      require_database || exit 1
      psql "$DATABASE_URL" -c "\dt"
      ;;
    migrate)
      require_database || exit 1
      log_info "Kjorer migrasjoner i supabase/migrations..."
      for file in "$PROJECT_DIR"/supabase/migrations/*.sql; do
        [ -f "$file" ] || continue
        log_info "Kjorer $(basename "$file")"
        psql "$DATABASE_URL" -f "$file" || log_warning "$(basename "$file") feilet eller er allerede kjort"
      done
      log_success "Migrasjoner ferdig"
      ;;
    *)
      cat <<'EOF'
Database:
  ./mcp.sh database check
  ./mcp.sh database query "SELECT now();"
  ./mcp.sh database tables
  ./mcp.sh database migrate
EOF
      ;;
  esac
}

cmd_deploy() {
  load_env
  local action="${2:-status}"

  case "$action" in
    trigger)
      require_var GITHUB_TOKEN || exit 1
      local repo
      repo="$(repo_slug)"
      log_info "Trigger workflow_dispatch for manual-deploy.yml pa $repo..."
      curl -sf -X POST \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/${repo}/actions/workflows/manual-deploy.yml/dispatches" \
        -d '{"ref":"main","inputs":{"environment":"production"}}' >/dev/null
      log_success "Deploy workflow trigget"
      ;;
    *)
      cat <<'EOF'
Deploy:
  ./mcp.sh deploy trigger   # Trigger GitHub Actions deploy workflow
EOF
      ;;
  esac
}

cmd_github() {
  load_env
  local action="${2:-status}"
  require_var GITHUB_TOKEN || exit 1
  local repo
  repo="$(repo_slug)"

  case "$action" in
    status|commits)
      log_info "Siste commits i $repo"
      curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        "https://api.github.com/repos/${repo}/commits?per_page=5" | \
        jq -r '.[] | "\(.sha[0:8]) \(.commit.message | split("\n")[0])"'
      ;;
    workflows)
      log_info "Siste workflow-runs i $repo"
      curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        "https://api.github.com/repos/${repo}/actions/runs?per_page=5" | \
        jq -r '.workflow_runs[] | "\(.status) | \(.name) | \(.created_at)"'
      ;;
    *)
      cat <<'EOF'
GitHub:
  ./mcp.sh github status
  ./mcp.sh github workflows
EOF
      ;;
  esac
}

cmd_check() {
  load_env
  echo "MCP status"
  echo "----------"
  node "$PROJECT_DIR/scripts/cloud-readiness.mjs" --profile agent || true
  echo ""
  echo "Tilgjengelige kategorier:"
  echo "  ./mcp.sh database [check|query|tables|migrate]"
  echo "  ./mcp.sh deploy   [trigger]"
  echo "  ./mcp.sh github   [status|workflows]"
}

main() {
  local category="${1:-check}"
  case "$category" in
    database|db) cmd_database "$@" ;;
    deploy) cmd_deploy "$@" ;;
    github|gh) cmd_github "$@" ;;
    check|status) cmd_check ;;
    help|*)
      cat <<'EOF'
Bruk: ./mcp.sh [kategori] [handling] [args...]

Kategorier:
  database (db)  SQL operasjoner
  deploy         GitHub deploy trigger
  github (gh)    GitHub status/workflows
  check          Sky-readiness status
EOF
      ;;
  esac
}

main "$@"

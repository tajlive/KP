#!/bin/bash
# =============================================================================
# KLARPAKKE + KIMI + ANTIGRAVITY - PERFORMANCE TEST
# =============================================================================
# Sammenligner hastighet mellom vanlig shell-kall og Antigravity API
# =============================================================================

set -e

KLARPAKKE_HOME="/Users/taj/klarpakke"
API_PORT="3456"
API_TOKEN="klar pakke-dev-token"
API_URL="http://localhost:$API_PORT"

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Timing function
measure_time() {
  local start_time=$(date +%s%N)
  eval "$1" > /dev/null 2>&1
  local end_time=$(date +%s%N)
  echo $(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
}

# API call timing
measure_api() {
  local endpoint=$1
  local start_time=$(date +%s%N)
  curl -s -H "Authorization: Bearer $API_TOKEN" "$API_URL$endpoint" > /dev/null
  local end_time=$(date +%s%N)
  echo $(( (end_time - start_time) / 1000000 ))
}

# Check if API server is running
check_server() {
  log_info "Sjekker API server..."
  if curl -s "$API_URL/health" > /dev/null 2>&1; then
    log_success "API server kjører på port $API_PORT"
    return 0
  else
    log_error "API server kjører IKKE!"
    log_info "Start med: node api-server.js"
    return 1
  fi
}

# Test 1: Git Status
test_git_status() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 TEST 1: Git Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local shell_time=$(measure_time "cd $KLARPAKKE_HOME && git status --porcelain")
  local api_time=$(measure_api "/git/status")
  
  echo "Shell (direkte): ${shell_time}ms"
  echo "API (via server): ${api_time}ms"
  
  if [ "$api_time" -lt "$shell_time" ]; then
    local diff=$((shell_time - api_time))
    log_success "API er ${diff}ms raskere! 🚀"
  else
    local diff=$((api_time - shell_time))
    log_warn "Shell er ${diff}ms raskere"
  fi
}

# Test 2: Fillesning
test_file_read() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📄 TEST 2: File Read (package.json)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local shell_time=$(measure_time "cat $KLARPAKKE_HOME/package.json")
  local api_time=$(measure_api "/file/read?path=package.json")
  
  echo "Shell (cat): ${shell_time}ms"
  echo "API (server): ${api_time}ms"
  
  # Test med caching (andre request)
  log_info "Tester API caching (andre request)..."
  local api_cached=$(measure_api "/file/read?path=package.json")
  echo "API (cached): ${api_cached}ms"
  
  if [ "$api_cached" -lt "$api_time" ]; then
    log_success "Cache fungerer! ${api_cached}ms vs ${api_time}ms"
  fi
}

# Test 3: Git Log
test_git_log() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📜 TEST 3: Git Log (10 commits)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local shell_time=$(measure_time "cd $KLARPAKKE_HOME && git log --oneline -10")
  local api_time=$(measure_api "/git/log?limit=10")
  
  echo "Shell (git log): ${shell_time}ms"
  echo "API (server): ${api_time}ms"
}

# Test 4: Prosjektnfo
test_project_info() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 TEST 4: Project Info (parallell prosessering)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local start=$(date +%s%N)
  cd $KLARPAKKE_HOME
  local name=$(cat package.json | grep '"name"' | head -1)
  local branch=$(git branch --show-current)
  local end=$(date +%s%N)
  local shell_time=$(( (end - start) / 1000000 ))
  
  local api_time=$(measure_api "/project/info")
  
  echo "Shell (sekvensiell): ${shell_time}ms"
  echo "API (parallell): ${api_time}ms"
}

# Test 5: Konkurrent test (10 parallelle requests)
test_concurrent() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚡ TEST 5: Concurrent Requests (10 parallelle kall)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  log_info "Sender 10 parallelle requests..."
  local start=$(date +%s%N)
  
  for i in {1..10}; do
    curl -s -H "Authorization: Bearer $API_TOKEN" "$API_URL/health" > /dev/null &
  done
  wait
  
  local end=$(date +%s%N)
  local total_time=$(( (end - start) / 1000000 ))
  local avg_time=$(( total_time / 10 ))
  
  echo "Total tid: ${total_time}ms"
  echo "Gjennomsnitt per request: ${avg_time}ms"
  
  if [ "$avg_time" -lt 50 ]; then
    log_success "Utmerket! Serveren håndterer parallell lasting godt"
  fi
}

# Test 6: Compression test
test_compression() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🗜️  TEST 6: Response Compression"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  log_info "Tester med Brotli komprimering..."
  local size_with=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
    -H "Accept-Encoding: br" \
    "$API_URL/project/info" | wc -c)
  
  local size_without=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
    "$API_URL/project/info" | wc -c)
  
  echo "Størrelse med komprimering: ${size_with} bytes"
  echo "Størrelse uten komprimering: ${size_without} bytes"
  
  if [ "$size_with" -lt "$size_without" ]; then
    local savings=$(( (size_without - size_with) * 100 / size_without ))
    log_success "Komprimering sparer ${savings}% båndbredde!"
  fi
}

# Full benchmark
run_full_benchmark() {
  echo ""
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║        KLARPAKKE PERFORMANCE BENCHMARK               ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""
  log_info "Dato: $(date)"
  log_info "API Server: $API_URL"
  echo ""
  
  check_server || exit 1
  
  test_git_status
  test_file_read
  test_git_log
  test_project_info
  test_concurrent
  test_compression
  
  echo ""
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║              BENCHMARK FULLFØRT! ✅                   ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo ""
  log_info "Tips for ytelse:"
  echo "  • Bruk API-caching for gjentatte kall"
  echo "  • Keep-Alive reduserer connection overhead"
  echo "  • Komprimering sparer båndbredde"
  echo "  • Parallell prosessering er raskere enn sekvensiell"
}

# CLI Interface
case "${1:-all}" in
  status)
    check_server
    ;;
  git)
    check_server && test_git_status
    ;;
  file)
    check_server && test_file_read
    ;;
  concurrent)
    check_server && test_concurrent
    ;;
  compression)
    check_server && test_compression
    ;;
  all)
    run_full_benchmark
    ;;
  *)
    echo "Bruk: $0 [status|git|file|concurrent|compression|all]"
    echo ""
    echo "Kommandoer:"
    echo "  status      - Sjekk om API server kjører"
    echo "  git         - Test git operasjoner"
    echo "  file        - Test fillesning"
    echo "  concurrent  - Test parallell lasting"
    echo "  compression - Test respons-komprimering"
    echo "  all         - Kjør alle tester (default)"
    exit 1
    ;;
esac

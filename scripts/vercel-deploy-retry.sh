#!/bin/bash
# ============================================================================
# Vercel Auto-Deploy with Retry Logic
# Prøver deploy flere ganger med exponential backoff
# ============================================================================

set -e

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Konfigurasjon
MAX_RETRIES=10
INITIAL_WAIT=30          # Sekunder før første retry
MAX_WAIT=600             # Maks 10 minutter ventetid
BACKOFF_MULTIPLIER=2     # Dobbel ventetid for hver retry
DEPLOY_TIMEOUT=600       # 10 minutter timeout per deploy-forsøk

# Tellere
retry_count=0
last_error=""
deployment_url=""

# Logging funksjoner
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

# Hjelpefunksjoner
show_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ -d /proc/$pid ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

calculate_wait_time() {
    local attempt=$1
    local wait=$((INITIAL_WAIT * (BACKOFF_MULTIPLIER ** (attempt - 1))))
    if [ $wait -gt $MAX_WAIT ]; then
        wait=$MAX_WAIT
    fi
    echo $wait
}

format_time() {
    local seconds=$1
    if [ $seconds -lt 60 ]; then
        echo "${seconds}s"
    else
        local mins=$((seconds / 60))
        local secs=$((seconds % 60))
        echo "${mins}m ${secs}s"
    fi
}

# Pre-flight sjekk
preflight_check() {
    log_step "Pre-flight Check"
    
    # Sjekk Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI ikke funnet. Installer med: npm i -g vercel"
        exit 1
    fi
    
    # Sjekk innlogging
    if ! vercel whoami &>/dev/null; then
        log_error "Ikke logget inn på Vercel. Kjør: vercel login"
        exit 1
    fi
    
    local user=$(vercel whoami)
    log_success "Logget inn som: $user"
    
    # Sjekk git
    if ! git rev-parse --git-dir &>/dev/null; then
        log_error "Ikke i et git repository"
        exit 1
    fi
    
    # Sjekk uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        log_warning "Det finnes uncommitted changes!"
        git status --short
        echo ""
        read -p "Vil du fortsette deploy? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Avbryter..."
            exit 0
        fi
    fi
    
    # Vis git info
    local branch=$(git branch --show-current)
    local commit=$(git rev-parse --short HEAD)
    log_info "Branch: $branch | Commit: $commit"
}

# Hoved deploy-funksjon
try_deploy() {
    local attempt=$1
    local temp_file=$(mktemp)
    
    log_step "Deploy forsøk $attempt/$MAX_RETRIES"
    log_info "Starter deploy med timeout $(format_time $DEPLOY_TIMEOUT)..."
    
    # Kjør vercel deploy i bakgrunnen
    (
        vercel --yes --prod 2>&1
        echo "EXIT_CODE:$?" >> "$temp_file"
    ) &
    
    local pid=$!
    local waited=0
    local spinner_chars=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
    local spinner_idx=0
    
    # Vis fremdrift med spinner
    while kill -0 $pid 2>/dev/null; do
        local char=${spinner_chars[$spinner_idx]}
        spinner_idx=$(( (spinner_idx + 1) % 10 ))
        
        local elapsed_mins=$((waited / 60))
        local elapsed_secs=$((waited % 60))
        printf "\r${CYAN}%s${NC} Bygger... ${elapsed_mins}m ${elapsed_secs}s elapsed" "$char"
        
        sleep 1
        waited=$((waited + 1))
        
        # Sjekk timeout
        if [ $waited -ge $DEPLOY_TIMEOUT ]; then
            echo ""
            log_warning "Deploy timeout etter $(format_time $DEPLOY_TIMEOUT)"
            kill $pid 2>/dev/null || true
            wait $pid 2>/dev/null || true
            rm -f "$temp_file"
            return 1
        fi
    done
    
    echo ""
    
    # Vent på at prosessen fullfører
    wait $pid
    local exit_code=$?
    
    # Sjekk exit code fra filen hvis den finnes
    if [ -f "$temp_file" ]; then
        local file_exit=$(grep "EXIT_CODE:" "$temp_file" | tail -1 | cut -d: -f2)
        if [ -n "$file_exit" ]; then
            exit_code=$file_exit
        fi
        rm -f "$temp_file"
    fi
    
    return $exit_code
}

# Analyser feil og bestem om vi skal retry
should_retry() {
    local error_output=$1
    
    # Liste over feil som indikerer retry kan hjelpe
    local retryable_errors=(
        "internal error"
        "We encountered an internal error"
        "Response Error (502)"
        "Response Error (503)"
        "Response Error (504)"
        "ETIMEOUT"
        "ECONNRESET"
        "rate limit"
        "Deployment events polling error"
        "timeout"
    )
    
    for pattern in "${retryable_errors[@]}"; do
        if echo "$error_output" | grep -qi "$pattern"; then
            return 0  # Ja, prøv igjen
        fi
    done
    
    return 1  # Nei, ikke prøv igjen
}

# Hent deployment URL
get_deployment_url() {
    local url=$(vercel ls 2>&1 | grep -E "https://klarpakke-.*\.vercel\.app" | head -1 | awk '{print $NF}')
    echo "$url"
}

# Vis sluttrapport
show_final_report() {
    local success=$1
    local total_time=$2
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    
    if [ "$success" = true ]; then
        echo "║  🎉 DEPLOY FULLFØRT!                                          ║"
    else
        echo "║  ❌ DEPLOY FEILET                                             ║"
    fi
    
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 Statistikk:"
    echo "   Forsøk:       $retry_count/$MAX_RETRIES"
    echo "   Total tid:    $(format_time $total_time)"
    
    if [ "$success" = true ] && [ -n "$deployment_url" ]; then
        echo ""
        echo "🔗 URL-er:"
        echo "   Produksjon:  https://www.klarpakke.no"
        echo "   Deploy:      $deployment_url"
        echo "   Vercel:      https://vercel.com/tom-jensens-projects/klarpakke"
        echo ""
        log_success "Deploy ferdig! 🚀"
        
        # Åpne URL i browser hvis på macOS
        if command -v open &> /dev/null; then
            echo ""
            read -p "Åpne produksjons-URL i browser? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "https://www.klarpakke.no"
            fi
        fi
    else
        echo ""
        log_error "Deploy feilet etter $MAX_RETRIES forsøk"
        echo ""
        echo "💡 Anbefalte handlinger:"
        echo "   1. Sjekk Vercel status: https://vercel-status.com"
        echo "   2. Prøv deploy fra dashboard: https://vercel.com/tom-jensens-projects/klarpakke"
        echo "   3. Kontakt Vercel support hvis problemet vedvarer"
        echo ""
        
        if [ -n "$last_error" ]; then
            echo "📝 Siste feilmelding:"
            echo "   $last_error"
        fi
    fi
    
    echo ""
}

# ============================================================================
# HOVEDPROGRAM
# ============================================================================

main() {
    local start_time=$(date +%s)
    local success=false
    
    # Header
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  🚀 VERCEL AUTO-DEPLOY WITH RETRY                             ║"
    echo "║  Maks forsøk: $MAX_RETRIES | Timeout: $(format_time $DEPLOY_TIMEOUT) per forsøk        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Pre-flight
    preflight_check
    
    # Deploy loop
    while [ $retry_count -lt $MAX_RETRIES ]; do
        retry_count=$((retry_count + 1))
        
        local attempt_start=$(date +%s)
        
        # Prøv deploy
        local error_output=$(try_deploy $retry_count 2>&1) || true
        local exit_code=${PIPESTATUS[0]}
        local attempt_end=$(date +%s)
        local attempt_duration=$((attempt_end - attempt_start))
        
        # Logg output for debugging
        if echo "$error_output" | grep -q "error\|Error\|ERROR"; then
            last_error=$(echo "$error_output" | grep -E "error|Error|ERROR" | tail -1)
        fi
        
        # Sjekk om deploy var vellykket
        if [ $exit_code -eq 0 ] && ! echo "$error_output" | grep -qE "(Error|error|failed)"; then
            success=true
            deployment_url=$(get_deployment_url)
            log_success "Deploy vellykket etter $retry_count forsøk!"
            break
        fi
        
        # Sjekk om vi skal prøve igjen
        if should_retry "$error_output"; then
            if [ $retry_count -lt $MAX_RETRIES ]; then
                local wait_time=$(calculate_wait_time $retry_count)
                log_warning "Deploy feilet - venter $(format_time $wait_time) før retry..."
                
                # Vis nedtelling
                for i in $(seq $wait_time -1 1); do
                    printf "\r${YELLOW}⏱️  Nytt forsøk om %2ds...${NC}   " "$i"
                    sleep 1
                done
                echo ""
            fi
        else
            log_error "Uventet feil - retry vil sannsynligvis ikke hjelpe"
            log_error "$last_error"
            break
        fi
    done
    
    # Beregn total tid
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    # Vis sluttrapport
    show_final_report "$success" "$total_time"
    
    # Exit med riktig kode
    if [ "$success" = true ]; then
        exit 0
    else
        exit 1
    fi
}

# Start hovedprogram
main "$@"

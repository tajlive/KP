#!/bin/bash
# Prediktiv Kontekst for KIMI — v2.1 (2026-04-14)
# Gjetter relevant kontekst basert på tid, filer, og MemPalace

get_time_context() {
    local hour=$(date +%H)
    
    if [ $hour -lt 12 ]; then
        echo "morning-focus"
    elif [ $hour -lt 17 ]; then
        echo "afternoon-deep"
    else
        echo "evening-wrap"
    fi
}

get_recent_files() {
    git diff --name-only HEAD~5..HEAD 2>/dev/null | head -10 || echo ""
}

detect_domain() {
    local files="$1"
    
    if echo "$files" | grep -qE "src/lib/auth|refresh-guard|sentry-auth"; then
        echo "auth"
    elif echo "$files" | grep -qE "src/lib/trading|src/app/api/trading|auto-trading"; then
        echo "trading"
    elif echo "$files" | grep -qE "src/app/api/.*route\.ts"; then
        echo "api"
    elif echo "$files" | grep -qE "src/components|src/features|src/app/.*/page\.tsx"; then
        echo "ui"
    elif echo "$files" | grep -qE "supabase/migrations|src/lib/supabase"; then
        echo "database"
    elif echo "$files" | grep -qE "e2e/|.*\.test\.(ts|tsx)|.*\.spec\.(ts|tsx)"; then
        echo "testing"
    elif echo "$files" | grep -qE "scripts/run-mempalace|mempalace\.yaml"; then
        echo "infrastructure"
    else
        echo "general"
    fi
}

predict_skills() {
    local domain="$1"
    
    case "$domain" in
        auth)
            echo "vulnerability-scanner,api-patterns/security-testing,testing-patterns"
            ;;
        trading)
            echo "crypto-specialist,api-patterns"
            ;;
        api)
            echo "api-patterns,api-patterns/rate-limiting"
            ;;
        ui)
            echo "frontend-design,nextjs-react-expert"
            ;;
        database)
            echo "database-design,database-design/migrations"
            ;;
        testing)
            echo "webapp-testing,testing-patterns"
            ;;
        infrastructure)
            echo "performance-profiling,api-patterns"
            ;;
        *)
            echo "clean-code,testing-patterns"
            ;;
    esac
}

predict_rooms() {
    local domain="$1"
    
    case "$domain" in
        auth)
            echo "auth_system,auth,error_patterns"
            ;;
        trading)
            echo "critical_decisions,api_contracts"
            ;;
        api)
            echo "api_contracts,critical_decisions"
            ;;
        ui)
            echo "ux_engineering,project_status"
            ;;
        database)
            echo "critical_decisions,tech_debt"
            ;;
        testing)
            echo "error_patterns,critical_decisions"
            ;;
        infrastructure)
            echo "infrastructure,operations"
            ;;
        *)
            echo "critical_decisions"
            ;;
    esac
}

# Hovedlogikk
echo "🔮 Predicting Context..."
echo ""

TIME_CTX=$(get_time_context)
RECENT_FILES=$(get_recent_files)
DOMAIN=$(detect_domain "$RECENT_FILES")
SKILLS=$(predict_skills "$DOMAIN")
ROOMS=$(predict_rooms "$DOMAIN")

echo "Time Context: $TIME_CTX"
echo "Domain: $DOMAIN"
echo ""
echo "Recent Files:"
echo "$RECENT_FILES" | head -5 | sed 's/^/  - /'
echo ""
echo "Predicted Skills: $SKILLS"
echo "Predicted Rooms: $ROOMS"
echo ""

# Output som JSON for MCP
if [ "$1" = "--json" ]; then
    cat <<EOF
{
  "time_context": "$TIME_CTX",
  "domain": "$DOMAIN",
  "recent_files": [$(echo "$RECENT_FILES" | head -5 | sed 's/.*/"&",/' | tr -d '\n' | sed 's/,$//')],
  "predicted_skills": "$(echo $SKILLS | tr ',' ' ')",
  "predicted_rooms": "$(echo $ROOMS | tr ',' ' ')"
}
EOF
fi

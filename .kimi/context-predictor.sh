#!/bin/bash
# Prediktiv Kontekst for KIMI
# Gjetter relevant kontekst basert på tid, filer, og Linear

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
    
    if echo "$files" | grep -q "auth"; then
        echo "auth"
    elif echo "$files" | grep -q "trading"; then
        echo "trading"
    elif echo "$files" | grep -q "api"; then
        echo "api"
    elif echo "$files" | grep -q "components"; then
        echo "ui"
    else
        echo "general"
    fi
}

predict_skills() {
    local domain="$1"
    
    case "$domain" in
        auth)
            echo "vulnerability-scanner,api-patterns/security-testing"
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
        *)
            echo "clean-code,testing-patterns"
            ;;
    esac
}

predict_rooms() {
    local domain="$1"
    
    case "$domain" in
        auth)
            echo "auth_system,error_patterns"
            ;;
        trading)
            echo "critical_decisions,api_contracts"
            ;;
        api)
            echo "api_contracts,critical_decisions"
            ;;
        ui)
            echo "project_status"
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

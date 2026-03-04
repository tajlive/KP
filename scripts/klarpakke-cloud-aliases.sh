#!/bin/bash

# Configuration
# Bruker direkte URL for å bypass Supabase proxy JWT-sjekk
API_URL="https://vuxbjlykgmzskxbclquf.functions.supabase.co/api-gateway"
# Use a default token or fetch from env
TOKEN="${API_GATEWAY_TOKEN:-klarpakke-dev-token}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}☁️  Klarpakke Cloud Aliases Loaded${NC}"
echo "Use 'kphelp' to list commands."

# 1. Health Check
function kphealth() {
    curl -s "$API_URL/health" \
      -H "Authorization: Bearer $TOKEN" | jq .
}

# 2. Git Status
function kpgit() {
    curl -s "$API_URL/git/status" \
      -H "Authorization: Bearer $TOKEN" | jq .
}

# 3. Read File
function kpcat() {
    if [ -z "$1" ]; then
        echo "Usage: kpcat <filename>"
        return
    fi
    curl -s "$API_URL/file/read?path=$1" \
      -H "Authorization: Bearer $TOKEN" | jq -r .content
}

# 4. Trigger Build
function kpdeploy() {
    echo "Triggering Vercel build..."
    curl -s -X POST "$API_URL/build" \
      -H "Authorization: Bearer $TOKEN" | jq .
}

# 5. Full Status
function kpstatus() {
    echo -e "${GREEN}--- System Status ---${NC}"
    kphealth
    echo -e "\n${GREEN}--- Git Status ---${NC}"
    kpgit
}

# Help
function kphelp() {
    echo "Available Cloud Commands:"
    echo "  kphealth    - Check API Gateway status"
    echo "  kpgit       - Check repository status"
    echo "  kpcat <f>   - Read file content"
    echo "  kpdeploy    - Trigger production build"
    echo "  kpstatus    - Show system overview"
}

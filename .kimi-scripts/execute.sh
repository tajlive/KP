#!/bin/bash
# KLARPAKKE OPTIMIZATION SCRIPT EXECUTOR
# Usage: ./execute.sh [script-number]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script definitions
SCRIPTS=(
  "01-mobile-landing.kimi:Mobile Landing Optimization:4h:CRITICAL"
  "02-security-headers.kimi:Security Headers:2h:HIGH"
  "03-performance-optimizations.kimi:Performance Optimizations:3h:HIGH"
  "04-route-consolidation.kimi:Route Consolidation:6h:HIGH"
  "05-accessibility-audit.kimi:Accessibility Audit:4h:MEDIUM"
  "06-storybook-setup.kimi:Storybook Setup:8h:MEDIUM"
  "07-e2e-tests.kimi:E2E Test Expansion:6h:HIGH"
  "08-real-time-websocket.kimi:Real-time WebSocket:8h:HIGH"
  "09-push-notifications.kimi:Push Notifications:5h:MEDIUM"
  "10-trustpilot-integration.kimi:Trustpilot Integration:3h:MEDIUM"
  "11-dark-mode-system.kimi:Dark Mode System:4h:MEDIUM"
)

print_header() {
  echo -e "${BLUE}"
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║   KLARPAKKE OPTIMIZATION SUITE                          ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_scripts() {
  echo ""
  echo -e "${YELLOW}Available Scripts:${NC}"
  echo ""
  
  for i in "${!SCRIPTS[@]}"; do
    IFS=':' read -r filename title time priority <<< "${SCRIPTS[$i]}"
    num=$((i+1))
    printf "  %2d. %-40s %6s  [%s]\n" "$num" "$title" "$time" "$priority"
  done
  
  echo ""
  echo "  all  - Run all scripts in sequence"
  echo ""
}

show_script() {
  local num=$1
  local index=$((num-1))
  
  if [ "$index" -lt 0 ] || [ "$index" -ge "${#SCRIPTS[@]}" ]; then
    echo -e "${RED}Invalid script number: $num${NC}"
    exit 1
  fi
  
  IFS=':' read -r filename title time priority <<< "${SCRIPTS[$index]}"
  local filepath="$SCRIPT_DIR/$filename"
  
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Script $num: $title${NC}"
  echo -e "${GREEN}Estimated time: $time | Priority: $priority${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  if [ -f "$filepath" ]; then
    cat "$filepath"
  else
    echo -e "${RED}Script file not found: $filepath${NC}"
    exit 1
  fi
}

# Main
print_header

if [ $# -eq 0 ]; then
  print_scripts
  echo "Usage: ./execute.sh [script-number]"
  echo "       ./execute.sh all"
  echo ""
  echo "Example: ./execute.sh 1"
  exit 0
fi

if [ "$1" == "all" ]; then
  echo -e "${YELLOW}Displaying all scripts...${NC}"
  for i in $(seq 1 ${#SCRIPTS[@]}); do
    show_script $i
    echo ""
    echo -e "${BLUE}Press Enter to continue to next script...${NC}"
    read -r
    clear
    print_header
  done
else
  show_script "$1"
fi

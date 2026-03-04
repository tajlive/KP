#!/bin/bash
# LinkedIn Sales Navigator Automation for Klarpakke
# Usage: ./linkedin-automation.sh [command] [args]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
  echo -e "${RED}❌${NC} $1"
}

show_help() {
  cat << EOF
LinkedIn Sales Navigator Automation for Klarpakke

Usage: $0 [command] [options]

Commands:
  daily-leads              Generate 50 new leads for the day
  campaign-17mai           Setup 17. mai campaign
  insights [url]           Get insights for specific profile
  create-template [name]   Create outreach template
  campaign-stats [id]      Get campaign statistics
  full-setup               Complete setup automation
  help                     Show this help message

Examples:
  $0 daily-leads
  $0 insights https://linkedin.com/in/example
  $0 full-setup

EOF
}

# Generate daily leads
daily_leads() {
  log_info "Generating 50 new crypto trading leads for Norway..."
  
  cat << 'JSON'
{
  "tool": "sn_find_crypto_trading_leads",
  "args": {
    "geography": "Norway",
    "min_seniority": "Senior",
    "interests": ["cryptocurrency", "trading", "investing", "fintech"],
    "company_types": ["finance", "technology", "consulting", "banking"],
    "limit": 50
  }
}
JSON

  log_success "Lead generation request prepared"
  log_info "Next steps:"
  echo "  1. Review leads in your MCP client"
  echo "  2. Run: sn_get_lead_insights for top 10 leads"
  echo "  3. Send connection requests (max 20/day)"
}

# Setup 17. mai campaign
setup_17mai_campaign() {
  log_info "Setting up 17. mai campaign..."
  
  cat << 'JSON'
{
  "tool": "sn_create_klarpakke_campaign",
  "args": {
    "target_audience": "beginners",
    "geography": "Norway",
    "offer": "founder_spot",
    "urgency": true,
    "spots_left": 47
  }
}
JSON

  log_success "17. mai campaign created!"
  log_info "Campaign phases:"
  echo "  Phase 1 (1-10 mai): Education & awareness"
  echo "  Phase 2 (10-16 mai): Urgency & scarcity"
  echo "  Phase 3 (16-17 mai): Final push"
  echo ""
  log_info "Messaging theme: 'Norsk crypto independence'"
}

# Get profile insights
get_insights() {
  local url="$1"
  if [ -z "$url" ]; then
    log_error "Profile URL required"
    echo "Usage: $0 insights [linkedin-url]"
    exit 1
  fi
  
  log_info "Getting insights for: $url"
  
  cat << JSON
{
  "tool": "sn_get_lead_insights",
  "args": {
    "profile_url": "$url",
    "include_activity": true,
    "include_mutual": true
  }
}
JSON
}

# Create template
create_template() {
  local name="$1"
  if [ -z "$name" ]; then
    name="klarpakke_founder_$(date +%Y%m%d)"
  fi
  
  log_info "Creating template: $name"
  
  cat << JSON
{
  "tool": "sn_create_template",
  "args": {
    "name": "$name",
    "type": "connection",
    "subject": "Norway's first crypto university",
    "body": "Hi {{firstName}},\n\nI noticed you're working in {{industry}} at {{company}}.\n\nI'm building Norway's first crypto university where professionals learn trading with virtual money (1M NOK) before risking real capital.\n\nWe're looking for 100 founder students to join us. Benefits include:\n✓ 10,000 KLT tokens\n✓ Lifetime support\n✓ Free paper trading\n\nWould you be interested in learning more?\n\nBest regards",
    "variables": ["firstName", "company", "industry"]
  }
}
JSON
}

# Get campaign stats
get_stats() {
  local campaign_id="$1"
  if [ -z "$campaign_id" ]; then
    campaign_id="campaign_$(date +%Y%m)"
  fi
  
  log_info "Getting stats for campaign: $campaign_id"
  
  cat << JSON
{
  "tool": "sn_get_campaign_stats",
  "args": {
    "campaign_id": "$campaign_id",
    "period": "30d"
  }
}
JSON
}

# Full setup
full_setup() {
  echo "============================================================================="
  echo "  🚀 KLARPAKKE LINKEDIN AUTOMATION SETUP"
  echo "============================================================================="
  echo ""
  
  log_info "Step 1: Setting up 17. mai campaign..."
  setup_17mai_campaign
  echo ""
  
  log_info "Step 2: Creating outreach templates..."
  create_template "klarpakke_17mai_$(date +%Y%m%d)"
  echo ""
  
  log_info "Step 3: Setting up alerts..."
  cat << 'JSON'
{
  "tool": "sn_setup_alerts",
  "args": {
    "alert_type": "job_change",
    "keywords": ["crypto", "trading", "fintech", "blockchain"],
    "notify_via": "email"
  }
}
JSON
  echo ""
  
  log_info "Step 4: Preparing lead generation..."
  daily_leads
  echo ""
  
  log_success "Setup complete!"
  echo ""
  echo "============================================================================="
  echo "  📋 DAILY AUTOMATION CHECKLIST"
  echo "============================================================================="
  echo "  Morning (9 AM):"
  echo "    ☐ Generate 50 new leads"
  echo "    ☐ Review overnight alerts"
  echo "    ☐ Send 20 connection requests"
  echo ""
  echo "  Afternoon (2 PM):"
  echo "    ☐ Follow up on connections"
  echo "    ☐ Send 5 InMails to qualified leads"
  echo "    ☐ Export warm leads to CRM"
  echo ""
  echo "  Evening (5 PM):"
  echo "    ☐ Review conversion stats"
  echo "    ☐ Adjust messaging if needed"
  echo ""
  echo "============================================================================="
}

# Main
main() {
  case "${1:-help}" in
    daily-leads)
      daily_leads
      ;;
    campaign-17mai)
      setup_17mai_campaign
      ;;
    insights)
      get_insights "$2"
      ;;
    create-template)
      create_template "$2"
      ;;
    campaign-stats)
      get_stats "$2"
      ;;
    full-setup)
      full_setup
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      log_error "Unknown command: $1"
      show_help
      exit 1
      ;;
  esac
}

main "$@"

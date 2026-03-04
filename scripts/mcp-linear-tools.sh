#!/bin/bash
# Linear MCP Tools - Wrapper for Linear CLI
# Usage: bash scripts/mcp-linear-tools.sh <command> [args]

set -e

LINEAR_TOKEN="${LINEAR_API_KEY:-${LINEAR_TOKEN:-}}"

if [ -z "$LINEAR_TOKEN" ]; then
  echo "❌ LINEAR_API_KEY ikke satt"
  echo "Sett token: export LINEAR_API_KEY='lin_api_xxx'"
  exit 1
fi

# Authenticate with Linear
export LINEAR_API_KEY="$LINEAR_TOKEN"

command=$1
shift

case $command in
  "me")
    lin me --json 2>/dev/null || echo '{"error": "Kunne ikke hente bruker"}'
    ;;
  
  "issues")
    # List issues
    if [ -n "$1" ]; then
      # With filter
      lin issue list --state "$1" --json 2>/dev/null | head -50
    else
      # All issues
      lin issue list --json 2>/dev/null | head -50
    fi
    ;;
  
  "issue")
    # Get single issue
    issue_id=$1
    lin issue show "$issue_id" --json 2>/dev/null || echo '{"error": "Issue ikke funnet"}'
    ;;
  
  "create-issue")
    # Create new issue
    title=$1
    team=$2
    description=$3
    
    if [ -z "$title" ] || [ -z "$team" ]; then
      echo '{"error": "Tittel og team kreves"}'
      exit 1
    fi
    
    if [ -n "$description" ]; then
      lin issue create --title "$title" --team "$team" --description "$description" --json 2>/dev/null
    else
      lin issue create --title "$title" --team "$team" --json 2>/dev/null
    fi
    ;;
  
  "update-issue")
    # Update issue
    issue_id=$1
    state=$2
    
    if [ -z "$issue_id" ] || [ -z "$state" ]; then
      echo '{"error": "Issue ID og state kreves"}'
      exit 1
    fi
    
    lin issue update "$issue_id" --state "$state" --json 2>/dev/null
    ;;
  
  "teams")
    # List teams
    lin team list --json 2>/dev/null || echo '{"error": "Kunne ikke hente teams"}'
    ;;
  
  "projects")
    # List projects
    lin project list --json 2>/dev/null || echo '{"error": "Kunne ikke hente prosjekter"}'
    ;;
  
  "cycles")
    # List cycles
    team_id=$1
    if [ -n "$team_id" ]; then
      lin cycle list --team "$team_id" --json 2>/dev/null
    else
      echo '{"error": "Team ID kreves for cycles"}'
    fi
    ;;
  
  "search")
    # Search issues
    query=$1
    if [ -z "$query" ]; then
      echo '{"error": "Søkequery kreves"}'
      exit 1
    fi
    lin issue list --search "$query" --json 2>/dev/null | head -30
    ;;
  
  "help"|*)
    echo "Linear MCP Tools"
    echo ""
    echo "Usage: bash scripts/mcp-linear-tools.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  me                        - Vis nåværende bruker"
    echo "  issues [state]            - List issues (valgfri: todo, in_progress, done)"
    echo "  issue <id>                - Vis spesifikk issue"
    echo "  create-issue <title> <team> [description]  - Opprett ny issue"
    echo "  update-issue <id> <state> - Oppdater issue state"
    echo "  teams                     - List alle teams"
    echo "  projects                  - List alle prosjekter"
    echo "  cycles <team_id>          - List cycles for team"
    echo "  search <query>            - Søk etter issues"
    echo ""
    ;;
esac

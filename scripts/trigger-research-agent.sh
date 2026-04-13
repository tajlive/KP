#!/bin/bash
# Trigger Klarpakke Research Agent med et spørsmål
# Bruk: ./scripts/trigger-research-agent.sh "Should we migrate from Zod to Valibot?"

set -euo pipefail

QUESTION="${1:-}"
if [ -z "$QUESTION" ]; then
  echo "Usage: $0 <research-question>"
  echo "Example: $0 'What are the 2026 EU requirements for crypto trading platform custody?'"
  exit 1
fi

echo "🔬 Triggering Research Agent..."
echo "   Question: $QUESTION"

# This script is a human-readable wrapper.
# In practice, invoke Kimi with the research agent loaded:
#   kimi --agent-file .agent/agents/klarpakke-research-agent.md --prompt "$QUESTION"

echo ""
echo "👉 To run manually:"
echo "   kimi --agent-file .agent/agents/klarpakke-research-agent.md --prompt \"$QUESTION\""
echo ""
echo "👉 Or use this as a Swarm trigger in .kimi/swarm-config.json:"
echo '   { "trigger": "on-decision", "agent": "klarpakke-research-agent" }'

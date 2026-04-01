#!/bin/bash
set -euo pipefail

# The klarpakke-mcp Edge Function expects the Bearer token to match
# KLARPAKKE_MCP_SECRET (set in the Edge Function env vars).
# We support both KLARPAKKE_MCP_SECRET and KLARPAKKE_MCP_TOKEN for convenience.
TOKEN="${KLARPAKKE_MCP_SECRET:-${KLARPAKKE_MCP_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo '{"error":"Missing token: set KLARPAKKE_MCP_SECRET or KLARPAKKE_MCP_TOKEN"}' | jq .
  exit 1
fi

curl -s -H "Authorization: Bearer ${TOKEN}" \
  "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/klarpakke-mcp/mcp?query=SELECT%20count(*)%20as%20active_sessions%20FROM%20trading_sessions%20WHERE%20status='active'" | jq .

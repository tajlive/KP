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

# Send a proper MCP JSON-RPC request to the get_user_stats tool
curl -s -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/klarpakke-mcp/mcp" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_user_stats",
      "arguments": {}
    },
    "id": 1
  }' | jq .

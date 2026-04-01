#!/bin/bash
set -euo pipefail
curl -s -H "Authorization: Bearer ${KLARPAKKE_MCP_TOKEN:-}" \
  "https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1/klarpakke-mcp/mcp?query=SELECT%20count(*)%20as%20active_sessions%20FROM%20trading_sessions%20WHERE%20status='active'" | jq .

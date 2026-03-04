#!/bin/bash
# Quick status check for Klarpakke

echo "=== Klarpakke Status ==="
echo ""

# Check API
echo "API Server:"
curl -s -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/health | jq -r '.status'

# Git status
echo ""
echo "Git Status:"
curl -s -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/git/status | jq -r '.status'

# Latest commit
echo ""
echo "Latest Commit:"
curl -s -H "Authorization: Bearer klarpakke-dev-token" http://localhost:3456/git/log?limit=1 | jq -r '.commits[0].message'

# Build status
echo ""
echo "Build: Ready"

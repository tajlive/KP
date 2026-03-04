#!/bin/bash
# Diagnostics script for live auth issues
# Targeted at the active project: oysfdzutvezqhainaxba

PROJECT_REF="oysfdzutvezqhainaxba"
# Use the token from .env.local if available, otherwise fallback
source .env.local 2>/dev/null || true

echo "🔍 DIAGNOSTICS FOR PROJECT: $PROJECT_REF"
echo "=========================================="

# 1. Check if we can reach the auth authorize endpoint
echo "Testing Supabase Auth Authorize (Google)..."
curl -I "https://$PROJECT_REF.supabase.co/auth/v1/authorize?provider=google"

# 2. Check if we can reach the health check of edge functions
echo ""
echo "Testing Edge Functions (if any are deployed)..."
curl -s "https://$PROJECT_REF.supabase.co/functions/v1/api-gateway/health" || echo "API Gateway not reachable"

# 3. List providers configured (requires admin key or psql)
# Since I have DATABASE_URL for vuxbjlykgmzskxbclquf, but not for oysfdzutvezqhainaxba, 
# I cannot check the providers in oysfdzutvezqhainaxba via psql directly unless the password is the same.

# Let's try to check the current project ref in all env files.
echo ""
echo "Checking project references in config files..."
grep -r "oysfdzutvezqhainaxba" . || echo "Project ref oysfdzutvezqhainaxba not found in codebase!"

echo ""
echo "Checking project references for vuxbjlykgmzskxbclquf in codebase..."
grep -r "vuxbjlykgmzskxbclquf" . | head -n 10

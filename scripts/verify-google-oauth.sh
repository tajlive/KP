#!/bin/bash
#
# Verify Google OAuth Configuration for Klarpakke
# Usage: ./scripts/verify-google-oauth.sh [production|staging|development]
#

set -e

ENVIRONMENT="${1:-production}"
PROJECT_REF="vuxbjlykgmzskxbclquf"

echo "🔍 Verifying Google OAuth Configuration for Klarpakke ($ENVIRONMENT)"
echo "================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required environment variables
check_env_var() {
  local var_name="$1"
  local var_value="${!var_name}"
  
  if [ -z "$var_value" ]; then
    echo -e "${RED}❌ $var_name is not set${NC}"
    return 1
  else
    local masked_value="${var_value:0:10}..."
    echo -e "${GREEN}✅ $var_name is set${NC} ($masked_value)"
    return 0
  fi
}

echo "📋 Environment Variables Check"
echo "-------------------------------"
check_env_var "NEXT_PUBLIC_SUPABASE_URL" || true
check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" || true
echo ""

# Expected redirect URIs
echo "🔗 Redirect URI Configuration"
echo "------------------------------"
if [ "$ENVIRONMENT" = "production" ]; then
  EXPECTED_ORIGIN="https://www.klarpakke.no"
  echo "Expected Origin: $EXPECTED_ORIGIN"
  echo "Expected Redirect URIs:"
  echo "  - https://www.klarpakke.no/no/callback"
  echo "  - https://www.klarpakke.no/en/callback"
  echo "  - https://www.klarpakke.no/th/callback"
  echo "  - https://www.klarpakke.no/zh/callback"
else
  EXPECTED_ORIGIN="http://localhost:3000"
  echo "Expected Origin: $EXPECTED_ORIGIN"
  echo "Expected Redirect URIs:"
  echo "  - http://localhost:3000/no/callback"
  echo "  - http://localhost:3000/en/callback"
fi
echo ""

# Google Cloud Console requirements
echo "☁️  Google Cloud Console Requirements"
echo "-------------------------------------"
echo "1. Authorized JavaScript origins:"
echo "   - https://www.klarpakke.no"
echo "   - https://klarpakke.no (without www)"
echo ""
echo "2. Authorized redirect URIs:"
echo "   - https://www.klarpakke.no/no/callback"
echo "   - https://www.klarpakke.no/en/callback"
echo "   - https://www.klarpakke.no/th/callback"
echo "   - https://www.klarpakke.no/zh/callback"
echo ""
echo "3. OAuth Consent Screen:"
echo "   - Must be in 'PUBLISHING STATUS: IN PRODUCTION'"
echo "   - Test mode causes 'access_denied' errors for external users"
echo ""

# Supabase Auth Provider check
echo "🗄️  Supabase Auth Provider Check"
echo "--------------------------------"
echo "Project ID: $PROJECT_REF"
echo ""
echo "To verify Google provider config, run:"
echo ""
echo "  npx supabase@latest projects api-keys --project-ref $PROJECT_REF"
echo ""
echo "Or check Supabase Dashboard:"
echo "  https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"
echo ""
echo "Required settings:"
echo "  - Client ID: (from Google Cloud Console)"
echo "  - Client Secret: (from Google Cloud Console)"
echo "  - Redirect URL: https://www.klarpakke.no/no/callback"
echo "  - OAuth Scopes: openid, email, profile"
echo ""

# Cookie requirements
echo "🍪 Cookie Requirements for OAuth"
echo "---------------------------------"
echo "Third-party cookies must be enabled for:"
echo "  - accounts.google.com"
echo "  - klarpakke.no"
echo "  - supabase.co"
echo ""
echo "Cookie settings in src/lib/supabase/client.ts:"
echo "  - sameSite: 'none'"
echo "  - secure: true"
echo "  - cookieEncoding: 'raw'"
echo ""

# Common issues
echo "⚠️  Common Google OAuth Issues"
echo "------------------------------"
echo "1. 'redirect_uri_mismatch' - Check Authorized redirect URIs in Google Cloud Console"
echo "2. 'access_denied' - OAuth consent screen not published or user not in test users"
echo "3. 'Cookies blocked' - Third-party cookies disabled in browser"
echo "4. 'exchange_failed' - PKCE verifier cookie not sent (sameSite/secure issue)"
echo "5. Popup blocked - Browser popup blocker preventing OAuth window"
echo ""

# Test URLs
echo "🧪 Test URLs"
echo "------------"
echo "Health check: https://www.klarpakke.no/api/health"
echo "Login page:   https://www.klarpakke.no/no/login"
echo ""

echo "✨ Verification complete!"
echo ""
echo "Next steps:"
echo "1. Verify Google Cloud Console config at: https://console.cloud.google.com/apis/credentials"
echo "2. Check Supabase Auth providers at: https://supabase.com/dashboard/project/$PROJECT_REF/auth/providers"
echo "3. Test login in incognito mode with third-party cookies enabled"
echo "4. Check Sentry for auth errors: https://sentry.io/ (filter by 'auth:google')"

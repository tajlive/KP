#!/bin/bash

# ============================================================================
# Environment Variables Validation Script
# Ensures all required secrets are present before deployment
# ============================================================================

set -e

echo "🔍 Validating Environment Variables..."
echo "========================================"

# Define required variables
REQUIRED_PROD_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

REQUIRED_DEPLOYMENT_VARS=(
  "VERCEL_TOKEN"
  "VERCEL_PROJECT_ID"
  "VERCEL_TEAM_ID"
)

OPTIONAL_VARS=(
  "SENTRY_DSN"
  "SENTRY_AUTH_TOKEN"
  "KV_REST_API_URL"
  "KV_REST_API_TOKEN"
)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MISSING_REQUIRED=0
MISSING_OPTIONAL=0

# Check required production variables
echo ""
echo "📋 Required Production Variables:"
for var in "${REQUIRED_PROD_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ MISSING: $var${NC}"
    MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
  else
    # Show first 10 chars for verification
    value="${!var}"
    preview="${value:0:10}..."
    echo -e "${GREEN}✅ PRESENT: $var${NC} ($preview)"
  fi
done

# Check required deployment variables (only in CI)
if [ "$CI" = "true" ]; then
  echo ""
  echo "📋 Required Deployment Variables:"
  for var in "${REQUIRED_DEPLOYMENT_VARS[@]}"; do
    if [ -z "${!var}" ]; then
      echo -e "${RED}❌ MISSING: $var${NC}"
      MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
    else
      echo -e "${GREEN}✅ PRESENT: $var${NC}"
    fi
  done
fi

# Check optional variables
echo ""
echo "📋 Optional Variables:"
for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠️  NOT SET: $var (optional)${NC}"
    MISSING_OPTIONAL=$((MISSING_OPTIONAL + 1))
  else
    echo -e "${GREEN}✅ PRESENT: $var${NC}"
  fi
done

# Summary
echo ""
echo "========================================"
if [ $MISSING_REQUIRED -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo "Missing $MISSING_REQUIRED required variable(s)"
  exit 1
else
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  echo "All required variables present"
  if [ $MISSING_OPTIONAL -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $MISSING_OPTIONAL optional variable(s) not set${NC}"
  fi
  exit 0
fi

#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  KLARPAKKE FULL FUNNEL TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0
WARNINGS=0

# Test 1: Build
echo "Test 1: Production Build"
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed"
  ERRORS=$((ERRORS + 1))
fi

# Test 2: TypeScript
echo "Test 2: TypeScript Check"
if npm run type-check > /dev/null 2>&1; then
  echo "  ✅ No TypeScript errors"
else
  echo "  ❌ TypeScript errors detected"
  ERRORS=$((ERRORS + 1))
fi

# Test 3: Critical Files
echo "Test 3: Critical Files Exist"
REQUIRED_FILES=(
  "src/components/landing/HeroSection.tsx"
  "src/components/landing/CountdownTimer.tsx"
  "src/components/landing/ExitIntentPopup.tsx"
  "src/components/landing/PricingSection.tsx"
  "src/components/landing/SocialProofSection.tsx"
  "src/components/landing/ComparisonSection.tsx"
  "src/components/landing/FAQSection.tsx"
  "src/components/landing/FinalCTASection.tsx"
  "src/app/[locale]/page.tsx"
  "src/app/[locale]/checkout/page.tsx"
  "src/app/[locale]/checkout/success/page.tsx"
  "src/app/api/stripe/checkout/route.ts"
  "src/app/api/stripe/verify-session/route.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "╔═══════════════════════════════════════════╗"
  echo "║  ✅ ALL CRITICAL TESTS PASSED            ║"
  echo "║                                           ║"
  echo "║  Ready to deploy to production!          ║"
  echo "╚═══════════════════════════════════════════╝"
  exit 0
else
  echo "╔═══════════════════════════════════════════╗"
  echo "║  ❌ $ERRORS CRITICAL ERRORS DETECTED       ║"
  echo "║                                           ║"
  echo "║  FIX ERRORS BEFORE DEPLOYING              ║"
  echo "╚═══════════════════════════════════════════╝"
  exit 1
fi

#!/bin/bash

echo "🔍 KLARPAKKE CONVERSION VERIFICATION"
echo "===================================="

ERRORS=0

# Test 1: Build succeeds
echo "✓ Test 1: Production build"
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed"
  ERRORS=$((ERRORS + 1))
fi

# Test 2: TypeScript check
echo "✓ Test 2: TypeScript"
if npm run type-check > /dev/null 2>&1; then
  echo "  ✅ No TypeScript errors"
else
  echo "  ❌ TypeScript errors found"
  ERRORS=$((ERRORS + 1))
fi

# Test 3: Critical files exist
echo "✓ Test 3: Critical files"
FILES=(
  "src/components/landing/HeroSection.tsx"
  "src/components/landing/CountdownTimer.tsx"
  "src/components/landing/ExitIntentPopup.tsx"
  "src/components/landing/PricingSection.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "╔═══════════════════════════════════════════╗"
  echo "║  ✅ ALL TESTS PASSED                     ║"
  echo "║  Ready to deploy!                        ║"
  echo "╚═══════════════════════════════════════════╝"
  exit 0
else
  echo "╔═══════════════════════════════════════════╗"
  echo "║  ❌ $ERRORS TESTS FAILED                  ║"
  echo "║  Fix errors before deploying             ║"
  echo "╚═══════════════════════════════════════════╝"
  exit 1
fi

#!/bin/bash
echo "🔍 Verifying Phase 2 Completion..."

ERRORS=0

# Check files exist
FILES=(
  "data/starter-courses.sql"
  "src/app/[locale]/courses/[slug]/page.tsx"
  "src/lib/stripe/config.ts"
  "src/app/api/stripe/checkout/route.ts"
  "src/app/api/stripe/webhook/route.ts"
  "src/components/onboarding/WelcomeModal.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check TypeScript
echo "🔍 Checking TypeScript..."
if npm run type-check > /dev/null 2>&1; then
  echo "  ✅ No TypeScript errors"
else
  echo "  ❌ TypeScript errors found"
  ERRORS=$((ERRORS + 1))
fi

# Check build
echo "🔍 Building..."
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo ""
  echo "╔═══════════════════════════════════════════════╗"
  echo "║  ✅ PHASE 2 VERIFICATION PASSED              ║"
  echo "║  System ready for beta testing               ║"
  echo "╚═══════════════════════════════════════════════╝"
  exit 0
else
  echo ""
  echo "╔═══════════════════════════════════════════════╗"
  echo "║  ❌ $ERRORS CHECKS FAILED                     ║"
  echo "║  Review errors above                         ║"
  echo "╚═══════════════════════════════════════════════╝"
  exit 1
fi

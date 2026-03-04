#!/bin/bash
# Test mobile-first design

echo "📱 Tester mobile layout..."

# 1. Sjekk at viewport er satt
grep -r "viewport" src/app/layout.tsx

# 2. Sjekk at breakpoints brukes konsistent
echo ""
echo "Komponenter uten responsive klasser:"
grep -r "className" src/components/ | \
  grep -v "sm:\|md:\|lg:\|xl:" | \
  grep "className=\"[^\"]*w-\|h-\|text-\|p-\|m-" | \
  head -10

# 3. Test touch targets (skal være 44px+)
echo ""
echo "Sjekker touch targets..."
grep -r "w-10\|w-12\|w-14\|w-16" src/components/ | grep "button\|Button"

echo ""
echo "✅ Mobile test fullført"

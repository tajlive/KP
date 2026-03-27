#!/bin/bash
# file: scripts/pre-flight-check.sh

set -e

echo "🔍 PRE-FLIGHT CHECK — Klarpakke"
echo "=================================="

# 1. Node version (sjekk mot .nvmrc)
echo "✓ Node version:"
REQUIRED_NODE=$(cat .nvmrc 2>/dev/null || echo "24")
CURRENT_NODE=$(node --version | cut -d'.' -f1 | sed 's/v//')

if [ "$CURRENT_NODE" != "$REQUIRED_NODE" ]; then
  echo "  ❌ Error: Node $REQUIRED_NODE.x required. Current: $(node --version)"
  echo "     Run: nvm use"
  exit 1
fi
echo "  ✅ $(node --version)"

# 2. Project structure
echo -e "\n✓ Project structure:"
test -d "src/app" && echo "  ✅ src/app/" || (echo "  ❌ src/app/ MISSING" && exit 1)
test -f "package.json" && echo "  ✅ package.json" || (echo "  ❌ package.json MISSING" && exit 1)

# 3. Dependencies
echo -e "\n✓ Critical dependencies:"
npm list next > /dev/null 2>&1 && echo "  ✅ next" || echo "  ❌ next NOT INSTALLED"
npm list react > /dev/null 2>&1 && echo "  ✅ react" || echo "  ❌ react NOT INSTALLED"
npm list tailwindcss > /dev/null 2>&1 && echo "  ✅ tailwindcss" || echo "  ❌ tailwindcss NOT INSTALLED"

# 4. Git status
echo -e "\n✓ Git status:"
if git status --porcelain | grep -q "^??"; then
  echo "  ⚠️  Untracked files present"
fi
echo "  ✅ On branch $(git branch --show-current)"

# 5. Environment
echo -e "\n✓ Environment variables:"
test -f ".env.local" && echo "  ✅ .env.local exists" || echo "  ⚠️  .env.local missing (non-critical)"

echo -e "\n✅ PRE-FLIGHT CHECK PASSED"
echo "Ready to proceed"

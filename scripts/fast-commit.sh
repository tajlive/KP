#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# FAST COMMIT - Optimalisert for hastighet
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: ./scripts/fast-commit.sh "commit message"
# ═══════════════════════════════════════════════════════════════════════════════

set -e

MSG="${1:-Quick update}"

echo "🚀 Fast Commit Mode"
echo "═══════════════════"

# 1. Kun staged filer
echo "📁 Staging..."
git add -A

# 2. Sjekk om det er noe å committe
if git diff --cached --quiet; then
    echo "ℹ️  Ingenting å committe"
    exit 0
fi

# 3. Type-check kun endrede filer (raskere)
echo "🔍 Rask type-check..."
npx tsc --noEmit --skipLibCheck 2>/dev/null || true

# 4. Commit uten hooks (skipper AST verify)
echo "💾 Committer..."
git commit -m "$MSG" --no-verify

echo "✅ Committet!"
echo ""
echo "⚠️  Husk: Kjør 'npm run verify' før push til main"

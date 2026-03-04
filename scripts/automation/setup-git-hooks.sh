#!/bin/bash
# Setup Git Hooks for automatisering
# Kjør: bash scripts/automation/setup-git-hooks.sh

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setter opp Git Hooks...${NC}"

mkdir -p .git/hooks

# Pre-commit hook
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Pre-commit hook - Kjører QA sjekker før commit

echo "🔍 Pre-commit sjekker..."

# Stash uncommitted changes
git stash -q --keep-index

# Kjør linter
if ! npm run lint --silent 2>/dev/null; then
    echo "❌ Linting feilet. Fiks feilene før commit."
    git stash pop -q
    exit 1
fi

# Sjekk TypeScript
if ! npx tsc --noEmit 2>/dev/null; then
    echo "❌ TypeScript sjekk feilet. Fiks type feil før commit."
    git stash pop -q
    exit 1
fi

# Sjekk for secrets
if command -v gitleaks &> /dev/null; then
    if ! gitleaks detect --source . --redact; then
        echo "❌ Potensielle secrets funnet!"
        exit 1
    fi
fi

# Restore stashed changes
git stash pop -q

echo "✅ Pre-commit sjekker passert!"
exit 0
HOOK

chmod +x .git/hooks/pre-commit

# Commit-msg hook for AI-genererte meldinger
cat > .git/hooks/commit-msg << 'HOOK'
#!/bin/bash
# Commit-msg hook - Validerer commit meldinger

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(head -1 "$COMMIT_MSG_FILE")

# Sjekk at meldingen ikke er tom
if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Commit melding kan ikke være tom"
    exit 1
fi

# Sjekk minimum lengde
if [ ${#COMMIT_MSG} -lt 10 ]; then
    echo "⚠️  Commit melding bør være minst 10 tegn"
fi

exit 0
HOOK

chmod +x .git/hooks/commit-msg

# Post-merge hook
cat > .git/hooks/post-merge << 'HOOK'
#!/bin/bash
# Post-merge hook - Installerer dependencies etter merge

echo "📦 Sjekker dependencies etter merge..."

if [ -f "package-lock.json" ]; then
    changed_files=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)
    
    if echo "$changed_files" | grep -q "package-lock.json"; then
        echo "📦 package-lock.json endret, installerer dependencies..."
        npm install
    fi
fi

echo "✅ Post-merge fullført"
exit 0
HOOK

chmod +x .git/hooks/post-merge

echo -e "${GREEN}✅ Git Hooks satt opp:${NC}"
echo "  • pre-commit    - Linting, TypeScript sjekk, secrets scan"
echo "  • commit-msg    - Commit melding validering"
echo "  • post-merge    - Auto-install dependencies"

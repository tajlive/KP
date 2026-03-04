#!/bin/bash
# Auto-generer Changelog fra Git commits
# Kjør: bash scripts/automation/generate-changelog.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHANGELOG_FILE="CHANGELOG.md"

echo -e "${BLUE}📝 Genererer Changelog...${NC}"
echo ""

# Hent siste tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
    echo "Ingen tags funnet. Genererer fra første commit..."
    COMMIT_RANGE=""
else
    echo "Siste tag: $LAST_TAG"
    COMMIT_RANGE="${LAST_TAG}..HEAD"
fi

# Generer changelog seksjon
DATE=$(date +%Y-%m-%d)

cat > /tmp/new_changelog.md << EOF
## [Unreleased] - ${DATE}

EOF

# Gruppere commits etter type
echo "### ✨ Features" >> /tmp/new_changelog.md
git log $COMMIT_RANGE --pretty=format:"- %s" --grep="^feat" 2>/dev/null | head -20 >> /tmp/new_changelog.md || echo "- Ingen nye features" >> /tmp/new_changelog.md
echo "" >> /tmp/new_changelog.md

echo "### 🐛 Bug Fixes" >> /tmp/new_changelog.md
git log $COMMIT_RANGE --pretty=format:"- %s" --grep="^fix" 2>/dev/null | head -20 >> /tmp/new_changelog.md || echo "- Ingen bug fixes" >> /tmp/new_changelog.md
echo "" >> /tmp/new_changelog.md

echo "### 📚 Documentation" >> /tmp/new_changelog.md
git log $COMMIT_RANGE --pretty=format:"- %s" --grep="^docs" 2>/dev/null | head -10 >> /tmp/new_changelog.md || echo "- Ingen dokumentasjonsendringer" >> /tmp/new_changelog.md
echo "" >> /tmp/new_changelog.md

echo "### 🔧 Maintenance" >> /tmp/new_changelog.md
git log $COMMIT_RANGE --pretty=format:"- %s" --grep="^chore\|^refactor\|^style" 2>/dev/null | head -10 >> /tmp/new_changelog.md || echo "- Ingen maintenance" >> /tmp/new_changelog.md
echo "" >> /tmp/new_changelog.md

# Merge med eksisterende changelog
if [ -f "$CHANGELOG_FILE" ]; then
    # Legg til etter første linje (tittelen)
    head -1 "$CHANGELOG_FILE" > /tmp/final_changelog.md
    echo "" >> /tmp/final_changelog.md
    cat /tmp/new_changelog.md >> /tmp/final_changelog.md
    tail -n +2 "$CHANGELOG_FILE" >> /tmp/final_changelog.md
    mv /tmp/final_changelog.md "$CHANGELOG_FILE"
else
    cat > "$CHANGELOG_FILE" << EOF
# Changelog

Alle merkbare endringer i dette prosjektet vil bli dokumentert i denne filen.

EOF
    cat /tmp/new_changelog.md >> "$CHANGELOG_FILE"
fi

echo -e "${GREEN}✅ Changelog oppdatert: $CHANGELOG_FILE${NC}"
echo ""
head -30 "$CHANGELOG_FILE"

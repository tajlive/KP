#!/bin/bash
# AI-generert Commit Melding
# Kjør: bash scripts/automation/ai-commit.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Sjekk for staged endringer
if git diff --cached --quiet; then
    echo "Ingen staged endringer. Kjør 'git add' først."
    exit 1
fi

# Hent endrede filer
FILES=$(git diff --cached --name-only | head -10)
FILE_COUNT=$(git diff --cached --name-only | wc -l)

# Hent diff stats
STATS=$(git diff --cached --stat | tail -1)

echo -e "${BLUE}🤖 Genererer commit melding...${NC}"
echo ""

# Analyser endringer
TYPES=""

if git diff --cached --name-only | grep -q "\.test\.\|\.spec\."; then
    TYPES="test"
elif git diff --cached --name-only | grep -q "package\.json\|package-lock"; then
    TYPES="chore(deps)"
elif git diff --cached --name-only | grep -q "\.md$"; then
    TYPES="docs"
elif git diff --cached | grep -q "^\+.*feat\|^\+.*feature"; then
    TYPES="feat"
elif git diff --cached | grep -q "^\+.*fix\|^\+.*bugfix"; then
    TYPES="fix"
else
    TYPES="chore"
fi

# Generer beskrivelse basert på filer
if echo "$FILES" | grep -q "\.tsx\|\.ts"; then
    DESC="update TypeScript components"
elif echo "$FILES" | grep -q "\.css\|\.scss"; then
    DESC="update styles"
elif echo "$FILES" | grep -q "\.sql"; then
    DESC="update database schema"
else
    DESC="make improvements"
fi

# Spesifikk for trading system
if echo "$FILES" | grep -q "trading"; then
    DESC="update trading system"
fi

# Hovedcommit melding
COMMIT_MSG="${TYPES}: ${DESC}"

echo -e "${GREEN}Generert commit melding:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$COMMIT_MSG"
echo ""
echo "Files: $FILE_COUNT changed"
echo "Stats: $STATS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Spør om bekreftelse
read -p "Bruk denne meldingen? (y/n/e for edit) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ Committed!${NC}"
elif [[ $REPLY =~ ^[Ee]$ ]]; then
    # Lagre til temp fil
    echo "$COMMIT_MSG" > /tmp/commit_msg.txt
    ${EDITOR:-nano} /tmp/commit_msg.txt
    FINAL_MSG=$(cat /tmp/commit_msg.txt)
    git commit -m "$FINAL_MSG"
    echo -e "${GREEN}✅ Committed!${NC}"
else
    echo "Avbrutt"
    exit 0
fi

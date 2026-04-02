#!/bin/bash
# KLA-PROFIT1: Manuell Merge-Gate (uten branch protection)
# Bruk: bash scripts/manual-merge-gate.sh

set -e

REPO="tajlive/KP"
BRANCH="feat/ai-profit-max"

echo "=========================================="
echo "KLA-PROFIT1: Manuell Merge-Gate"
echo "=========================================="
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_TOTAL=6

function check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌${NC} $2"
    fi
}

echo "Denne scriptet verifiserer at KLA-PROFIT1 er klar for merge"
echo "uten automatisk branch protection (manuell prosess)."
echo ""

# 1. Sjekk at vi er på riktig branch
echo "1. Sjekker branch..."
current_branch=$(git branch --show-current)
if [ "$current_branch" = "$BRANCH" ]; then
    check_status 0 "På branch: $BRANCH"
else
    check_status 1 "Feil branch: $current_branch (forventet: $BRANCH)"
    echo "   Bytt branch: git checkout $BRANCH"
fi

# 2. Sjekk at det finnes en PR
echo ""
echo "2. Sjekker PR..."
PR_EXISTS=$(gh pr list --head "$BRANCH" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
if [ -n "$PR_EXISTS" ]; then
    check_status 0 "PR #$PR_EXISTS funnet"
    
    # Hent PR info
    PR_STATUS=$(gh pr view "$PR_EXISTS" --json state,mergeStateStatus,statusCheckRollup 2>/dev/null || echo '{}')
    
    # Sjekk om det er konflikter
    if echo "$PR_STATUS" | grep -q "CONFLICTING"; then
        echo -e "${RED}⚠️  MERK:${NC} PR har merge-konflikter!"
    fi
else
    check_status 1 "Ingen åpen PR funnet"
    echo "   Opprett PR: gh pr create --base main --head $BRANCH"
fi

# 3. Sjekk uncommitted changes
echo ""
echo "3. Sjekker for uncommitted changes..."
if git diff-index --quiet HEAD -- 2>/dev/null; then
    check_status 0 "Ingen uncommitted changes"
else
    check_status 1 "Uncommitted changes funnet"
    echo "   Commit eller stash endringer først"
fi

# 4. Sjekk at lokale tester passerer
echo ""
echo "4. Kjører lokale tester..."
read -p "   Kjør 'npm run check:merge-ready'? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npm run check:merge-ready; then
        check_status 0 "Lokal merge-check bestått"
    else
        check_status 1 "Lokal merge-check feilet"
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Hoppet over lokal test (manuell verifisering påkrevd)"
fi

# 5. Sjekk PR status i GitHub
echo ""
echo "5. Sjekker PR status i GitHub..."
if [ -n "$PR_EXISTS" ]; then
    echo "   PR: https://github.com/$REPO/pull/$PR_EXISTS"
    
    # Åpne PR i nettleser
    read -p "   Åpne PR i nettleser for å verifisere checks? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gh pr view "$PR_EXISTS" --web
    fi
    
    # Manuell verifisering
    echo ""
    read -p "   Er alle 5 checks grønne i PR? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        check_status 0 "GitHub checks verifisert grønne"
    else
        check_status 1 "GitHub checks ikke grønne"
    fi
    
    # Sjekk review
    echo ""
    read -p "   Har PR fått approval fra reviewer? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        check_status 0 "Approval verifisert"
    else
        check_status 1 "Mangler approval"
    fi
else
    check_status 0 "Hopper over (ingen PR)"
fi

# 6. Sjekk secrets
echo ""
echo "6. Sjekker GitHub Secrets..."
read -p "   Kjør secrets-verifisering? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash scripts/verify-kla-profit1-secrets.sh
fi

echo ""
echo "=========================================="
echo "Oppsummering"
echo "=========================================="
echo ""
echo "$CHECKS_PASSED / $CHECKS_TOTAL sjekker bestått"
echo ""

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "${GREEN}✅ Alle sjekker bestått!${NC}"
    echo ""
    echo "Klar for merge (manuell prosess):"
    echo "  1. Gå til: https://github.com/$REPO/pull/$PR_EXISTS"
    echo "  2. Klikk 'Merge pull request'"
    echo "  3. Velg 'Squash and merge'"
    echo "  4. Bekreft merge"
    echo ""
    read -p "Vil du merge nå? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -n "$PR_EXISTS" ]; then
            gh pr merge "$PR_EXISTS" --squash --delete-branch
            echo -e "${GREEN}✅ Merged!${NC}"
        else
            echo "Ingen PR å merge"
        fi
    fi
else
    echo -e "${RED}❌ Noen sjekker feilet${NC}"
    echo ""
    echo "Rett feilene før merge:"
    echo "  - Sjekk logs ovenfor"
    echo "  - Verifiser i GitHub UI: https://github.com/$REPO/pulls"
fi

echo ""

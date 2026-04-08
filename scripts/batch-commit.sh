#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# BATCH COMMIT - Samle flere endringer i én commit
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: ./scripts/batch-commit.sh
# ═══════════════════════════════════════════════════════════════════════════════

echo "📦 Batch Commit Mode"
echo "════════════════════"

# Samle alle endringer
git add -A

# Hvis ingen endringer, avbryt
if git diff --cached --quiet; then
    echo "ℹ️  Ingenting å committe"
    exit 0
fi

# Generer automatisk commit message
FEATURES=$(git diff --cached --name-only | grep -E "^src/(lib|components|features)" | head -3 | tr '\n' ' ')
DOCS=$(git diff --cached --name-only | grep -E "^\.knowledge|^docs" | head -3 | tr '\n' ' ')
SCRIPTS=$(git diff --cached --name-only | grep -E "^scripts" | head -3 | tr '\n' ' ')

MSG="batch:"
[ -n "$FEATURES" ] && MSG="$MSG feat updates"
[ -n "$DOCS" ] && MSG="$MSG docs updates"
[ -n "$SCRIPTS" ] && MSG="$MSG scripts"

echo "💾 Committer: $MSG"
git commit -m "$MSG" --no-verify

echo "✅ Batch-committet!"

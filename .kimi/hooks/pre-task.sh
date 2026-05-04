#!/bin/bash
# Pre-Task Hook for KIMI
# Kjøres før hver KIMI-oppgave for å hente kontekst

echo "🏛️ KIMI Pre-Task Hook"
echo "======================"
echo ""

# 1. Sjekk git status
echo "📊 Git Status:"
if git diff --quiet HEAD; then
    echo "  ✅ Working directory clean"
else
    echo "  ⚠️  Uncommitted changes detected"
    git status --short | head -5
fi
echo ""

# 2. Hent siste diary entries
echo "📖 Recent Activity:"
if [ -f ".kimi/diary.jsonl" ]; then
    tail -3 .kimi/diary.jsonl | while read line; do
        # Parse JSONL: extract type, task, status
        TYPE=$(echo "$line" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
        TASK=$(echo "$line" | grep -o '"task":"[^"]*"' | cut -d'"' -f4)
        STATUS=$(echo "$line" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "  [$TYPE] $TASK — $STATUS"
    done
else
    echo "  No diary entries"
fi
echo ""

# 3. Prediker kontekst
echo "🔮 Context Prediction:"
if [ -f ".kimi/context-predictor.sh" ]; then
    .kimi/context-predictor.sh
fi
echo ""

echo "✅ Pre-task hook complete"

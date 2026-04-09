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
if [ -f ".kimi/diary.log" ]; then
    tail -3 .kimi/diary.log | while read line; do
        echo "  $line"
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

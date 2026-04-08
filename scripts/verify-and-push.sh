#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY & PUSH - Full sjekk før push
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: ./scripts/verify-and-push.sh
# ═══════════════════════════════════════════════════════════════════════════════

echo "🔒 Verify & Push"
echo "════════════════"

# 1. Full verify
echo "🔍 Kjører full verify..."
npm run type-check
npm run lint

# 2. Hvis alt OK, push
echo "📤 Pusher til origin..."
git push origin main

echo "✅ Pushed!"

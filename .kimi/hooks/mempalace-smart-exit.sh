#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 MEMPALACE SMART EXIT — v2.0 (2026-05-04)
# SessionEnd-hook som:
#   1. MemPalace flush
#   2. Self-improve analyse (kimi-self-improve)
#   3. Git-diff-analyse + verify-anbefalinger
#   4. Session-summary til .kimi/session-summaries/
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

KP_DIR="/Users/taj/klarpakke"
SUMMARY_DIR="$KP_DIR/.kimi/session-summaries"
mkdir -p "$SUMMARY_DIR"

# ─── 1. MEMPALACE FLUSH ───
if [ -f "$KP_DIR/scripts/mempalace-exit-flush.mjs" ]; then
  MEMPALACE_FLUSH_SOURCE="smart-exit" \
    node "$KP_DIR/scripts/mempalace-exit-flush.mjs" 2>/dev/null || true
fi

# ─── 2. SELF-IMPROVE ANALYSE ───
echo ""
echo "🧠 [Smart Exit v2.0] Kjører self-improve analyse..."
if command -v node &> /dev/null && [ -f "$KP_DIR/scripts/kimi-self-improve.mjs" ]; then
  node "$KP_DIR/scripts/kimi-self-improve.mjs" 2>&1 || true
fi

# ─── 3. GIT-DIFF ANALYSE ───
cd "$KP_DIR" || exit 0

FILE_COUNT=0
LINE_COUNT=0
CHANGED_FILES=""

if git rev-parse --git-dir >/dev/null 2>&1; then
  CHANGED_FILES="$(git diff --name-only 2>/dev/null | tr '\n' ' ' || true)"
  FILE_COUNT="$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ' || echo 0)"
  LINE_COUNT="$(git diff --numstat 2>/dev/null | awk '{sum+=$1+$2} END {print sum+0}' || echo 0)"
fi

# ─── 4. SESSION-SUMMARY ───
if [ "$FILE_COUNT" -gt 0 ]; then
  TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
  SUMMARY_FILE="$SUMMARY_DIR/session-$TIMESTAMP.md"

  cat > "$SUMMARY_FILE" <<EOF
# Session Summary — $TIMESTAMP

- **Filer endret:** $FILE_COUNT
- **Linjer endret:** $LINE_COUNT
- **Filer:** $CHANGED_FILES

## Anbefalinger
EOF

  if [ "$FILE_COUNT" -gt 3 ] || [ "$LINE_COUNT" -gt 50 ]; then
    cat >> "$SUMMARY_FILE" <<EOF
- [ ] Kjør: \`node scripts/verify/verify-claims.mjs\`
- [ ] Kjør: \`node scripts/verify/check-stale-types.mjs\`
EOF
  fi

  if [ "$FILE_COUNT" -gt 5 ] || [ "$LINE_COUNT" -gt 100 ]; then
    cat >> "$SUMMARY_FILE" <<EOF
- [ ] Kjør: \`npm run swarm:review\`
EOF
  fi

  cat >> "$SUMMARY_FILE" <<EOF
- [ ] Kjør: \`npm run lint && npm run type-check\`
- [ ] Kjør: \`npm run test:unit\` (hvis logikk endret)
- [ ] Kjør: \`node scripts/kimi-self-improve.mjs\` (hvis du ikke så output over)

## Neste steg
1. Review endringer: \`git diff\`
2. Stage: \`git add -A\`
3. Commit: \`git commit -m "type: beskrivelse"\`
EOF

  # Skriv til stderr så brukeren ser det ved exit
  echo ""
  echo "🤖 [Smart Exit v2.0] $FILE_COUNT filer ($LINE_COUNT linjer) endret."
  echo "   📄 Summary: $SUMMARY_FILE"
  if [ "$FILE_COUNT" -gt 5 ] || [ "$LINE_COUNT" -gt 100 ]; then
    echo "   🐝 Anbefalt: npm run swarm:review"
  elif [ "$FILE_COUNT" -gt 3 ] || [ "$LINE_COUNT" -gt 50 ]; then
    echo "   ✅ Anbefalt: node scripts/verify/verify-claims.mjs"
  fi
  echo ""
fi

# Alltid returner 0 — exit-hook skal aldri blokkere
exit 0

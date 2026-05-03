#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 KIMI SMART AUTOSTART — v5.0 (2026-05-01) — Optimalisert
# Parallell kjøring, kompakt modus, minst mulig støy.
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

KP_DIR="/Users/taj/klarpakke"
cd "$KP_DIR"

# ─── KOMPAKT MODUS ───
# Sett KIMI_COMPACT=1 før kjøring for å suppress verbose output:
#   KIMI_COMPACT=1 kimi
COMPACT="${KIMI_COMPACT:-0}"
FAST_FLAGS=""
[ "$COMPACT" = "1" ] && FAST_FLAGS="--fast"

# ─── PARALLELL KJØRING AV SMART START + AGENT-FORSLAG ───
SMART_OUT="$(mktemp)"
AGENT_OUT="$(mktemp)"

if [ -x "$HOME/.kimi/bin/kimi-smart-start" ]; then
  "$HOME/.kimi/bin/kimi-smart-start" $FAST_FLAGS >"$SMART_OUT" 2>/dev/null || true
fi &

if [ -x "$HOME/.kimi/bin/kimi-suggest-agent" ]; then
  "$HOME/.kimi/bin/kimi-suggest-agent" $FAST_FLAGS >"$AGENT_OUT" 2>/dev/null || true
fi &

wait

# ─── OUTPUT ───
[ -s "$SMART_OUT" ] && cat "$SMART_OUT"
[ -s "$AGENT_OUT" ] && cat "$AGENT_OUT"

rm -f "$SMART_OUT" "$AGENT_OUT"

# ─── RASK STATUS (kun i normal modus) ───
if [ "$COMPACT" != "1" ]; then
  echo ""
  echo "🚀 KIMI klar! MCP: $(grep -c '"command"' "$HOME/.kimi/mcp.json" 2>/dev/null || echo "?") servere"
  echo ""
fi

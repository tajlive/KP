#!/bin/bash
# 🧪 MemPalace Flow Test — v3.2.0
# Verifiserer session-start, exit-flush, idempotens, og degraded mode.

KP_DIR="/Users/taj/klarpakke"
SESSION_FILE="/tmp/kimi_session.json"
LOG_PATH="$KP_DIR/.kimi/logs/mempalace.jsonl"
KG_PATH="$KP_DIR/.mempalace/kg.json"
DIARY_PATH="$KP_DIR/.kimi/diary.jsonl"
PASS=0
FAIL=0

function banner() {
  echo ""
  echo "══════════════════════════════════════════"
  echo "  $1"
  echo "══════════════════════════════════════════"
}

function pass() {
  echo "  ✅ PASS — $1"
  ((PASS++))
}

function fail() {
  echo "  ❌ FAIL — $1"
  ((FAIL++))
}

# Rens gammel state
rm -f "$SESSION_FILE"
rm -f /tmp/kimi_flush_done_*

banner "Test 1 — Startup (session-start)"
node "$KP_DIR/scripts/mempalace-session-start.mjs"
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SESSION_FILE','utf8')).session_id)")
  if [ -n "$SESSION_ID" ]; then
    pass "Session file created with valid session_id"
  else
    fail "Session file missing session_id"
  fi
else
  fail "Session file not created"
fi

banner "Test 2 — Exit Flush (first run)"
# Touch filene så de er nyere enn session-start (ellers blir status=failed)
touch "$KG_PATH" "$DIARY_PATH"
LOG_LINES_BEFORE=$(wc -l < "$LOG_PATH" | tr -d ' ')
node "$KP_DIR/scripts/mempalace-exit-flush.mjs" || true
EXIT_CODE=$?
LOG_LINES_AFTER=$(wc -l < "$LOG_PATH" | tr -d ' ')

# Hent exit-kode på nytt (siden || true maskerer den)
# Vi kjører på nytt for å få korrekt exit-kode
touch "$KG_PATH" "$DIARY_PATH"
rm -f /tmp/kimi_flush_done_*
node "$KP_DIR/scripts/mempalace-exit-flush.mjs"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  pass "Exit code 0"
else
  fail "Exit code $EXIT_CODE, expected 0"
fi

if [ "$LOG_LINES_AFTER" -gt "$LOG_LINES_BEFORE" ]; then
  pass "Log appended ($LOG_LINES_BEFORE → $LOG_LINES_AFTER lines)"
else
  fail "Log not appended"
fi

if [ -f "$SESSION_FILE" ]; then
  pass "Session file preserved (exit-flush leser men sletter ikke session.json)"
else
  fail "Session file unexpectedly removed"
fi

banner "Test 3 — Idempotens (double flush)"
LOG_LINES_BEFORE=$(wc -l < "$LOG_PATH" | tr -d ' ')
node "$KP_DIR/scripts/mempalace-exit-flush.mjs"
EXIT_CODE=$?
LOG_LINES_AFTER=$(wc -l < "$LOG_PATH" | tr -d ' ')

if [ $EXIT_CODE -eq 0 ]; then
  pass "Second flush exit code 0"
else
  fail "Second flush exit code $EXIT_CODE, expected 0"
fi

if [ "$LOG_LINES_AFTER" -gt "$LOG_LINES_BEFORE" ]; then
  LAST_LINE=$(tail -1 "$LOG_PATH")
  if echo "$LAST_LINE" | grep -q '"idempotent_skip":true'; then
    pass "Second flush logged idempotent_skip=true"
  else
    fail "Second flush did not log idempotent_skip"
  fi
else
  fail "Second flush did not append log"
fi

banner "Test 4 — No session file (degraded mode)"
rm -f "$SESSION_FILE"
rm -f /tmp/kimi_flush_done_*
LOG_LINES_BEFORE=$(wc -l < "$LOG_PATH" | tr -d ' ')
node "$KP_DIR/scripts/mempalace-exit-flush.mjs"
EXIT_CODE=$?
LOG_LINES_AFTER=$(wc -l < "$LOG_PATH" | tr -d ' ')

if [ $EXIT_CODE -eq 2 ]; then
  pass "Exit code 2 (degraded)"
else
  fail "Exit code $EXIT_CODE, expected 2"
fi

if [ "$LOG_LINES_AFTER" -gt "$LOG_LINES_BEFORE" ]; then
  LAST_LINE=$(tail -1 "$LOG_PATH")
  if echo "$LAST_LINE" | grep -q '"status":"degraded"'; then
    pass "Degraded mode logged status=degraded"
  else
    fail "Degraded mode did not log status=degraded"
  fi
else
  fail "Degraded mode did not append log"
fi

# Rens test-state
rm -f "$SESSION_FILE"
rm -f /tmp/kimi_flush_done_*

banner "RESULTAT"
echo "  ✅ PASS: $PASS"
echo "  ❌ FAIL: $FAIL"
if [ $FAIL -eq 0 ]; then
  echo ""
  echo "  🎉 Alle tester bestått!"
  exit 0
else
  echo ""
  echo "  ⚠️  $FAIL test(er) feilet."
  exit 1
fi

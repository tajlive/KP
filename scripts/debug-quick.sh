#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  KLARPAKKE QUICK CURL DEBUG — kjøres på 10 sekunder                    ║
# ║  Bruk: bash scripts/debug-quick.sh [prod|local]                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -euo pipefail

MODE=${1:-prod}
if [ "$MODE" = "local" ]; then
  BASE="http://localhost:3000"
else
  BASE="https://www.klarpakke.no"
fi

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}${BOLD}✅ BEVIS-$1${NC} $2"; }
fail() { echo -e "  ${RED}${BOLD}❌ FEIL-$1${NC} $2"; }
info() { echo -e "  ${BLUE}ℹ  $1${NC}"; }

echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}  KLARPAKKE QUICK CURL DEBUG — $BASE${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"

# ── TEST 1: Health check ──────────────────────────────────────────────────
echo -e "\n${BOLD}1. Health check${NC}"
HEALTH=$(curl -sf --max-time 5 "$BASE/api/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  pass "1-HEALTH" "/api/health returnerer ok"
else
  fail "1-HEALTH" "/api/health feilet: $HEALTH"
fi

# ── TEST 2: Callback uten code → 302 med error=no_code ───────────────────
echo -e "\n${BOLD}2. Callback uten code${NC}"
CB=$(curl -si --max-redirs 0 --max-time 5 "$BASE/no/auth/callback" 2>/dev/null)
CB_STATUS=$(echo "$CB" | grep '^HTTP/' | tail -1 | awk '{print $2}')
CB_LOC=$(echo "$CB" | grep -i '^location:' | awk '{print $2}' | tr -d '\r')
info "Status: $CB_STATUS | Location: $CB_LOC"
if [ "$CB_STATUS" = "302" ]; then
  if echo "$CB_LOC" | grep -q 'error=no_code'; then
    pass "2-CALLBACK" "Callback gir 302 med error=no_code ✓"
  else
    fail "2-CALLBACK" "Callback gir 302 men feil location: $CB_LOC"
  fi
else
  fail "2-CALLBACK" "Callback gir $CB_STATUS (forventet 302)"
fi

# ── TEST 3: Ingen 0.0.0.0 i location ─────────────────────────────────────
echo -e "\n${BOLD}3. FIX 7 — Cloud Run origin${NC}"
if echo "$CB_LOC" | grep -q '0.0.0.0'; then
  fail "3-ORIGIN" "FIX 7 FEILET: location inneholder 0.0.0.0! → $CB_LOC"
elif echo "$CB_LOC" | grep -q 'klarpakke.no'; then
  pass "3-ORIGIN" "FIX 7 OK: location peker til klarpakke.no"
else
  info "Location: $CB_LOC"
fi

# ── TEST 4: URL-dobling ───────────────────────────────────────────────────
echo -e "\n${BOLD}4. FIX 8 — URL-dobling (next= full URL)${NC}"
DOUBLE_URL="$BASE/no/auth/callback?next=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://www.klarpakke.no/no/innlogging'))" 2>/dev/null || echo "https%3A%2F%2Fwww.klarpakke.no%2Fno%2Finnlogging")"
DOUBLE_R=$(curl -si --max-redirs 0 --max-time 5 "$DOUBLE_URL" 2>/dev/null)
DOUBLE_LOC=$(echo "$DOUBLE_R" | grep -i '^location:' | awk '{print $2}' | tr -d '\r')
info "Double URL test location: $DOUBLE_LOC"
if echo "$DOUBLE_LOC" | grep -q 'innlogginghttps'; then
  fail "4-DOUBLING" "URL-dobling oppdaget! → $DOUBLE_LOC"
else
  pass "4-DOUBLING" "Ingen URL-dobling ✓"
fi

# ── TEST 5: Open redirect blokkert ───────────────────────────────────────
echo -e "\n${BOLD}5. FIX 8 — Open redirect blokker${NC}"
EVIL_URL="$BASE/no/auth/callback?next=$(python3 -c "import urllib.parse; print(urllib.parse.quote('//evil.com/steal'))" 2>/dev/null || echo "%2F%2Fevil.com%2Fsteal")"
EVIL_R=$(curl -si --max-redirs 0 --max-time 5 "$EVIL_URL" 2>/dev/null)
EVIL_LOC=$(echo "$EVIL_R" | grep -i '^location:' | awk '{print $2}' | tr -d '\r')
if echo "$EVIL_LOC" | grep -q 'evil.com'; then
  fail "5-OPENREDIRECT" "Open redirect IKKE blokkert! → $EVIL_LOC"
else
  pass "5-OPENREDIRECT" "Open redirect blokkert ✓ ($EVIL_LOC)"
fi

# ── TEST 6: Loop-detektor ─────────────────────────────────────────────────
echo -e "\n${BOLD}6. Redirect-loop detektor${NC}"
LOOP_RESULT=$(curl -so /dev/null -w "%{num_redirects}|%{url_effective}" --max-redirs 10 -L --max-time 10 "$BASE/no/innlogging?error=exchange_failed" 2>/dev/null)
LOOP_HOPS=$(echo "$LOOP_RESULT" | cut -d'|' -f1)
LOOP_FINAL=$(echo "$LOOP_RESULT" | cut -d'|' -f2)
info "$LOOP_HOPS redirects → $LOOP_FINAL"
if [ "${LOOP_HOPS:-99}" -ge 8 ]; then
  fail "6-LOOP" "LOOP OPPDAGET: $LOOP_HOPS redirects!"
else
  pass "6-LOOP" "Ingen loop: $LOOP_HOPS redirects → ferdig på $LOOP_FINAL"
fi

# ── TEST 7: Tredjeparts analytics-skript ─────────────────────
echo -e "\n${BOLD}7. Tredjeparts analytics-skript${NC}"
CF_STATUS=$(curl -so /dev/null -w "%{http_code}" --max-time 5 "$BASE/_vercel/insights/script.js" 2>/dev/null)
if [ "$CF_STATUS" = "200" ]; then
  fail "7-ANALYTICS" "Legacy analytics script returnerer 200 (uventet!)"
else
  pass "7-ANALYTICS" "Legacy analytics script returnerer $CF_STATUS (404 forventet)"
fi

# ── TEST 8: innlogging?error= params stabile ─────────────────────────────
echo -e "\n${BOLD}8. error-params stabile${NC}"
for ERR in exchange_failed no_code access_denied; do
  R=$(curl -so /dev/null -w "%{num_redirects}" --max-redirs 10 -L --max-time 5 "$BASE/no/innlogging?error=$ERR" 2>/dev/null)
  if [ "${R:-0}" -ge 5 ]; then
    fail "8-$ERR" "?error=$ERR gir loop! ($R redirects)"
  else
    pass "8-$ERR" "?error=$ERR stabil ($R redirects)"
  fi
done

echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Quick debug ferdig!${NC}"
echo -e "  For fullstendig rapport: ${BOLD}node scripts/debug-auth.mjs${NC}\n"

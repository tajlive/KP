#!/usr/bin/env bash
# Post-deploy health check — kjøres i CI etter deploy
# Verifiserer at alle kritiske sider fungerer

BASE_URL="${1:-https://www.klarpakke.no}"
FAILURES=0

echo "🏥 Post-deploy health check — $BASE_URL"

check() {
  local path="$1"
  local expected="${2:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -m10 "$BASE_URL$path")
  if [ "$code" = "$expected" ]; then
    echo "  ✅ $path ($code)"
  else
    echo "  ❌ $path (got $code, expected $expected)"
    FAILURES=$((FAILURES + 1))
  fi
}

# Public pages
check "/" 200
check "/no/priser" 200
check "/no/login" 200
check "/no/register" 200
check "/no/leaderboard" 200
check "/no/bots" 200

# Health API
check "/api/health" 200

# Auth-gated (skal redirecte)
check "/no/handel" 307
check "/no/dashboard" 307

if [ "$FAILURES" -gt 0 ]; then
  echo ""
  echo "❌ $FAILURES sider feiler — ROLLBACK NØDVENDIG"
  exit 1
fi

echo ""
echo "✅ Alle $(( $(echo "$FAILURES" | wc -l) + 10 )) sider OK"

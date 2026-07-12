#!/usr/bin/env bash
# Post-deploy health check — verifiserer at deployet fungerer
# Kjøres etter wrangler deploy

echo "=== Post-deploy verifikasjon ==="
FAIL=0

check_page() {
  local url="$1"
  local label="${2:-$url}"
  local html
  html=$(curl -s -m 5 "$url" -H "Cache-Control: no-cache" 2>/dev/null || true)
  if echo "$html" | grep -qE "<!DOCTYPE html>|<html"; then
    echo "  ✅ $label"
  else
    echo "  ❌ $label — mangler HTML-struktur"
    FAIL=1
  fi
}

check_page "https://www.klarpakke.no/" "Root /"
sleep 1

for page in /no /no/login /no/jokertrade /no/leaderboard /no/priser; do
  sleep 0.5
  check_page "https://www.klarpakke.no$page" "$page"
done

echo -n "Health API: "
health=$(curl -s -m 5 "https://www.klarpakke.no/api/health" 2>/dev/null || true)
status=$(echo "$health" | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "unreachable")
echo "$status"

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Noen sider feilet"
  exit 1
fi
echo "=== All OK ==="

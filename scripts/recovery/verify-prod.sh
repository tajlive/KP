#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.klarpakke.no}"
BASE="${BASE%/}"

check() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$code" != "200" && "$code" != "204" ]]; then
    echo "FAIL: $url -> $code"
    exit 1
  fi
  echo "OK: $url -> $code"
}

check "${BASE}/"
check "${BASE}/api/health"
echo "OK: prod health-check passerte."

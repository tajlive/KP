#!/bin/bash
URL="${1:-https://www.klarpakke.no}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$STATUS" = "200" ]; then
  echo "✅ $URL (HTTP $STATUS)"
  exit 0
else
  echo "❌ $URL (HTTP $STATUS)"
  exit 1
fi

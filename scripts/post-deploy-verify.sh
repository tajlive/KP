#!/bin/bash
set -e

PROD_URL="https://www.klarpakke.no"

echo "🔍 Verifiserer production deploy..."

# Check status codes
for path in "/" "/priser" "/priser/success" "/dashboard" "/paper-trading"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL$path")
  if [ "$status" = "200" ] || [ "$status" = "302" ] || [ "$status" = "308" ]; then
    echo "✅ $path: $status"
  else
    echo "❌ $path: $status (forventet 200/302/308)"
    exit 1
  fi
done

echo "✅ Production deploy verifisert!"


#!/bin/bash
set -e
cd /Users/taj/klarpakke

echo "=== Validerer JSON ==="
python3 -c "import json; json.load(open('messages/no/landing.json')); print('no/landing.json OK')"
python3 -c "import json; json.load(open('messages/en/landing.json')); print('en/landing.json OK')"

echo "=== Git commit & push ==="
git add messages/no/landing.json messages/en/landing.json
git commit -m "fix(i18n): add missing landing.trustStrip keys to no and en"
git push origin main

echo "=== Vent 90s og verifiser prod ==="
sleep 90
curl -sf https://www.klarpakke.no/api/health | python3 -c \
  "import json,sys; h=json.load(sys.stdin); print('Deploy:', h['version'], h['status'])"

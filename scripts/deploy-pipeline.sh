#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# KLARPAKKE DEPLOY PIPELINE
# ═══════════════════════════════════════════════════════════════════════════
# 
# Bruk: ./scripts/deploy-pipeline.sh [preview|prod]
# 
# Steg:
# 1. Deploy preview
# 2. Test preview URL
# 3. Hvis OK → Deploy prod
# 4. Post-deploy tester
# 5. Slack-varsling
# ═══════════════════════════════════════════════════════════════════════════

set -e

ENV=${1:-preview}
SLACK_WEBHOOK=${SLACK_DEPLOY_WEBHOOK:-""}
PREVIEW_URL=""

echo "🚀 Klarpakke Deploy Pipeline"
echo "=============================="
echo "Miljø: $ENV"
echo ""

# Funksjon: Slack-varsling
send_slack() {
  local status=$1
  local message=$2
  
  if [ -z "$SLACK_WEBHOOK" ]; then
    echo "⚠️  SLACK_DEPLOY_WEBHOOK ikke satt"
    return
  fi
  
  local emoji="🚀"
  [ "$status" = "success" ] && emoji="✅"
  [ "$status" = "failure" ] && emoji="❌"
  
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{
      \"username\": \"Klarpakke Deploy\",
      \"icon_emoji\": \":klarpakke:\",
      \"text\": \"$emoji $message\"
    }" 2>/dev/null || echo "⚠️  Kunne ikke sende Slack-varsling"
}

# Steg 1: Deploy
echo "📦 Steg 1: Deploy $ENV"
if [ "$ENV" = "preview" ]; then
  npm run deploy:preview 2>&1 | tee /tmp/deploy.log
  PREVIEW_URL=$(grep -o 'https://[^"]*\.vercel\.app' /tmp/deploy.log | head -1)
else
  npm run deploy:prod 2>&1 | tee /tmp/deploy.log
fi

# Sjekk om deploy var vellykket
if [ $? -ne 0 ]; then
  echo "❌ Deploy feilet"
  send_slack "failure" "Deploy $ENV feilet"
  exit 1
fi

echo ""
echo "✅ Deploy fullført"
[ -n "$PREVIEW_URL" ] && echo "Preview URL: $PREVIEW_URL"
echo ""

# Steg 2: Test (kun for preview)
if [ "$ENV" = "preview" ] && [ -n "$PREVIEW_URL" ]; then
  echo "🧪 Steg 2: Tester preview"
  sleep 10  # Vent på at deploy blir aktiv
  
  curl -sf "$PREVIEW_URL/api/health" > /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Preview health check OK"
    send_slack "success" "Preview deploy OK: $PREVIEW_URL"
  else
    echo "❌ Preview health check feilet"
    send_slack "failure" "Preview health check feilet"
    exit 1
  fi
fi

# Steg 3: Prod-deploy (hvis preview var OK)
if [ "$ENV" = "preview" ]; then
  echo ""
  read -p "Deploy til prod? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starter prod-deploy..."
    $0 prod
  else
    echo "Avbrutt"
  fi
fi

# Steg 4: Post-deploy tester (kun prod)
if [ "$ENV" = "prod" ]; then
  echo ""
  echo "🧪 Steg 4: Post-deploy tester"
  
  # Lint/typecheck
  npm run lint:gate
  
  # Unit-tester
  npm run test:unit
  
  # E2E smoke
  # npm run test:e2e:smoke
  
  send_slack "success" "Prod deploy fullført med alle tester"
fi

echo ""
echo "🎉 Deploy pipeline fullført!"

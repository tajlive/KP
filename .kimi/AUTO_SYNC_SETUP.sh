#!/bin/bash
# AUTO-SYNC SETUP FOR GOOGLE CLOUD DATA
# Setter opp automatisk synkronisering hver 5. minutt

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔄 GOOGLE CLOUD AUTO-SYNC SETUP"
echo "═══════════════════════════════════════════════════════════"
echo ""

CRON_SCRIPT="$HOME/klarpakke/.kimi/SYNC_GOOGLE_CLOUD.sh"
LOG_FILE="$HOME/klarpakke/.mcp-cache/google-cloud/sync.log"

# Sjekk at sync-script eksisterer
if [ ! -f "$CRON_SCRIPT" ]; then
  echo "❌ SYNC_GOOGLE_CLOUD.sh ikke funnet"
  echo "Kjør fra klarpakke root: cd ~/klarpakke && bash .kimi/AUTO_SYNC_SETUP.sh"
  exit 1
fi

# Gjør script executable
chmod +x "$CRON_SCRIPT"
echo "✅ SYNC_GOOGLE_CLOUD.sh er executable"

# Lag log-mappe
mkdir -p "$(dirname $LOG_FILE)"
echo "✅ Log-mappe opprettet"

# Sjekk om cron job allerede eksisterer
if crontab -l 2>/dev/null | grep -q "SYNC_GOOGLE_CLOUD.sh"; then
  echo "⚠️  Cron job eksisterer allerede. Fjerner gammel..."
  crontab -l | grep -v "SYNC_GOOGLE_CLOUD.sh" | crontab -
fi

# Legg til ny cron job (hver 5. minutt)
echo "📅 Legger til cron job (kjører hver 5. minutt)..."
(crontab -l 2>/dev/null; echo "*/5 * * * * $CRON_SCRIPT >> $LOG_FILE 2>&1") | crontab -

echo "✅ Cron job lagt til"
echo ""

# Test at cron fungerer
echo "🧪 Tester første synkronisering..."
bash "$CRON_SCRIPT"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ AUTO-SYNC AKTIVERT!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Konfigurasjon:"
echo "  🔄 Frekvens: Hver 5. minutt"
echo "  📁 Data: ~/klarpakke/.mcp-cache/google-cloud/"
echo "  📝 Log: $LOG_FILE"
echo ""
echo "Claude har nå tilgang til:"
echo "  ✅ Cloud Run service info (live)"
echo "  ✅ Cloud Run revisions (live)"
echo "  ✅ Environment variables (live)"
echo "  ✅ Secrets mapping (live)"
echo "  ✅ Cloud Scheduler jobs (live)"
echo "  ✅ Cloud Run logs (siste 100 linjer)"
echo "  ✅ Cloud Build history (siste 10)"
echo "  ✅ Secret Manager metadata"
echo "  ✅ IAM policies"
echo "  ✅ Enabled APIs"
echo ""
echo "Test kommandoer:"
echo "  • Sjekk siste sync: cat $LOG_FILE | tail -20"
echo "  • Se summary: cat ~/klarpakke/.mcp-cache/google-cloud/SUMMARY.md"
echo "  • Manuell sync: bash $CRON_SCRIPT"
echo "  • Fjern cron: crontab -l | grep -v SYNC_GOOGLE_CLOUD.sh | crontab -"
echo ""
echo "═══════════════════════════════════════════════════════════"

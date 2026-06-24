#!/usr/bin/env bash
set -euo pipefail

# Installerer en ukentlig cron-jobb som oppdaterer KIMI Code CLI og MemPalace.
# Kjør manuelt én gang:
#   bash scripts/install-tool-update-cron.sh

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRON_MARKER="# klarpakke-tool-updater"
CRON_LINE="0 8 * * 1 cd $REPO_DIR && bash scripts/update-tools.sh >> /tmp/klarpakke-tool-updates.log 2>&1 $CRON_MARKER"

echo "📅 Installerer ukentlig verktøyoppdatering (mandag 08:00)..."

# Hent eksisterende crontab, fjern gammel linje hvis den finnes
current=$(crontab -l 2>/dev/null || true)
filtered=$(echo "$current" | grep -v "$CRON_MARKER" || true)

# Legg til ny linje
new_crontab="$filtered
$CRON_LINE"

echo "$new_crontab" | crontab -

echo "✅ Crontab oppdatert. Aktive entries:"
crontab -l | grep "$CRON_MARKER"

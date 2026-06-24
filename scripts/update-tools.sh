#!/usr/bin/env bash
set -euo pipefail

# Oppdaterer globale utviklingsverktøy for Klarpakke:
#   - KIMI Code CLI (@moonshot-ai/kimi-code)
#   - MemPalace (Python CLI + MCP-server)
#
# Bruk:
#   bash scripts/update-tools.sh        # kjør oppdateringer
#   bash scripts/update-tools.sh --dry-run  # sjekk om det finnes oppdateringer

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Sørg for at Node/npm fra nvm er tilgjengelig i cron/LaunchAgent-kontekst
if ! command -v npm >/dev/null 2>&1 && [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  nvm use "$(cat .nvmrc)" >/dev/null 2>&1 || nvm install "$(cat .nvmrc)"
fi

# Sørg for at python3 -m pip er tilgjengelig
PIP_CMD="python3 -m pip"
if ! python3 -m pip --version >/dev/null 2>&1; then
  PIP_CMD="pip3"
fi

echo "🔧 Sjekker nye versjoner av KIMI Code CLI og MemPalace..."
node scripts/check-tool-updates.mjs
status=$?

if [[ $status -eq 0 ]]; then
  echo "✅ Alt er oppdatert."
  exit 0
fi

if [[ $DRY_RUN == true ]]; then
  echo "📦 Oppdateringer tilgjengelig. Kjør uten --dry-run for å installere."
  exit 0
fi

echo "⬆️  Oppdaterer KIMI Code CLI via npm..."
npm install -g @moonshot-ai/kimi-code@latest

echo "⬆️  Oppdaterer MemPalace via pip..."
$PIP_CMD install --upgrade mempalace

echo "📝 Oppdaterer .tool-versions..."
node scripts/check-tool-updates.mjs --write

echo ""
echo "✅ Verifikasjon:"
echo "   KIMI Code CLI: $(kimi --version 2>/dev/null || echo 'ikke funnet')"
echo "   MemPalace:     $(mempalace --version 2>/dev/null | tail -1 || echo 'ikke funnet')"


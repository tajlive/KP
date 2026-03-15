#!/usr/bin/env bash
# Sikrer at .env.mcp.local finnes i worktree (kopierer fra main repo om nødvendig).
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIN_REPO="${MAIN_KLARPAKKE:-/Users/taj/klarpakke}"
if [ -f "$ROOT/.env.mcp.local" ]; then
  echo "✅ .env.mcp.local finnes i $ROOT"
  exit 0
fi
if [ -f "$MAIN_REPO/.env.mcp.local" ]; then
  cp "$MAIN_REPO/.env.mcp.local" "$ROOT/.env.mcp.local"
  echo "✅ Kopierte .env.mcp.local fra $MAIN_REPO til worktree"
else
  echo "⚠️  Ingen .env.mcp.local i $MAIN_REPO. Kjør: cp .env.mcp .env.mcp.local og fyll inn tokens."
  exit 1
fi

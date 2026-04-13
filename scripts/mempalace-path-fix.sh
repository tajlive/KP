#!/bin/bash
# MemPalace PATH-fix for macOS (M1/M2/M3)
# Sørger for at mempalace CLI er tilgjengelig globalt

set -euo pipefail

echo "🔧 MemPalace PATH-fix"

# Finn mempalace binary
MEMPALACE_BIN=""
for path in \
  "/Library/Frameworks/Python.framework/Versions/3.13/bin/mempalace" \
  "$HOME/.local/bin/mempalace" \
  "$HOME/Library/Python/3.13/bin/mempalace" \
  "/opt/homebrew/bin/mempalace" \
  "/usr/local/bin/mempalace"; do
  if [ -x "$path" ]; then
    MEMPALACE_BIN="$path"
    break
  fi
done

if [ -z "$MEMPALACE_BIN" ]; then
  echo "❌ mempalace binary ikke funnet"
  exit 1
fi

echo "   Fant: $MEMPALACE_BIN"

# Lag symlink til /usr/local/bin hvis ikke allerede der
if [ "$MEMPALACE_BIN" != "/usr/local/bin/mempalace" ]; then
  sudo mkdir -p /usr/local/bin
  if [ -L /usr/local/bin/mempalace ] || [ -e /usr/local/bin/mempalace ]; then
    sudo rm -f /usr/local/bin/mempalace
  fi
  sudo ln -s "$MEMPALACE_BIN" /usr/local/bin/mempalace
  echo "   ✅ Symlink laget: /usr/local/bin/mempalace → $MEMPALACE_BIN"
else
  echo "   ✅ Allerede i /usr/local/bin"
fi

# Verifiser
if command -v mempalace &> /dev/null; then
  echo "   ✅ mempalace tilgjengelig i PATH"
  mempalace status || true
else
  echo "⚠️  mempalace fortsatt ikke i PATH – sjekk at /usr/local/bin er i PATH"
fi

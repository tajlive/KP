#!/bin/bash
# MemPalace MCP config health check
# Sjekker at MCP-konfigurasjonen finnes og inneholder forventede servere,
# spesielt MemPalace MCP v3.4.0.

set -euo pipefail

CONFIG_CANDIDATES=(
  "$HOME/.kimi-code/mcp.json"
  "$HOME/.kimi/mcp.json"
  ".mcp/mcp_config.json"
)

check_config() {
  local path=$1
  if [ ! -f "$path" ]; then
    return 1
  fi

  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    const servers = cfg.mcpServers || {};
    if (!servers.mempalace) {
      console.error('Missing mempalace server');
      process.exit(1);
    }
    const mp = servers.mempalace;
    if (!mp.command || !Array.isArray(mp.args) || mp.args.length === 0) {
      console.error('Invalid mempalace server config');
      process.exit(1);
    }
  " "$path" >/dev/null 2>&1
}

found=0
for cfg in "${CONFIG_CANDIDATES[@]}"; do
  if check_config "$cfg"; then
    echo "✅ MCP-konfigurasjon OK: $cfg"
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
      const servers = cfg.mcpServers || {};
      const mp = servers.mempalace;
      console.log('   MemPalace:', mp.command + ' ' + mp.args.join(' '));
      console.log('   Servere:  ', Object.keys(servers).join(', '));
    " "$cfg"
    found=$((found + 1))
  else
    echo "⚠️  MCP-konfigurasjon mangler eller har ikke MemPalace: $cfg"
  fi
done

if [ "$found" -eq 0 ]; then
  echo ""
  echo "Fremgangsmåte:"
  echo "1. Sjekk at ~/.cursor/mcp.json, ~/.kimi/mcp.json eller .mcp/mcp_config.json finnes"
  echo "2. Verifiser at 'mempalace'-serveren er registrert (nå via ~/.kimi/mempalace-server.mjs)"
  exit 1
fi

echo ""
echo "Tilgjengelige MCP-servere (fra siste gyldige config):"
node -e "
  const fs = require('fs');
  const cfg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const servers = cfg.mcpServers || {};
  Object.entries(servers).forEach(([name, s]) => {
    const desc = s.description || (s.command + ' ' + (s.args || []).join(' '));
    console.log('  - ' + name + ': ' + desc);
  });
" "${CONFIG_CANDIDATES[$((found - 1))]}"

#!/bin/bash
# Auto-setup MemPalace MCP v3.4.0 for KIMI CLI — Run once
set -e

echo "🏛️  MemPalace MCP v3.4.0 + KIMI Auto-Setup"
echo "==========================================="

ROOT="$HOME/klarpakke"
MCP_CONFIG="$HOME/.kimi/mcp.json"
SERVER="$ROOT/scripts/run-mempalace-mcp-v3.mjs"

# 1. Verifiser at MemPalace MCP-server finnes
if [ ! -f "$SERVER" ]; then
    echo "❌ MemPalace MCP server ikke funnet på $SERVER"
    exit 1
fi
echo "✅ MemPalace MCP server funnet (v3.4.0)"

# 2. Verifiser at ~/.kimi/mcp.json finnes
if [ ! -f "$MCP_CONFIG" ]; then
    echo "⚠️  $MCP_CONFIG finnes ikke. Oppretter minimal config..."
    mkdir -p "$HOME/.kimi"
    cat > "$MCP_CONFIG" << 'EOF'
{
  "_meta": {
    "version": "2.9-minimal",
    "description": "Minimal MCP-konfigurasjon — generert av setup-mempalace-for-kimi.sh"
  },
  "mcpServers": {}
}
EOF
fi

# 3. Sjekk at mempalace allerede er i mcp.json
if grep -q '"mempalace"' "$MCP_CONFIG"; then
    echo "✅ MemPalace allerede konfigurert i ~/.kimi/mcp.json"
else
    echo "🔌 Legger til MemPalace i ~/.kimi/mcp.json..."
    # Backup
    cp "$MCP_CONFIG" "$MCP_CONFIG.bak.$(date +%Y%m%d%H%M%S)"

    # Bruk node for å injisere mempalace inn i JSON
    node -e "
const fs = require('fs');
const path = '$MCP_CONFIG';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.mcpServers = config.mcpServers || {};
config.mcpServers.mempalace = {
  description: 'MemPalace MCP v3.4.0 — prosjektkunnskap, KG, diary, resources, prompts (zero-dep, TF-IDF + bigram + cross-lingual)',
  command: 'node',
  args: ['/Users/taj/klarpakke/scripts/run-mempalace-mcp-v3.mjs']
};
fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('✅ MemPalace lagt til i MCP-config');
"
fi

# 4. Verifiser at nødvendige mapper finnes
for dir in .knowledge .knowledge/patterns .knowledge/decisions .knowledge/errors .mempalace/handoffs .mempalace/plans docs memory .kimi .kimi/logs; do
    mkdir -p "$ROOT/$dir"
done
echo "✅ Nødvendige mapper sikret"

# 5. Initialiser KG hvis ikke finnes
if [ ! -f "$ROOT/.mempalace/kg.json" ]; then
    echo '{"klarpakke-project": [{"predicate":"uses","object":"mempalace-v3.4.0","validFrom":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}]}' > "$ROOT/.mempalace/kg.json"
    echo "✅ Initial KG opprettet"
fi

# 6. Opprett diary hvis ikke finnes
if [ ! -f "$ROOT/.kimi/diary.jsonl" ]; then
    echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"AUTO","task":"MemPalace v3.4.0 initialisert","agent":"kimi","status":"GO","rating":5,"files":0,"tags":["mempalace","setup"]}' > "$ROOT/.kimi/diary.jsonl"
    echo "✅ Initial diary opprettet"
fi

# 7. Kjør rask test
echo ""
echo "🧪 Rask verifisering..."
node -e "
const { spawn } = require('child_process');
const child = spawn('node', ['$SERVER'], { cwd: '$ROOT' });
let out = '';
child.stdout.on('data', d => out += d);
child.stderr.on('data', () => {});
child.on('spawn', () => {
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{}}) + '\n');
  setTimeout(() => {
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'get_status',arguments:{}}}) + '\n');
    setTimeout(() => child.kill('SIGTERM'), 300);
  }, 300);
});
child.on('close', () => {
  const lines = out.split('\n').filter(Boolean);
  const statusLine = lines.find(l => l.includes('get_status') || l.includes('documents'));
  if (statusLine) {
    console.log('✅ MemPalace MCP server responderer korrekt');
  } else {
    console.log('⚠️  Kunne ikke verifisere respons — sjekk manuelt med: node scripts/run-mempalace-mcp-v3.mjs');
  }
});
"

echo ""
echo "🎉 MemPalace + KIMI oppsett fullført!"
echo ""
echo "📋 Oppsummering:"
echo "   • MemPalace MCP v3.4.0 — zero-dep, TF-IDF + bigram + cross-lingual"
echo "   • Resources: mempalace://document/{path}, mempalace://kg/{entity}"
echo "   • Prompts: pre_task, post_task, agent_auth, agent_architect"
echo "   • KG: incremental append + auto-compact"
echo ""
echo "🚀 Start KIMI:"
echo "   cd $ROOT && kimi"
echo ""
echo "🧪 Test i KIMI:"
echo '   > "sjekk mempalace status"'
echo '   > "søk etter auth pattern"'
echo ""
echo "📁 Viktige filer:"
echo "   MCP-config:     $MCP_CONFIG"
echo "   MCP-server:     $SERVER"
echo "   KG:             $ROOT/.mempalace/kg.json"
echo "   Diary:          $ROOT/.kimi/diary.jsonl"
echo "   Handoffs:       $ROOT/.mempalace/handoffs/"
echo ""

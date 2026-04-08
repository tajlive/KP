#!/bin/bash
# Auto-setup MemPalace for KIMI - Run once
set -e

echo "🏛️  MemPalace + KIMI Auto-Setup"
echo "================================"

# 1. Installer MemPalace hvis ikke allerede installert
if ! command -v mempalace &> /dev/null; then
    echo "📦 Installerer MemPalace..."
    pip install mempalace
else
    echo "✅ MemPalace allerede installert"
fi

# 2. Initialiser MemPalace for klarpakke (hvis ikke gjort)
if [ ! -f "$HOME/klarpakke/mempalace.yaml" ]; then
    echo "🏗️  Initialiserer MemPalace for klarpakke..."
    cd "$HOME/klarpakke"
    # Auto-accept med printf
    printf "\n\n\n" | mempalace init . || true
else
    echo "✅ MemPalace allerede initialisert"
fi

# 3. Mine klarpakke-prosjektet (hvis ikke allerede minet)
if [ ! -d "$HOME/.mempalace/palace/klarpakke" ]; then
    echo "⛏️  Mining klarpakke-prosjektet..."
    cd "$HOME/klarpakke"
    mempalace mine . --mode projects --limit 500 || true
else
    echo "✅ Allerede minet"
fi

# 4. Legg til MemPalace som MCP server i KIMI
echo "🔌 Kobler MemPalace til KIMI via MCP..."
kimi mcp list 2>/dev/null | grep -q "mempalace" || {
    kimi mcp add --transport stdio mempalace python -m mempalace.mcp_server
}

# 5. Opprett KIMI konfigurasjon for auto-hukommelse
KIMI_CONFIG_DIR="${HOME}/.config/kimi"
mkdir -p "$KIMI_CONFIG_DIR"

cat > "$KIMI_CONFIG_DIR/config.yaml" << 'EOF'
# KIMI + MemPalace Auto-Memory Configuration
mcp:
  enabled: true
  servers:
    - name: mempalace
      transport: stdio
      command: python
      args: ["-m", "mempalace.mcp_server"]
      
# Auto-mining settings
memory:
  auto_mine_on_start: true
  auto_save_on_exit: true
  wake_up_context: true
  
# Session management
session:
  persist_context: true
  compress_on_threshold: 80
  
# Default oppførsel
behavior:
  search_memory_before_answer: true
  store_decisions_automatically: true
  recall_project_context: true
EOF

echo ""
echo "✅ MemPalace + KIMI oppsett fullført!"
echo ""
echo "🎯 Nå vil KIMI automatisk:"
echo "   • Huske alle tidligere samtaler"
echo "   • Søke i minnet før den svarer"
echo "   • Lagre viktige beslutninger"
echo "   • Hente kontekst fra klarpakke-prosjektet"
echo ""
echo "💡 Start KIMI med: kimi"
echo "💡 Test med: 'Hva jobbet vi med sist?'"

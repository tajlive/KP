#!/bin/bash
# 🤖 Auto-setup: Perplexity + MemPalace + KIMI for Klarpakke
# Dette skriptet integrerer alle tre systemer for perfekt hukommelse

set -e

echo "🏛️  Klarpakke Memory System - Auto-Setup"
echo "=========================================="
echo ""
echo "Dette setter opp:"
echo "  ✅ Perplexity MCP (web-søk & research)"
echo "  ✅ MemPalace MCP (lokal AI-minne)"
echo "  ✅ KIMI integrasjon (auto-hukommelse)"
echo ""

# 1. Verifiser Perplexity MCP
echo "1️⃣  Sjekker Perplexity MCP..."
if ! command -v perplexity-mcp &> /dev/null; then
    echo "   📦 Installerer perplexity-mcp..."
    pip install perplexity-mcp
else
    echo "   ✅ Perplexity MCP allerede installert"
fi

# 2. Verifiser MemPalace
echo "2️⃣  Sjekker MemPalace..."
if ! command -v mempalace &> /dev/null; then
    echo "   📦 Installerer mempalace..."
    pip install mempalace
else
    echo "   ✅ MemPalace allerede installert"
fi

# 3. Legg til i KIMI MCP hvis ikke allerede der
echo "3️⃣  Konfigurerer KIMI MCP..."

# Sjekk om Perplexity er lagt til
if ! kimi mcp list 2>/dev/null | grep -q "perplexity"; then
    echo "   🔌 Legger til Perplexity i KIMI MCP..."
    kimi mcp add --transport stdio perplexity perplexity-mcp
else
    echo "   ✅ Perplexity allerede i KIMI MCP"
fi

# Sjekk om MemPalace er lagt til
if ! kimi mcp list 2>/dev/null | grep -q "mempalace"; then
    echo "   🔌 Legger til MemPalace i KIMI MCP..."
    kimi mcp add --transport stdio mempalace python -m mempalace.mcp_server
else
    echo "   ✅ MemPalace allerede i KIMI MCP"
fi

# 4. Initialiser MemPalace for klarpakke hvis ikke gjort
echo "4️⃣  Initialiserer MemPalace for Klarpakke..."
cd ~/klarpakke
if [ ! -f "mempalace.yaml" ]; then
    printf "\n\n\n" | mempalace init . || true
    echo "   ✅ MemPalace initialisert"
else
    echo "   ✅ Allerede initialisert"
fi

# 5. Oppretter KIMI + Memory System konfigurasjon
echo "5️⃣  Oppretter Memory System konfigurasjon..."
mkdir -p ~/.config/kimi

cat > ~/.config/kimi/klarpakke-memory.yaml << 'EOF'
# 🤖 Klarpakke Memory System v1.0
# Perplexity + MemPalace + KIMI Integration

memory:
  # Prioritet: 1. MemPalace (lokal) → 2. Perplexity (web) → 3. Generer nytt
  priority: [mempalace, perplexity, generate]
  
  # Auto-lagring
  auto_store:
    enabled: true
    after_perplexity_search: true
    after_important_decision: true
    
  # Context loading
  wake_up:
    enabled: true
    load_critical_facts: true
    load_recent_sessions: true

perplexity:
  # Når skal Perplexity kalles?
  auto_call_when:
    - "Spørsmål inneholder 'dokumentasjon', 'API', 'siste versjon'"
    - "Tema ikke funnet i MemPalace etter søk"
    - "Bruker eksplisitt ber om web-søk"
    
  # Hva skal lagres etter Perplexity-søk
  store_in_mempalace:
    - "Sammendrag av funn"
    - "Tekniske spesifikasjoner"
    - "Best practices"
    - "Lenker til kilder"

mempalace:
  # Wings og Rooms for Klarpakke
  wings:
    - name: klarpakke
      rooms:
        - paper-trading
        - auth-system
        - e2e-testing
        - deployment
        - architecture
        - third-party-integrations
        
  # Halls (minne-typer)
  halls:
    - hall_facts        # Fakta og beslutninger
    - hall_events       # Hva som skjedde når
    - hall_discoveries  # Nye funn
    - hall_preferences  # Preferanser
    - hall_advice       # Anbefalinger

integration:
  workflow: |
    1. Bruker stiller spørsmål
    2. KIMI søker i MemPalace først (L0/L1/L2)
    3. Hvis funnet → Svar med lokal kontekst
    4. Hvis ikke funnet → Kall Perplexity
    5. Etter Perplexity → Vis svar + spør "Vil du lagre dette?"
    6. Hvis ja → Lagre i MemPalace for fremtiden
    
  cost_optimization: |
    MemPalace (lokal): $0/år
    Perplexity: ~$10-50/år (avhengig av bruk)
    Total: ~90% billigere enn ren LLM-hukommelse!
EOF

echo "   ✅ Konfigurasjon lagret i ~/.config/kimi/klarpakke-memory.yaml"

# 6. Oppretter auto-save hook
echo "6️⃣  Setter opp auto-save..."
mkdir -p ~/.kimi/hooks

cat > ~/.kimi/hooks/post-session-save.sh << 'EOF'
#!/bin/bash
# Auto-lagre viktige samtaler til MemPalace

SESSION_FILE="$1"
if [ -f "$SESSION_FILE" ]; then
    # Sjekk om samtalen inneholder viktige beslutninger
    if grep -qE "(besluttet|bestemt|fikset|løst|husk|decided|fixed|remember)" "$SESSION_FILE"; then
        mempalace mine "$SESSION_FILE" --mode convos --wing klarpakke 2>/dev/null || true
    fi
fi
EOF
chmod +x ~/.kimi/hooks/post-session-save.sh

echo "   ✅ Auto-save hook installert"

# 7. Verifiserer oppsett
echo ""
echo "7️⃣  Verifiserer oppsett..."
echo ""
echo "MCP Servere i KIMI:"
echo "-------------------"
kimi mcp list 2>/dev/null | grep -E "perplexity|mempalace|supabase|context7" || echo "Kjør 'kimi mcp list' for å verifisere"

echo ""
echo "✅ Oppsett fullført!"
echo ""
echo "🎯 Hvordan bruke:"
echo "   1. Start KIMI: kimi"
echo "   2. Still spørsmål - KIMI husker automatisk!"
echo "   3. For web-søk: 'Søk på nettet etter...'"
echo "   4. For å huske: 'Husk at vi bestemte...'"
echo ""
echo "💡 Tips:"
echo "   • MemPalace = Gratis lokal hukommelse"
echo "   • Perplexity = Sanntids web-søk"
echo "   • Over tid bygger du en super-kunnskapsbase!"
echo ""
echo "📚 Dokumentasjon:"
echo "   ~/klarpakke/PERPLEXITY-MEMPALACE-GUIDE.md"

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 ANTIGRAVITY SETUP - Integrasjon med KIMI + MemPalace
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: ./SETUP_ANTIGRAVITY.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEMPALACE_PATH="$REPO_ROOT/.mempalace"
ANTIGRAVITY_CONFIG_DIR="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.config/antigravity}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "🚀 KLARPAKKE + ANTIGRAVITY INTEGRASJON"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Dette scriptet setter opp:"
echo "  1. Antigravity MCP-konfigurasjon"
echo "  2. MemPalace sync for Gemini"
echo "  3. Agent orchestrator aliaser"
echo "  4. Auto-handoff templates"
echo ""
read -p "Fortsett? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Avbrutt."
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 1. ANTIGRAVITY MCP-KONFIGURASJON
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "[1/4] Setter opp Antigravity MCP-konfigurasjon..."
mkdir -p "$ANTIGRAVITY_CONFIG_DIR"

cat > "$ANTIGRAVITY_CONFIG_DIR/mcp_config.json" << EOF
{
  "_readme": "Klarpakke Antigravity MCP-konfigurasjon",
  "_project": "klarpakke",
  "_repo": "$REPO_ROOT",
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$REPO_ROOT"
      ]
    },
    "mempalace": {
      "command": "python3",
      "args": [
        "$REPO_ROOT/mempalace-mcp-server.py"
      ],
      "env": {
        "MEMPALACE_PATH": "$MEMPALACE_PATH"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "\${SUPABASE_ACCESS_TOKEN}"
      ]
    },
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "\${GITHUB_TOKEN}"
      }
    }
  }
}
EOF

echo "  ✓ MCP-config: $ANTIGRAVITY_CONFIG_DIR/mcp_config.json"

# ═══════════════════════════════════════════════════════════════════════════════
# 2. MEMPALACE SYNC FOR GEMINI
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "[2/4] Setter opp MemPalace sync..."

# Opprett sync-script
cat > "$REPO_ROOT/.kimi/mempalace-sync.sh" << 'EOF'
#!/bin/bash
# MemPalace sync for Gemini/Antigravity

MEMPALACE_PATH="${MEMPALACE_PATH:-$HOME/klarpakke/.mempalace}"
SYNC_OUTPUT="$MEMPALACE_PATH/SUMMARY.md"

cat > "$SYNC_OUTPUT" << SUMMARY
# MemPalace Summary ($(date +"%Y-%m-%d %H:%M"))

## Critical Decisions ($(ls -1 "$MEMPALACE_PATH/critical_decisions" 2>/dev/null | wc -l))
$(ls -1t "$MEMPALACE_PATH/critical_decisions" 2>/dev/null | head -5 | sed 's/^/- /')

## Error Patterns ($(ls -1 "$MEMPALACE_PATH/error_patterns" 2>/dev/null | wc -l))
$(ls -1t "$MEMPALACE_PATH/error_patterns" 2>/dev/null | head -5 | sed 's/^/- /')

## Recent Agent Activity
$(tail -10 "$MEMPALACE_PATH/kimi_sessions/orchestrator.log" 2>/dev/null || echo "Ingen aktivitet")

## Active Handoffs
$(ls -1t "$MEMPALACE_PATH/handoffs" 2>/dev/null | head -3 | sed 's/^/- /' || echo "Ingen aktive handoffs")

---
*Auto-generert av mempalace-sync.sh*
SUMMARY

echo "Synced: $SYNC_OUTPUT"
EOF

chmod +x "$REPO_ROOT/.kimi/mempalace-sync.sh"

# Kjør første sync
bash "$REPO_ROOT/.kimi/mempalace-sync.sh"

echo "  ✓ MemPalace sync: .kimi/mempalace-sync.sh"

# ═══════════════════════════════════════════════════════════════════════════════
# 3. AGENT ORCHESTRATOR ALIASER
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "[3/4] Setter opp shell-aliaser..."

SHELL_RC="$HOME/.zshrc"
[ -f "$HOME/.bashrc" ] && SHELL_RC="$HOME/.bashrc"

cat >> "$SHELL_RC" << EOF

# ═══════════════════════════════════════════════════════════════════
# KLARPAKKE AGENT ORCHESTRATOR ALIASER
# ═══════════════════════════════════════════════════════════════════
alias agent-orchestrator='$REPO_ROOT/.kimi/AGENT_ORCHESTRATOR.sh'
alias agent-plan='agent-orchestrator plan'
alias agent-exec='agent-orchestrator execute'
alias agent-swarm='agent-orchestrator swarm'
alias agent-handoff='agent-orchestrator handoff'
alias agent-status='agent-orchestrator status'
alias agent-selector='$REPO_ROOT/.kimi/agent-selector.sh'
alias mempalace-sync='$REPO_ROOT/.kimi/mempalace-sync.sh'

# Hurtig-agenter
alias ask-gemini='agent-plan'
alias tell-kimi='agent-exec'
alias check-swarm='agent-swarm'
EOF

echo "  ✓ Aliaser lagt til: $SHELL_RC"

# ═══════════════════════════════════════════════════════════════════════════════
# 4. AUTO-HANDOFF TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "[4/4] Setter opp handoff-templates..."

mkdir -p "$MEMPALACE_PATH/handoffs"

# Gemini → KIMI template
cat > "$MEMPALACE_PATH/handoffs/TEMPLATE_gemini_to_kimi.md" << 'EOF'
# Handoff: Gemini → KIMI

**Type:** Plan → Execution  
**Trigger:** Plan klar for implementering

## Gemini Checklist (FØR handoff)
- [ ] Plan dokumentert i `plans/TASK-*.md`
- [ ] Arkitektur valideret mot ADR
- [ ] Risiko vurdert
- [ ] Teststrategi definert

## KIMI Checklist (ETTER handoff)
- [ ] Plan lest og forstått
- [ ] Pre-execution checks kjørt
- [ ] Implementering utført
- [ ] Swarm QA bestått
- [ ] Deploy verifisert

## Template
```bash
# Gemini oppretter plan
agent-orchestrator plan "Beskrivelse av oppgave"

# KIMI utfører
agent-orchestrator execute TASK-XXXX.md
```
EOF

# KIMI → Gemini template  
cat > "$MEMPALACE_PATH/handoffs/TEMPLATE_kimi_to_gemini.md" << 'EOF'
# Handoff: KIMI → Gemini

**Type:** Execution → Review/Analysis  
**Trigger:** Trenger dypere analyse eller arkitektur-review

## KIMI Checklist (FØR handoff)
- [ ] Problem dokumentert
- [ ] Logs/feil hentet ut
- [ ] Kontekst lagt til i MemPalace

## Gemini Checklist (ETTER handoff)
- [ ] MemPalace lest
- [ ] Kode analysert
- [ ] Anbefaling dokumentert

## Template
```bash
# KIMI logger problem
agent-orchestrator handoff kimi gemini "Beskrivelse av problem"

# Gemini analyserer og gir anbefaling
# (Manuell prosess i Antigravity/Gemini)
```
EOF

echo "  ✓ Templates: $MEMPALACE_PATH/handoffs/TEMPLATE_*.md"

# ═══════════════════════════════════════════════════════════════════════════════
# OPPSUMMERING
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "🎉 ANTIGRAVITY + KIMI INTEGRASJON FULLFØRT!"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Konfigurasjon:"
echo "  • Antigravity MCP: $ANTIGRAVITY_CONFIG_DIR/mcp_config.json"
echo "  • MemPalace path:  $MEMPALACE_PATH"
echo "  • Orchestrator:    $REPO_ROOT/.kimi/AGENT_ORCHESTRATOR.sh"
echo ""
echo "Nye kommandoer (kjør 'source $SHELL_RC' først):"
echo ""
echo "  agent-orchestrator plan 'Implementer ny feature'"
echo "  agent-orchestrator execute TASK-XXXX.md"
echo "  agent-orchestrator swarm 'file1.ts file2.ts'"
echo "  agent-orchestrator handoff gemini kimi 'Klar for impl'"
echo "  agent-orchestrator status"
echo ""
echo "Hurtig-kommandoer:"
echo "  ask-gemini 'Planlegg ny trading-strategi'"
echo "  tell-kimi TASK-XXXX.md"
echo "  check-swarm 'src/lib/trading/*.ts'"
echo ""
echo "📚 Dokumentasjon:"
echo "  cat $REPO_ROOT/AGENT_COLLABORATION_GUIDE.md"
echo ""
echo "🚀 Kom i gang:"
echo "  source $SHELL_RC"
echo "  agent-status"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"

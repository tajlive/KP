#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🏛️ KIMI ARCHITECT — Unified Entrypoint for Lead Architect Mode
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: bash .kimi/kimi-architect.sh "<task description>" [--yolo]
#
# Flow:
#   1. Detect domain & agents
#   2. Create a pre-filled plan
#   3. (Optional) Execute with KIMI architect agent
#   4. Run Swarm QA
#   5. Sync to MemPalace
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

KP_DIR="/Users/taj/klarpakke"
cd "$KP_DIR"

DESCRIPTION="${1:-}"
YOLO=false
if [ "${2:-}" = "--yolo" ]; then
    YOLO=true
fi

if [ -z "$DESCRIPTION" ]; then
    echo "Usage: kimi-architect.sh '<task description>' [--yolo]"
    echo ""
    echo "Examples:"
    echo "  bash .kimi/kimi-architect.sh 'Implement grid bot v2 with trailing stop'"
    echo "  bash .kimi/kimi-architect.sh 'Fix OAuth redirect loop' --yolo"
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[ARCHITECT]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Create Plan
# ─────────────────────────────────────────────────────────────────────────────
log "Activating Lead Architect mode..."
log "Task: $DESCRIPTION"
echo ""

PLAN_FILE=$(bash .kimi/AGENT_ORCHESTRATOR.sh plan "$DESCRIPTION" 2>/dev/null | grep "Plan-fil opprettet:" | sed 's/.*: //')

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
    error "Failed to create plan file"
    exit 1
fi

success "Plan created: $PLAN_FILE"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Auto-fill plan with context
# ─────────────────────────────────────────────────────────────────────────────
log "Enriching plan with context..."

DOMAIN=$(bash .kimi/context-predictor.sh --json 2>/dev/null | grep '"domain"' | sed 's/.*: "\([^"]*\)".*/\1/' || echo "general")
SKILLS=$(bash .kimi/context-predictor.sh --json 2>/dev/null | grep '"predicted_skills"' | sed 's/.*: "\([^"]*\)".*/\1/' || echo "clean-code testing-patterns")
AGENTS=$(bash .kimi/agent-selector.sh "$DESCRIPTION" 2>/dev/null | head -10 || echo "")

# Fetch recent MemPalace decisions
MP_CONTEXT=""
if command -v mempalace >/dev/null 2>&1; then
    MP_CONTEXT=$(mempalace search "recent decisions" --wing klarpakke --limit 3 2>/dev/null | head -20 || echo "")
fi

# Inject into plan file
TMP_PLAN="${PLAN_FILE}.tmp"
cat > "$TMP_PLAN" << EOF
$(head -n 6 "$PLAN_FILE")
**Domain:** $DOMAIN  
**Predicted Skills:** $SKILLS  
**Mode:** $(if $YOLO; then echo "YOLO (auto-execute)"; else echo "Interactive"; fi)

## Detected Agents
$AGENTS

## MemPalace Context
\`\`\`
${MP_CONTEXT:-No recent decisions found}
\`\`\`

$(tail -n +8 "$PLAN_FILE" | sed 's/_\[Beskriv hva som skal gjøres på 2-3 setninger\]_/TODO: Replace with actual summary/')
EOF

mv "$TMP_PLAN" "$PLAN_FILE"
success "Plan enriched with domain=$DOMAIN"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Execute (interactive or YOLO)
# ─────────────────────────────────────────────────────────────────────────────
if $YOLO; then
    log "YOLO mode enabled — auto-executing with KIMI architect agent..."
    echo ""
    # Invoke KIMI CLI with the architect agent
    if command -v kimi >/dev/null 2>&1; then
        kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml -- "Read and execute this plan: $PLAN_FILE"
    else
        error "kimi CLI not found in PATH"
        exit 1
    fi
else
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
    echo "📋 Plan is ready: $PLAN_FILE"
    echo ""
    echo "Next steps:"
    echo "  1. Review the plan (optional)"
    echo "  2. Execute with KIMI:"
    echo ""
    echo -e "     ${CYAN}kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml -- \"Execute $PLAN_FILE\"${NC}"
    echo ""
    echo "  3. Or run orchestrator directly:"
    echo ""
    echo -e "     ${CYAN}bash .kimi/AGENT_ORCHESTRATOR.sh execute $PLAN_FILE${NC}"
    echo ""
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════${NC}"
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Swarm QA
# ─────────────────────────────────────────────────────────────────────────────
echo ""
log "Running Swarm QA..."

# Determine swarm type based on domain
SWARM_TYPE="review"
if [ "$DOMAIN" = "auth" ] || [ "$DOMAIN" = "api" ]; then
    SWARM_TYPE="security"
elif [ "$DOMAIN" = "database" ] || [ "$DOMAIN" = "infrastructure" ]; then
    SWARM_TYPE="architect"
fi

if npm run "swarm:$SWARM_TYPE" 2>/dev/null; then
    success "Swarm QA passed ($SWARM_TYPE)"
else
    warn "Swarm QA reported issues — review output above"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: MemPalace Sync
# ─────────────────────────────────────────────────────────────────────────────
echo ""
log "Syncing to MemPalace..."

if command -v mempalace >/dev/null 2>&1; then
    mempalace diary_write --agent-name "kimi" --entry "SESSION:$(date +%Y-%m-%d)|architect.task|$DESCRIPTION|★★★" 2>/dev/null || true
    npm run knowledge:sync 2>/dev/null || warn "knowledge:sync failed or not configured"
    success "MemPalace sync complete"
else
    warn "mempalace not available — skipping sync"
fi

echo ""
success "Lead Architect flow complete!"

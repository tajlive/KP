#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 AGENT ORCHESTRATOR v2 — Real KIMI + Swarm + MemPalace Integration
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: bash .kimi/AGENT_ORCHESTRATOR.sh <mode> [args]
#
# Modes:
#   plan    "beskrivelse"  → Lag pre-fylt plan med kontekst
#   execute <task-file>     → KIMI utfører plan med architect agent
#   swarm   [files]         → Kjør faktisk Swarm QA på git diff eller filer
#   handoff <from> <to>     → Lag handoff-dokument
#   status                  → Vis status for agenter + MemPalace
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

KP_DIR="/Users/taj/klarpakke"
cd "$KP_DIR"

MEMPALACE_PATH="${MEMPALACE_PATH:-$KP_DIR/.mempalace}"
HANDOFF_PATH="$MEMPALACE_PATH/handoffs"
DIARY_PATH="$MEMPALACE_PATH/kimi_sessions"
PLAN_PATH="$MEMPALACE_PATH/plans"
mkdir -p "$HANDOFF_PATH" "$DIARY_PATH" "$PLAN_PATH"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[ORCHESTRATOR]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
gemini() { echo -e "${PURPLE}[GEMINI]${NC} $1"; }
kimi_label() { echo -e "${CYAN}[KIMI]${NC} $1"; }

generate_task_id() {
    echo "TASK-$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 2 | tr '[:lower:]' '[:upper:]')"
}

detect_agents() {
    local task="$1"
    bash .kimi/agent-selector.sh "$task" 2>/dev/null | grep -E "ANBEFALT AGENT|WORKFLOW|PRIORITET" | sed 's/^/  /' || echo "  (none)"
}

get_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MODE: PLAN
# ═══════════════════════════════════════════════════════════════════════════════

cmd_plan() {
    local description="$1"
    if [ -z "$description" ]; then
        error "Mangler beskrivelse. Bruk: agent-orchestrator plan 'implementer ny feature'"
        exit 1
    fi

    local task_id
    task_id=$(generate_task_id)
    local plan_file="$PLAN_PATH/${task_id}.md"

    log "Oppretter plan: $task_id"

    # Gather context
    local domain
    domain=$(bash .kimi/context-predictor.sh --json 2>/dev/null | grep '"domain"' | sed 's/.*: "\([^"]*\)".*/\1/' || echo "general")
    local skills
    skills=$(bash .kimi/context-predictor.sh --json 2>/dev/null | grep '"predicted_skills"' | sed 's/.*: "\([^"]*\)".*/\1/' || echo "clean-code")

    local mp_context=""
    if command -v mempalace >/dev/null 2>&1; then
        mp_context=$(mempalace search "recent decisions" --wing klarpakke --limit 3 2>/dev/null | head -20 || echo "")
    fi

    local recent_files
    recent_files=$(git diff --name-only HEAD~3..HEAD 2>/dev/null | head -8 | sed 's/^/  - /' || echo "  (none)")

    cat > "$plan_file" << EOF
# Task Plan: $task_id

**Status:** 🟡 PLANNING  
**Created:** $(get_timestamp)  
**Description:** $description  
**Domain:** $domain  
**Skills:** $skills

## Detected Agents
$(detect_agents "$description")

## MemPalace Context
\`\`\`
${mp_context:-Ingen nylige beslutninger funnet}
\`\`\`

## Recent Files
$recent_files

## 1. Executive Summary
$description

## 2. Arkitektur
_Referanser til ADR og prinsipper som gjelder for $domain_

## 3. Files to Create/Modify
- [ ] _TBD_

## 4. Implementation Steps
1. _TBD_
2. _TBD_
3. _TBD_

## 5. Testing Strategy
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

## 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| _TBD_ | _TBD_ |

---

**Next Action:** Kjør \`bash .kimi/AGENT_ORCHESTRATOR.sh execute $plan_file\`
EOF

    success "Plan opprettet: $plan_file"
    echo "$plan_file"

    # Logg
    echo "$(get_timestamp) | PLAN | $task_id | $description | domain=$domain" >> "$DIARY_PATH/orchestrator.log"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MODE: EXECUTE
# ═══════════════════════════════════════════════════════════════════════════════

cmd_execute() {
    local plan_file="$1"
    if [ -z "$plan_file" ]; then
        error "Mangler plan-fil. Bruk: agent-orchestrator execute <plan-file.md>"
        exit 1
    fi
    if [ ! -f "$plan_file" ]; then
        plan_file="$PLAN_PATH/$plan_file"
        if [ ! -f "$plan_file" ]; then
            error "Plan-fil ikke funnet: $1"
            exit 1
        fi
    fi

    local task_id
    task_id=$(basename "$plan_file" .md)
    log "KIMI starter utførelse: $task_id"

    # Update status
    if command -v sed >/dev/null 2>&1; then
        sed -i '' 's/**Status:** 🟡 PLANNING/**Status:** 🔵 IN_PROGRESS/' "$plan_file" 2>/dev/null || \
        sed -i 's/**Status:** 🟡 PLANNING/**Status:** 🔵 IN_PROGRESS/' "$plan_file" || true
    fi

    # Pre-checks
    log "Kjører pre-execution checks..."
    npm run verify 2>/dev/null || warn "Verify had issues, continuing..."

    # Invoke KIMI architect agent
    kimi_label "Executing plan with architect agent..."
    if command -v kimi >/dev/null 2>&1; then
        # Pass the plan file path as instruction to KIMI
        kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml -- "Read and execute this plan: $plan_file"
    else
        warn "kimi CLI not found — manual execution required"
        echo "Run: kimi --agent-file .kimi/agents/klarpakke-architect-agent.yaml -- \"Execute $plan_file\""
    fi

    # Post-execution swarm
    log "Kjører Swarm QA..."
    local files_from_plan
    files_from_plan=$(grep -oE 'src/[a-zA-Z0-9/_-]+\.(ts|tsx|sql)' "$plan_file" | head -10 | tr '\n' ' ')
    if [ -n "$files_from_plan" ]; then
        cmd_swarm "$files_from_plan"
    else
        cmd_swarm ""
    fi

    # Update status
    if command -v sed >/dev/null 2>&1; then
        sed -i '' 's/**Status:** 🔵 IN_PROGRESS/**Status:** ✅ COMPLETED/' "$plan_file" 2>/dev/null || \
        sed -i 's/**Status:** 🔵 IN_PROGRESS/**Status:** ✅ COMPLETED/' "$plan_file" || true
    fi

    success "Utførelse fullført: $task_id"
    echo "$(get_timestamp) | EXECUTE | $task_id | Completed" >> "$DIARY_PATH/orchestrator.log"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MODE: SWARM
# ═══════════════════════════════════════════════════════════════════════════════

cmd_swarm() {
    local files="${1:-}"

    if [ -z "$files" ]; then
        # Auto-collect from git diff
        files=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|sql|json|yaml|md)$' | tr '\n' ' ' || true)
    fi

    if [ -z "$files" ]; then
        error "Ingen filer å sjekke. Angi filer eller ha uncommitted changes."
        exit 1
    fi

    log "Starter Swarm QA på: $files"
    npm run swarm:review -- $files
}

# ═══════════════════════════════════════════════════════════════════════════════
# MODE: HANDOFF
# ═══════════════════════════════════════════════════════════════════════════════

cmd_handoff() {
    local from_agent="$1"
    local to_agent="$2"
    local context="${3:-Generell overlevering}"

    if [ -z "$from_agent" ] || [ -z "$to_agent" ]; then
        error "Mangler agenter. Bruk: agent-orchestrator handoff <from> <to> [context]"
        exit 1
    fi

    local handoff_id="HANDOFF-$(date +%Y%m%d-%H%M%S)"
    local handoff_file="$HANDOFF_PATH/${handoff_id}.md"

    local last_entries
    last_entries=$(tail -10 "$DIARY_PATH/orchestrator.log" 2>/dev/null || echo "Ingen tidligere entries")

    cat > "$handoff_file" << EOF
# Agent Handoff: $handoff_id

**From:** $from_agent  
**To:** $to_agent  
**Time:** $(get_timestamp)  
**Context:** $context

## Recent Activity
\`\`\`
$last_entries
\`\`\`

## Decisions Made
- _[Fyll inn av $from_agent]_

## Open Questions
- _[Fyll inn]_

## Next Steps
1. _[Fyll inn av $to_agent]_

---
**Status:** 🟡 Ready for $to_agent
EOF

    success "Handoff opprettet: $handoff_file"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MODE: STATUS
# ═══════════════════════════════════════════════════════════════════════════════

cmd_status() {
    log "System Status"
    echo ""
    echo "Git branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo "Last commit: $(git log -1 --oneline 2>/dev/null || echo 'N/A')"
    echo ""
    echo "Active plans: $(ls -1 "$PLAN_PATH" 2>/dev/null | wc -l | tr -d ' ')"
    echo "Handoffs: $(ls -1 "$HANDOFF_PATH" 2>/dev/null | wc -l | tr -d ' ')"
    echo "Orchestrator logs: $(wc -l < "$DIARY_PATH/orchestrator.log" 2>/dev/null | tr -d ' ' || echo 0)"
    echo ""
    if command -v mempalace >/dev/null 2>&1; then
        (mempalace status 2>/dev/null || echo "MemPalace status unavailable") | head -10
    else
        echo "MemPalace: not in PATH"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

MODE="${1:-}"
shift || true

case "$MODE" in
    plan)
        cmd_plan "$1"
        ;;
    execute)
        cmd_execute "$1"
        ;;
    swarm)
        cmd_swarm "$*"
        ;;
    handoff)
        cmd_handoff "$1" "$2" "$3"
        ;;
    status)
        cmd_status
        ;;
    *)
        echo "🤖 Klarpakke Agent Orchestrator v2"
        echo ""
        echo "Usage:"
        echo "  bash .kimi/AGENT_ORCHESTRATOR.sh plan   'description'"
        echo "  bash .kimi/AGENT_ORCHESTRATOR.sh execute <plan-file.md>"
        echo "  bash .kimi/AGENT_ORCHESTRATOR.sh swarm  [files...]"
        echo "  bash .kimi/AGENT_ORCHESTRATOR.sh handoff <from> <to> [context]"
        echo "  bash .kimi/AGENT_ORCHESTRATOR.sh status"
        exit 1
        ;;
esac

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AGENT SELECTOR - Velg riktig agent til oppgaven
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: agent-selector <oppgave-beskrivelse>
# ═══════════════════════════════════════════════════════════════════════════════

TASK="${1:-}"

if [ -z "$TASK" ]; then
    echo "🎯 Agent Selector for Klarpakke"
    echo ""
    echo "Bruk: agent-selector '<oppgave>'"
    echo ""
    echo "Eksempler:"
    echo '   agent-selector "fix auth bug"'
    echo '   agent-selector "new dashboard feature"'
    echo '   agent-selector "optimize trading performance"'
    echo '   agent-selector "update pricing page"'
    echo '   agent-selector "security audit"'
    echo ""
    echo "Se full guide: cat SWARM-GUIDE.md"
    exit 0
fi

echo "🔍 Analyserer: '$TASK'"
echo ""

# Konverter til lowercase for matching
TASK_LOWER=$(echo "$TASK" | tr '[:upper:]' '[:lower:]')

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT SELECTION LOGIC
# ═══════════════════════════════════════════════════════════════════════════════

detect_agent() {
    local task="$1"
    local agents=""
    local reason=""
    
    # SECURITY (høyest prioritet)
    if echo "$task" | grep -qiE "security|auth|oauth|login|password|rls|secret|vulnerability|hack|breach|csrf|xss|injection"; then
        agents="klarpakke-live-trading-trades-agent + security-auditor"
        reason="Security-kritisk: Krever security audit + trading integrity"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:security"
        echo "PRIORITY:P0"
        return
    fi
    
    # TRADING (live/paper)
    if echo "$task" | grep -qiE "trading|trade|order|execution|binance|bybit|position|pnl|realized|paper.?trading|live.?trading|risk|circuit.?breaker"; then
        agents="klarpakke-live-trading-trades-agent"
        reason="Trading-kritisk: Krever operasjonelt ansvar + bevis"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:feature"
        echo "PRIORITY:P0"
        return
    fi
    
    # AUTO-TRADE STRATEGY
    if echo "$task" | grep -qiE "strategy|preset|backtest|indicator|signal|auto.?trade|bot|algorithm|tuning|optimization"; then
        agents="klarpakke-auto-trade-strategy-research-agent"
        reason="Strategi-forskning: Krever research + data + forum-innsikt"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:strategy-research"
        echo "PRIORITY:P1"
        return
    fi
    
    # UX/UI
    if echo "$task" | grep -qiE "ui|ux|design|component|button|modal|page|layout|color|theme|dark.?mode|animation|responsive|mobile"; then
        agents="klarpakke-ux-ui-agent"
        reason="UI/UX: Standard inngang for design"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:premium-design-audit"
        echo "PRIORITY:P1"
        return
    fi
    
    # ACCESSIBILITY
    if echo "$task" | grep -qiE "accessibility|a11y|wcag|screen.?reader|keyboard|focus|aria|contrast|reduced.?motion|blind|deaf"; then
        agents="klarpakke-accessibility-lead"
        reason="Tilgjengelighet: Krever WCAG 2.1 AA ekspertise"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:accessibility-audit"
        echo "PRIORITY:P1"
        return
    fi
    
    # USER EXPERIENCE / IA
    if echo "$task" | grep -qiE "user.?flow|navigation|ia|information.?architecture|onboarding|journey|funnel|conversion|usability|navigation"; then
        agents="klarpakke-experience-architect"
        reason="Brukeropplevelse: Krever IA og flyt-design"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:experience-modernization"
        echo "PRIORITY:P1"
        return
    fi
    
    # MODERNIZATION / REFACTOR
    if echo "$task" | grep -qiE "refactor|modernize|upgrade|next\.?js|react|typescript|type.?debt|migration|deprecat|legacy|clean.?up|performance|bundle|optimization|lcp|ttfb"; then
        agents="klarpakke-modernization-lead + performance-optimizer"
        reason="Modernisering: Krever stack-ekspertise + performance"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:modernization"
        echo "PRIORITY:P2"
        return
    fi
    
    # AUTOMATION / CI/CD
    if echo "$task" | grep -qiE "automation|ci|cd|github.?action|workflow|deploy|mcp|linear|verify|cron|webhook|pipeline|orchestrat"; then
        agents="klarpakke-automation-orchestrator"
        reason="Automatisering: Krever CI/MCP/Linear integrasjon"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:automation"
        echo "PRIORITY:P2"
        return
    fi
    
    # DATABASE / SUPABASE
    if echo "$task" | grep -qiE "database|supabase|postgres|migration|table|column|index|rls|policy|trigger|function|rpc|view|schema"; then
        agents="database-architect + klarpakke-live-trading-trades-agent"
        reason="Database: Krever arkitektur + trading-integrity (hvis relevant)"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:database"
        echo "PRIORITY:P1"
        return
    fi
    
    # TESTING / QA
    if echo "$task" | grep -qiE "test|e2e|playwright|vitest|jest|coverage|qa|quality|regression| flaky|mock"; then
        agents="qa-automation-engineer"
        reason="Testing: Krever test-strategi og coverage"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:test"
        echo "PRIORITY:P1"
        return
    fi
    
    # DEVOPS / INFRA
    if echo "$task" | grep -qiE "devops|infrastructure|vercel|aws|gcp|docker|kubernetes|terraform|infra|server|hosting|cdn|cache|redis"; then
        agents="devops-engineer"
        reason="DevOps: Krever infrastruktur-ekspertise"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:deploy"
        echo "PRIORITY:P2"
        return
    fi
    
    # DOCUMENTATION
    if echo "$task" | grep -qiE "documentation|doc|readme|adr|api.?doc|swagger|openapi|guide|manual|wiki"; then
        agents="documentation-writer"
        reason="Dokumentasjon: Krever teknisk skriving"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:documentation"
        echo "PRIORITY:P2"
        return
    fi
    
    # EXPLORATION / UNKNOWN
    if echo "$task" | grep -qiE "explore|investigate|research|unknown|find|discover|map|analyze.?codebase|understand"; then
        agents="explorer-agent"
        reason="Utforskning: Kartlegg ukjent del av repo"
        echo "AGENT:$agents"
        echo "REASON:$reason"
        echo "WORKFLOW:exploration"
        echo "PRIORITY:P2"
        return
    fi
    
    # DEFAULT
    agents="klarpakke-ux-ui-agent"
    reason="Standard: UI/UX agent (faller tilbake)"
    echo "AGENT:$agents"
    echo "REASON:$reason"
    echo "WORKFLOW:feature"
    echo "PRIORITY:P2"
}

# ═══════════════════════════════════════════════════════════════════════════════
# OUTPUT
# ═══════════════════════════════════════════════════════════════════════════════

RESULT=$(detect_agent "$TASK_LOWER")
AGENT=$(echo "$RESULT" | grep "^AGENT:" | cut -d: -f2-)
REASON=$(echo "$RESULT" | grep "^REASON:" | cut -d: -f2-)
WORKFLOW=$(echo "$RESULT" | grep "^WORKFLOW:" | cut -d: -f2-)
PRIORITY=$(echo "$RESULT" | grep "^PRIORITY:" | cut -d: -f2-)

echo "══════════════════════════════════════════════════════════════════"
echo ""
echo "🎯 ANBEFALT AGENT: $AGENT"
echo ""
echo "💡 Begrunnelse: $REASON"
echo "📋 Workflow: $WORKFLOW"
echo "⚡ Prioritet: $PRIORITY"
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Vis agent-fil hvis den finnes
AGENT_FILE=$(echo "$AGENT" | cut -d'+' -f1 | xargs)
AGENT_PATH=".agent/agents/${AGENT_FILE}.md"

if [ -f "$AGENT_PATH" ]; then
    echo "📄 Agent-fil: $AGENT_PATH"
    echo ""
    echo "📝 Kort beskrivelse:"
    head -10 "$AGENT_PATH" | grep -E "^#|^>" | head -5
else
    echo "ℹ️  Agent-fil: $AGENT_PATH (generer med template)"
fi

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo ""
echo "🔧 Neste steg:"
echo ""
case "$WORKFLOW" in
    "security")
        echo "1. Kjør security audit: npm run security:audit"
        echo "2. Sjekk RLS policies: npm run db:check-rls"
        echo "3. Verifiser med swarm: npm run swarm:security <filer>"
        ;;
    "feature")
        echo "1. Sjekk ADR compliance: cat docs/adr/"
        echo "2. Kjør swarm: npm run swarm:feature <filer>"
        echo "3. Verifiser tests: npm run test:unit"
        ;;
    "strategy-research")
        echo "1. Les SoT: docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md"
        echo "2. Sjekk eksisterende presets: src/lib/auto-trading/presets/"
        echo "3. Dokumenter i .knowledge/decisions/"
        ;;
    "premium-design-audit")
        echo "1. Kjør design audit: .agent/workflows/premium-design-audit.md"
        echo "2. Sjekk tokens: src/styles/tokens/"
        echo "3. WCAG sjekk: npm run a11y:audit"
        ;;
    *)
        echo "1. Les agent-filen: $AGENT_PATH"
        echo "2. Følg workflow: .agent/workflows/$WORKFLOW.md"
        echo "3. Kjør swarm: npm run swarm:check <filer>"
        ;;
esac

echo ""

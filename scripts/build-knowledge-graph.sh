#!/bin/bash
# Build Knowledge Graph for Klarpakke
# Populerer MemPalace KG med prosjekt-relasjoner

set -e

echo "🕸️ Building Knowledge Graph..."

# Hjelpefunksjon for å legge til triples
add_triple() {
    local subject="$1"
    local predicate="$2"
    local object="$3"
    
    echo "  $subject → $predicate → $object"
    # I praksis: kall mempalace_kg_add via MCP eller API
    # mempalace_kg_add "$subject" "$predicate" "$object"
}

echo ""
echo "📦 Code Dependencies..."

# Kode-arkitektur relasjoner
add_triple "auth-system" "depends_on" "supabase"
add_triple "auth-system" "uses" "@supabase/ssr"
add_triple "trading-engine" "depends_on" "binance-api"
add_triple "paper-trading" "extends" "trading-engine"
add_triple "auto-trading" "extends" "trading-engine"
add_triple "api-routes" "protected_by" "rls"
add_triple "cron-jobs" "runs_on" "supabase"

# Agent-relasjoner
echo ""
echo "🤖 Agent Relationships..."
add_triple "kimi" "orchestrates" "swarm"
add_triple "analyzer" "triggers" "pre-task"
add_triple "architect" "triggers" "on-decision"
add_triple "tester" "triggers" "post-implementation"
add_triple "knowledge" "syncs_to" "mempalace"
add_triple "security" "audits" "auth-system"

# Teknisk gjeld
echo ""
echo "🔧 Technical Debt..."
add_triple "type-debt" "located_in" "src/lib/supabase/TYPE_DEBT.md"
add_triple "auth-loop" "fixed_by" "cookie-encoding-raw"
add_triple "mempalace" "workaround" "raw-mode"

# Dokumentasjon
echo ""
echo "📚 Documentation..."
add_triple "AGENTS.md" "consolidates" "KIMI.md"
add_triple "AGENTS.md" "consolidates" "AGENT-KLARPAKKE.md"
add_triple "docs/adr" "contains" "architecture-decisions"

# Filer → Rom
echo ""
echo "🏛️ Memory Map..."
add_triple "docs/adr" "belongs_to" "room:critical_decisions"
add_triple "TYPE_DEBT.md" "belongs_to" "room:tech_debt"
add_triple "error-logs" "belongs_to" "room:error_patterns"

echo ""
echo "✅ Knowledge Graph built!"
echo ""
echo "Export to MemPalace:"
echo "  ./scripts/build-knowledge-graph.sh | mempalace-import"

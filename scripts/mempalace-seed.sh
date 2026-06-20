#!/bin/bash
# Seed MemPalace med kritisk prosjektkunnskap via Node.js MCP-verktøy
# Usage: ./scripts/mempalace-seed.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "🏛️  Seeding MemPalace..."

# 1. Mine kunnskap fra kodebasen (TODOs, ADRs, hot files, patterns)
if [ -f "$ROOT/scripts/knowledge-miner.mjs" ]; then
    echo "📋 Running knowledge miner..."
    node "$ROOT/scripts/knowledge-miner.mjs"
else
    echo "⚠️  scripts/knowledge-miner.mjs not found — skipping knowledge mining"
fi

# 2. Rebuild MemPalace index if reindex script exists
if [ -f "$ROOT/scripts/mempalace-reindex.mjs" ]; then
    echo "🔄 Rebuilding MemPalace index..."
    node "$ROOT/scripts/mempalace-reindex.mjs" || echo "⚠️  Reindex failed (non-fatal)"
fi

# 3. Seed critical decisions into KG via MCP-compatible JS one-liner
if [ -f "$ROOT/.mempalace/kg.json" ]; then
    echo "🧠 Seeding knowledge graph..."
    node -e "
const fs = require('fs');
const path = '$ROOT/.mempalace/kg.json';
let kg = {};
try { kg = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
const seeds = [
  { subject: 'klarpakke-project', predicate: 'uses', object: 'mempalace-v3.4.0' },
  { subject: 'mempalace', predicate: 'indexing', object: 'knowledge-miner' },
  { subject: 'mempalace', predicate: 'source', object: 'docs/adr' },
  { subject: 'mempalace', predicate: 'source', object: '.knowledge/errors' }
];
let added = 0;
for (const s of seeds) {
  kg[s.subject] = kg[s.subject] || [];
  const exists = kg[s.subject].some(f => f.predicate === s.predicate && f.object === s.object);
  if (!exists) {
    kg[s.subject].push({ predicate: s.predicate, object: s.object, validFrom: new Date().toISOString() });
    added++;
  }
}
fs.writeFileSync(path, JSON.stringify(kg, null, 2));
console.log('   ✅ Seeded ' + added + ' new KG facts');
"
fi

echo "✅ Seeding complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run mempalace:status"
echo "2. Test search: node scripts/mempalace-search.mjs 'auth pattern'"
echo "3. Sync diary: ./scripts/mempalace-diary.sh write FEAT 'seeded knowledge' GO 4"

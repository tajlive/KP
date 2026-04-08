#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MEMPALACE SYNC - Holder klarpakke-minner synkronisert
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: ./scripts/mempalace-sync.sh [full|incremental]
# 
# "full"    - Re-miner hele prosjektet (tregt, men grundig)
# "incr"    - Kun nye/endrede filer (raskt, default)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="/Users/taj/klarpakke"
MEMPALACE_WING="klarpakke"
MODE="${1:-incr}"

echo "🏛️  MemPalace Sync for Klarpakke"
echo "   Mode: $MODE"
echo "   Wing: $MEMPALACE_WING"
echo ""

cd "$PROJECT_DIR"

if [ "$MODE" = "full" ]; then
    echo "🔄 Full sync - mining all files..."
    mempalace mine "$PROJECT_DIR" --mode projects --extract general
elif [ "$MODE" = "incr" ]; then
    echo "⚡ Incremental sync..."
    # Kun nye filer siste 24 timer
    find "$PROJECT_DIR" -type f -mtime -1 \
        -not -path "*/node_modules/*" \
        -not -path "*/.next/*" \
        -not -path "*/.git/*" \
        -not -path "*/chroma.sqlite3" \
        > /tmp/klarpakke-new-files.txt
    
    if [ -s /tmp/klarpakke-new-files.txt ]; then
        echo "   Found $(wc -l < /tmp/klarpakke-new-files.txt) new/changed files"
        # MemPalace kan ikke mine fra fil-liste ennå, så vi bruker standard
        mempalace mine "$PROJECT_DIR" --mode projects 2>/dev/null || true
    else
        echo "   No new files to sync"
    fi
fi

echo ""
echo "✅ Sync complete!"
echo ""
echo "📊 Status:"
mempalace status 2>/dev/null || echo "   (status unavailable)"

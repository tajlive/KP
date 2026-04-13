#!/bin/bash
# MemPalace Knowledge Search v2 (Ranked)
# Wrapper for mempalace-search.mjs

QUERY="$1"
ROOM="${2:-all}"
LIMIT="${3:-5}"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 <query> [room] [limit]"
    exit 1
fi

# Kjør den nye JS-baserte søkemotoren med rangering
/bin/zsh -ilc "node $(dirname "$0")/mempalace-search.mjs '$QUERY' '$ROOM' '$LIMIT'"

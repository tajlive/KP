#!/bin/bash
# KIMI Diary - AAAK Format
# Lagrer sesjon-kontekst mellom KIMI-oppdrag

DIARY_FILE=".kimi/diary.log"
mkdir -p "$(dirname "$DIARY_FILE")"

# Hjelpefunksjoner
get_date_code() {
    date +%y%m%d
}

write_entry() {
    local type="$1"
    local task="$2"
    local status="$3"
    local rating="${4:-★★★}"
    local files="${5:-0}"
    
    local date_code=$(get_date_code)
    local entry="SESSION:${date_code}|TYPE:${type}|TASK:${task}|FILES:${files}|STATUS:${status}|${rating}"
    
    echo "$entry" >> "$DIARY_FILE"
    echo "📝 Diary entry added"
}

read_entries() {
    local n="${1:-10}"
    
    if [ -f "$DIARY_FILE" ]; then
        echo "📖 Last $n entries:"
        echo ""
        tail -$n "$DIARY_FILE" | while read -r line; do
            # Parse AAAK
            date=$(echo "$line" | grep -o 'SESSION:[0-9]*' | cut -d: -f2)
            type=$(echo "$line" | grep -o 'TYPE:[A-Z]*' | cut -d: -f2)
            task=$(echo "$line" | grep -o 'TASK:[^|]*' | cut -d: -f2)
            status=$(echo "$line" | grep -o 'STATUS:[A-Z-]*' | cut -d: -f2)
            rating=$(echo "$line" | grep -o '★*')
            
            echo "  📅 20$date | $type | $rating"
            echo "     Task: $task"
            echo "     Status: $status"
            echo ""
        done
    else
        echo "No diary entries yet"
    fi
}

# CLI
case "$1" in
    write)
        write_entry "$2" "$3" "$4" "$5" "$6"
        ;;
    read)
        read_entries "$2"
        ;;
    status)
        if [ -f "$DIARY_FILE" ]; then
            wc -l < "$DIARY_FILE"
        else
            echo "0"
        fi
        ;;
    *)
        echo "Usage: $0 {write|read|status}"
        echo ""
        echo "  write <type> <task> <status> [rating] [files]"
        echo "  read [n] - Show last n entries (default 10)"
        echo "  status - Show total entries"
        echo ""
        echo "Types: FEAT, FIX, REF, DOC, OPT, SEC, ANALYSIS"
        echo "Status: GO, NO-GO, WIP"
        ;;
esac

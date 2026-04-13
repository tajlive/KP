#!/bin/bash
# MemPalace Diary v2 - JSONL Format
# Replaces flat-text diary with structured JSON Lines
# Backward compatible: reads old format, writes new format

DIARY_V1=".kimi/diary.log"
DIARY_V2=".kimi/diary.jsonl"
mkdir -p "$(dirname "$DIARY_V2")"

# Detect which agent is calling (env var or fallback)
AGENT="${MEMPALACE_AGENT:-unknown}"

write_entry() {
    local type="$1"
    local task="$2"
    local status="$3"
    local rating_stars="${4:-★★★}"
    local files="${5:-0}"

    # Count stars → number
    local rating
    rating=$(echo "$rating_stars" | grep -o '★' | wc -l | tr -d ' ')
    [ "$rating" -eq 0 ] && rating=3

    local ts
    ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Write JSONL entry (one JSON object per line)
    printf '{"ts":"%s","type":"%s","task":"%s","files":%s,"status":"%s","rating":%s,"agent":"%s"}\n' \
        "$ts" "$type" "$task" "$files" "$status" "$rating" "$AGENT" >> "$DIARY_V2"

    echo "📝 Diary entry added (v2 jsonl)"
}

read_entries() {
    local n="${1:-10}"
    local filter_type="${2:-}"
    local filter_agent="${3:-}"

    # Merge v1 + v2 if both exist
    local entries=""

    # Read v2 (JSONL) entries
    if [ -f "$DIARY_V2" ]; then
        entries=$(tail -"$n" "$DIARY_V2")
    fi

    # If no v2 entries, try v1 fallback
    if [ -z "$entries" ] && [ -f "$DIARY_V1" ]; then
        echo "📖 (Reading from legacy diary.log)"
        tail -"$n" "$DIARY_V1" | while read -r line; do
            date=$(echo "$line" | grep -o 'SESSION:[0-9]*' | cut -d: -f2)
            type=$(echo "$line" | grep -o 'TYPE:[A-Z_]*' | cut -d: -f2)
            task=$(echo "$line" | grep -o 'TASK:[^|]*' | cut -d: -f2)
            status=$(echo "$line" | grep -o 'STATUS:[A-Z-]*' | cut -d: -f2)
            rating=$(echo "$line" | grep -o '★*')
            echo "  📅 20$date | $type | $rating"
            echo "     Task: $task"
            echo "     Status: $status"
            echo ""
        done
        return
    fi

    if [ -z "$entries" ]; then
        echo "No diary entries yet"
        return
    fi

    echo "📖 Last $n entries:"
    echo ""

    echo "$entries" | while IFS= read -r line; do
        # Parse JSON fields with lightweight extraction
        ts=$(echo "$line" | sed 's/.*"ts":"\([^"]*\)".*/\1/')
        type=$(echo "$line" | sed 's/.*"type":"\([^"]*\)".*/\1/')
        task=$(echo "$line" | sed 's/.*"task":"\([^"]*\)".*/\1/')
        status=$(echo "$line" | sed 's/.*"status":"\([^"]*\)".*/\1/')
        rating=$(echo "$line" | sed 's/.*"rating":\([0-9]*\).*/\1/')
        agent=$(echo "$line" | sed 's/.*"agent":"\([^"]*\)".*/\1/')

        # Apply filters
        if [ -n "$filter_type" ] && [ "$type" != "$filter_type" ]; then continue; fi
        if [ -n "$filter_agent" ] && [ "$agent" != "$filter_agent" ]; then continue; fi

        # Build star string
        stars=""
        for i in $(seq 1 "$rating"); do stars="${stars}★"; done

        # Format date
        date_short=$(echo "$ts" | cut -dT -f1)

        echo "  📅 $date_short | $type | $stars | 🤖 $agent"
        echo "     $task"
        echo "     Status: $status"
        echo ""
    done
}

migrate_v1() {
    if [ ! -f "$DIARY_V1" ]; then
        echo "No v1 diary to migrate"
        return
    fi

    echo "🔄 Migrating v1 diary to v2 JSONL..."
    local count=0

    while IFS= read -r line; do
        date=$(echo "$line" | grep -o 'SESSION:[0-9]*' | cut -d: -f2)
        type=$(echo "$line" | grep -o 'TYPE:[A-Z_]*' | cut -d: -f2)
        task=$(echo "$line" | grep -o 'TASK:[^|]*' | cut -d: -f2)
        files=$(echo "$line" | grep -o 'FILES:[0-9]*' | cut -d: -f2)
        status=$(echo "$line" | grep -o 'STATUS:[A-Z-]*' | cut -d: -f2)
        rating_stars=$(echo "$line" | grep -o '★*')
        rating=$(echo "$rating_stars" | grep -o '★' | wc -l | tr -d ' ')
        [ "$rating" -eq 0 ] && rating=3

        # Reconstruct timestamp from YYMMDD
        ts="20${date:0:2}-${date:2:2}-${date:4:2}T00:00:00Z"

        printf '{"ts":"%s","type":"%s","task":"%s","files":%s,"status":"%s","rating":%s,"agent":"kimi"}\n' \
            "$ts" "$type" "$task" "${files:-0}" "${status:-GO}" "$rating" >> "$DIARY_V2"

        count=$((count + 1))
    done < "$DIARY_V1"

    echo "✅ Migrated $count entries to $DIARY_V2"
    echo "   Old diary preserved at $DIARY_V1"
}

stats() {
    local total=0
    local by_type=""
    local by_agent=""

    if [ -f "$DIARY_V2" ]; then
        total=$(wc -l < "$DIARY_V2" | tr -d ' ')
        by_type=$(sed 's/.*"type":"\([^"]*\)".*/\1/' "$DIARY_V2" | sort | uniq -c | sort -rn)
        by_agent=$(sed 's/.*"agent":"\([^"]*\)".*/\1/' "$DIARY_V2" | sort | uniq -c | sort -rn)
    fi

    echo "📊 MemPalace Diary Stats"
    echo "========================"
    echo "Total entries: $total"
    echo ""
    echo "By type:"
    echo "$by_type" | sed 's/^/  /'
    echo ""
    echo "By agent:"
    echo "$by_agent" | sed 's/^/  /'
}

# CLI
case "$1" in
    write)
        write_entry "$2" "$3" "$4" "$5" "$6"
        ;;
    read)
        read_entries "$2" "$3" "$4"
        ;;
    migrate)
        migrate_v1
        ;;
    stats)
        stats
        ;;
    status)
        if [ -f "$DIARY_V2" ]; then
            wc -l < "$DIARY_V2" | tr -d ' '
        elif [ -f "$DIARY_V1" ]; then
            echo "v1: $(wc -l < "$DIARY_V1" | tr -d ' ') (run 'migrate' to upgrade)"
        else
            echo "0"
        fi
        ;;
    *)
        echo "Usage: $0 {write|read|migrate|stats|status}"
        echo ""
        echo "  write <type> <task> <status> [rating] [files]"
        echo "  read [n] [type_filter] [agent_filter]"
        echo "  migrate     - Convert v1 diary.log → v2 diary.jsonl"
        echo "  stats       - Show aggregated statistics"
        echo "  status      - Show total entries"
        echo ""
        echo "Types: FEAT, FIX, REF, DOC, OPT, SEC, ANALYSIS"
        echo "Status: GO, NO-GO, WIP"
        echo ""
        echo "Env: MEMPALACE_AGENT=kimi|antigravity"
        ;;
esac

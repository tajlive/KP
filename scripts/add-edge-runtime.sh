#!/bin/bash
set -euo pipefail

echo "🔧 Adding Edge Runtime to all page.tsx files..."
echo ""

# Find all page.tsx files
FILES=$(find src/app -name "page.tsx" -type f)

COUNT=0
SKIPPED=0

for FILE in $FILES; do
  # Check if already has runtime export
  if grep -q "export const runtime" "$FILE"; then
    echo "  ⏭️  Skipped: $FILE (already has runtime)"
    ((SKIPPED++))
    continue
  fi
  
  # Check if file starts with "use client"
  if head -1 "$FILE" | grep -q "use client"; then
    # Insert after first line (after "use client")
    sed -i '' '1a\
\
export const runtime = '\''edge'\'';' "$FILE"
  else
    # Insert at line 1 (before anything else)
    sed -i '' '1i\
export const runtime = '\''edge'\'';\
' "$FILE"
  fi
  
  echo "  ✅ Updated: $FILE"
  ((COUNT++))
done

echo ""
echo "✅ Updated $COUNT files"
echo "⏭️  Skipped $SKIPPED files (already had runtime export)"

#!/bin/bash
set -e
cd /Users/taj/klarpakke
rm -f .git/index.lock
export GIT_PAGER=cat
git add src/types/supabase-generated.ts \
  .github/workflows/mcp-integration.yml \
  .github/workflows/schema-dump.yml
git status --short
git commit -m "fix(ci): regen types CLI 2.84.2 + mcp-readme write-perm + schema-dump DATABASE_URL guard"
git push origin main
echo "=== DONE ==="
git log --oneline -4

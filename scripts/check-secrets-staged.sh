#!/usr/bin/env bash
# Sjekker at ingen hemmeligheter er i staged filer. Kjører ved pre-commit.
set -e
STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
if [ -z "$STAGED" ]; then
  exit 0
fi
# Mønstre som ikke skal være i repo
PATTERNS='(DATABASE_URL=postgres|SUPABASE_SERVICE_ROLE_KEY=|CRON_SECRET=.+|STRIPE_SECRET_KEY=sk_|sk_live_|sk_test_[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})'
FOUND=
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.lock|*package-lock*|*.md|*.mdx|.env.example|docs/*) continue ;;
  esac
  if git show ":/$f" 2>/dev/null | grep -qE "$PATTERNS"; then
    echo "check-secrets-staged: Mulig hemmelighet i staged fil: $f"
    FOUND=1
  fi
done <<< "$STAGED"
if [ -n "$FOUND" ]; then
  echo "Fjern hemmeligheter fra de angitte filene."
  exit 1
fi
exit 0

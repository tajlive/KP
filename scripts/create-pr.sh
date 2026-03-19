#!/usr/bin/env bash
# Opprett eller vis PR for nåværende branch.
# Bruk: ./scripts/create-pr.sh [--fill | --body "tekst"]
# Krever: gh CLI (brew install gh) og gh auth login

set -e
cd "$(dirname "$0")/.."

BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo "❌ Du er på main. Bytt til en feature-branch først."
  exit 1
fi

EXISTS=$(gh pr list --head "$BRANCH" --json number --jq 'length' 2>/dev/null || echo "0")
if [ "$EXISTS" != "0" ]; then
  echo "✅ PR finnes allerede:"
  gh pr view --web 2>/dev/null || gh pr list --head "$BRANCH"
  exit 0
fi

# Generer tittel fra branch-navn (cursor/xxx -> xxx med mellomrom)
TITLE=$(echo "$BRANCH" | sed 's/^[^/]*\///' | tr '-' ' ')
TEMPLATE=".github/pull_request_template.md"

if [ -f "$TEMPLATE" ]; then
  gh pr create --base main --title "$TITLE" --body-file "$TEMPLATE" "$@"
else
  gh pr create --base main --title "$TITLE" "$@"
fi

echo "✅ PR opprettet. Åpner i nettleser..."
gh pr view --web

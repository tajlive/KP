#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="tomarnejensen/klarpakke"
BRANCH="${1:-main}"

# Krever GITLAB_TOKEN (Personal Access Token)
if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  echo "Mangler GITLAB_TOKEN. Opprett på: https://gitlab.com/-/profile/personal_access_tokens"
  exit 1
fi

curl -sS --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/$(echo $PROJECT_ID | sed 's/\//%2F/g')/pipelines?ref=$BRANCH&per_page=1" \
  | jq -r '.[0] | "Pipeline \(.id): \(.status) (\(.web_url))"'

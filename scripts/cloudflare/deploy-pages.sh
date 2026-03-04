#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CF_PAGES_PROJECT:-}" ]]; then
  echo "Mangler CF_PAGES_PROJECT (Pages project name)."
  exit 1
fi

OUTPUT_DIR="${CF_PAGES_OUTPUT_DIR:-out}"
BRANCH="${CF_PAGES_BRANCH:-main}"

if [[ ! -d "$OUTPUT_DIR" ]]; then
  echo "Fant ikke build output dir: $OUTPUT_DIR (kjør npm run build først)."
  exit 1
fi

out="$(mktemp)"
set +e
npx --yes wrangler@latest pages deploy "$OUTPUT_DIR" \
  --project-name "$CF_PAGES_PROJECT" \
  --branch "$BRANCH" \
  --commit-dirty=true 2>&1 | tee "$out"
rc=${PIPESTATUS[0]}
set -e
if [[ $rc -ne 0 ]]; then
  echo "Deploy feilet (rc=$rc)."
  exit $rc
fi

DEPLOY_URL="$(node -e "const fs=require('fs');const t=fs.readFileSync(process.argv[1],'utf8');const m=t.match(/https:\\/\\/[a-z0-9-]+\\.[a-z0-9-]+\\.pages\\.dev/);if(!m){process.exit(2)};process.stdout.write(m[0]);" "$out" || true)"
if [[ -z "$DEPLOY_URL" ]]; then
  echo "Klarte ikke finne deploy-URL i wrangler output."
  exit 1
fi

echo "$DEPLOY_URL"

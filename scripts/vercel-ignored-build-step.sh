#!/bin/bash
# Vercel Ignored Build Step
# Ref: https://vercel.com/docs/projects/overview#ignored-build-step
#
# Returnerer:
#   exit 0 = IGNORER dette bygget (ikke deploy)
#   exit 1 = BYGG (deploy)
#
# Brukes i Vercel Project Settings → Git → Ignored Build Step

set -e

COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null || echo "")
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "[Vercel Gate] Commit: $COMMIT_SHA"
echo "[Vercel Gate] Melding: $COMMIT_MSG"

# 1. Alltid bygg for force-deploy tagg
if echo "$COMMIT_MSG" | grep -q "\[force-deploy\]"; then
  echo "[Vercel Gate] force-deploy tag funnet — bygger"
  exit 1
fi

# 2. Alltid bygg for hotfix
if echo "$COMMIT_MSG" | grep -qi "hotfix"; then
  echo "[Vercel Gate] Hotfix-commit — bygger"
  exit 1
fi

# 3. Skip bygg for bot-commits (auto-fix commits) — disse trigger eget bygg etter
if echo "$COMMIT_MSG" | grep -q "\[skip ci\]"; then
  echo "[Vercel Gate] skip ci tag — ignorer bygg"
  exit 0
fi

# 4. Standard: bygg alltid (la TypeScript-feilen bli fanget av Vercel som siste backup)
echo "[Vercel Gate] Standard commit — bygger"
exit 1

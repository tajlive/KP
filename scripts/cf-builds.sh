#!/bin/bash
# cf-builds.sh — les Workers Builds-status for klarpakke (prod).
#
# KREVER Global API Key (cfk_): Workers Builds-API-et godtar IKKE API-tokens
# (12006 "Invalid token" uansett scope — verifisert 2026-08-06, kun X-Auth-Email
# + X-Auth-Key fungerer). Hent key: dash.cloudflare.com → My Profile → API Tokens
# → Global API Key (krever passord/passkey). Legg i .env.local:
#   CLOUDFLARE_GLOBAL_API_KEY="cfk_..."
#   CLOUDFLARE_EMAIL="tom@..."
#
# Riktige endepunkter (ikke /builds/workers/{tag}/builds som eldre notater sier):
#   GET /accounts/{acc}/builds/builds/latest          → siste builds pr. script
#   GET /accounts/{acc}/builds/builds                 → builds pr. versjon-ID
#   GET /accounts/{acc}/builds/account/limits         → build-minutter/limits
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
source .env.local 2>/dev/null || true
set +a

if [ -z "${CLOUDFLARE_GLOBAL_API_KEY:-}" ] || [ -z "${CLOUDFLARE_EMAIL:-}" ]; then
  echo "❌ Mangler CLOUDFLARE_GLOBAL_API_KEY / CLOUDFLARE_EMAIL i .env.local" >&2
  exit 1
fi
: "${CLOUDFLARE_ACCOUNT_ID:?Mangler CLOUDFLARE_ACCOUNT_ID i .env.local}"

MODE="${1:-latest}"   # latest | all | limits
case "$MODE" in
  latest) ENDPOINT="builds/builds/latest" ;;
  all)    ENDPOINT="builds/builds" ;;
  limits) ENDPOINT="builds/account/limits" ;;
  *) echo "Bruk: $0 [latest|all|limits]" >&2; exit 1 ;;
esac

curl -s -m 30 \
  -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" \
  -H "X-Auth-Key: ${CLOUDFLARE_GLOBAL_API_KEY}" \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/${ENDPOINT}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('success'):
    print('❌ API-feil:', d.get('errors')); sys.exit(1)
r = d.get('result') or {}
builds = r.get('builds') or {}
if isinstance(builds, dict):
    for script, b in builds.items():
        if isinstance(b, list):
            for x in b[:3]:
                meta = x.get('build_trigger_metadata') or {}
                print(f\"{script}: {x.get('status')} | {x.get('build_outcome')} | {meta.get('commit_hash','')[:8]} | {meta.get('commit_message','')[:60]}\")
        else:
            print(f'{script}:', json.dumps(b)[:200])
else:
    print(json.dumps(r, indent=1)[:2000])
"

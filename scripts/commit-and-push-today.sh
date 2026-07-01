#!/bin/bash
# commit-and-push-today.sh
# Committer og pusher alle dagens endringer til main
# 2026-03-27
set -e

cd /Users/taj/klarpakke

echo "=== GIT STATUS ==="
git status --short

echo ""
echo "=== STAGE ALLE ENDRINGER ==="

# Stage dagens kjernearbeide (CI-gate + policy)
git add .github/workflows/db-status.yml
git add .github/workflows/pr-check.yml
git add scripts/db-status-gate.mjs
git add scripts/db-lint-gate.mjs
git add supabase/migrations/999_fix_materialized_view.sql
git add docs/MIGRATION-POLICY.md
git add docs/FULL-AUTOMATION-PLAYBOOK.md
git add package.json

# Stage andre endringer (ikke-kritiske docs og kode)
git add docs/SUPABASE-OPPDATERING-OG-OPTIMALISERING.md
git add docs/automation/AUTOMATION-RUNBOOK.md
git add docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md
git add docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md
git add supabase/migrations/20260327103000_fix_store_binance_keys_vault_permissions.sql
git add supabase/migrations/20260327114000_deprecate_store_binance_keys_rpc.sql
# supabase/.temp er i .gitignore - skip

# Stage kode-endringer
git add src/
git add e2e/

# Stage MCP-konfig (ikke secrets)
git add .cursor/mcp.json
git add .kimi/mcp-config.json
git add .kimi/README-MCP.md
git add .mcp/mcp_config.json
git add scripts/validate-mcp-config.mjs
git add scripts/mcp-test-report.txt
git add scripts/run-filesystem-mcp.mjs
git add scripts/run-perplexity-mcp.mjs

# .env.local.example er trygt (eksempel-fil)
git add .env.local.example

echo ""
echo "=== STAGED FILER ==="
git --no-pager diff --cached --stat

echo ""
echo "=== COMMIT ==="
git commit -m "ci(db): db-status-gate workflow + migration policy + Supabase CLI 2.84.2

- Ny .github/workflows/db-status.yml: standalone PR-gate for migrasjonsstatus
- Oppdatert pr-check.yml: db-status-check jobb (parallell med quick-check)
- scripts/db-status-gate.mjs: migration list --linked, dual parser, binary autodetect, 60s timeout
- supabase/migrations/999_fix_materialized_view.sql: FROZEN header lagt til
- docs/MIGRATION-POLICY.md: allowlist-policy dokumentert
- docs/FULL-AUTOMATION-PLAYBOOK.md: siste kjoering 2026-03-27 oppdatert
- Supabase CLI: 2.78.1 -> 2.84.2 (brew upgrade)

Verifisert:
  npm run db:status:gate -> allowlisted=0 blocking=0 -> pass
  172 migrasjoner synket local=remote"

echo ""
echo "=== PUSH TIL MAIN ==="
git push origin main

echo ""
echo "=== FERDIG ==="
git log --oneline -3

# Klarpakke Repo Analyse Report
Generert: 2026-04-03T07:21:43+02:00

=== GIT METRIKKER ===
```
418c5e2ba upgrade: Node 22.22.1 LTS + npm audit clean [KLA-255]
9b8166a73 chore: add repo analysis pipeline [KLA-253]
eadf83e90 KLA-252: P0 trading auth refactor + unified execution + docs
200d7b7df HOTFIX #9: Fix paper bot start - add missing credentials
e7b473acd HOTFIX #8: Fix auth token expiration and 401 errors
748b0a68b HOTFIX #7: Add API client with 401 auth error handling (KLA-PROFIT1)
6478e61d9 docs: Update KLA-PROFIT1/2 docs + add missing i18n disclaimers (th, zh, en)
f0deff295 feat(tests): Add comprehensive scroll validation tests (KLA-PROFIT1)
6e3cc09f3 HOTFIX #6: Add overflow-y-auto to main element (KLA-PROFIT1)
adfa939d8 HOTFIX #5: Fix cookie domain consistency + add /settings to protected paths (KLA-PROFIT1)
917532283 HOTFIX #4: Consolidate Sentry init to single source (KLA-PROFIT1)
8de58a7bb HOTFIX #3: Fix nested scroll containers blocking dashboard scroll (KLA-PROFIT1)
8faf75c58 HOTFIX #2: Fix Sentry double-init + scroll blocking CSS (KLA-PROFIT1)
d813b8e24 HOTFIX: Fix scroll blocking on dashboard pages (KLA-PROFIT1)
fece2de7b KLA-PROFIT1: Ensemble AI metrics + merge gate (#61)
ab6fcdc02 ci: daily MCP health → Linear comment [KLA-251]
c7f3f48ae fix(mcp): update health check, edge function stats + disable verify_jwt [KLA-251]
f750f59ea fix(mcp-health): support KLARPAKKE_MCP_SECRET (edge function env) [KLA-251]
b61ea5e53 ci: add MCP edge-function check + Linear comment to mcp-health [KLA-251]
5be93dbd1 KLA-LAUNCH: CI + Stripe + MCP health (#60)
```

Git status:
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   analyze-report.md
	modified:   e2e/smoke/launch-critical.spec.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	launch-report.md

no changes added to commit (use "git add" and/or "git commit -a")
```

=== FILSTRUKTUR ===
- TypeScript-filer i src/: 1026
- TS/JS-filer totalt (ekskl. node_modules): 2017

=== NODE/VERSJONER ===
- Node: v22.22.1
- NPM: 10.9.4

=== LINT & TYPE-CHECK ===
- ✅ ESLint: OK
- ✅ Type-check: OK

=== NPM AUDIT (high+) ===
```
# npm audit report

elliptic  *
Elliptic Uses a Cryptographic Primitive with a Risky Implementation - https://github.com/advisories/GHSA-848j-6mx2-7j84
fix available via `npm audit fix --force`
Will install @storybook/nextjs@7.0.14, which is a breaking change
node_modules/elliptic
  browserify-sign  >=2.4.0
  Depends on vulnerable versions of elliptic
  node_modules/browserify-sign
    crypto-browserify  >=3.4.0
    Depends on vulnerable versions of browserify-sign
    Depends on vulnerable versions of create-ecdh
    node_modules/crypto-browserify
      node-polyfill-webpack-plugin  <=4.0.0
      Depends on vulnerable versions of crypto-browserify
      node_modules/node-polyfill-webpack-plugin
        @storybook/nextjs  <=0.0.0-pr-34428-sha-d7a905aa || >=7.0.15
        Depends on vulnerable versions of node-polyfill-webpack-plugin
        node_modules/@storybook/nextjs
  create-ecdh  *
  Depends on vulnerable versions of elliptic
  node_modules/create-ecdh

6 low severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force
```

=== SUPABASE STATS (via REST API) ===
- auto_trade_log (failed): 0
- trades (avvikende status): 0

=== PLAYWRIGHT E2E ===
- ✅ Playwright smoke-chromium: OK (  28 passed (59.2s))

=== SAMMENDRAG ===
- Lint OK: true
- Type-check OK: true
- Playwright OK: true
- Failed trades (auto_trade_log): 0

✅ Ingen kritiske feilede trades (>5). Ingen Linear-issue nødvendig.

---

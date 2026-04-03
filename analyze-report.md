# Klarpakke Repo Analyse Report
Generert: 2026-04-03T07:03:04+02:00

=== GIT METRIKKER ===
```
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
023beb960 feat(funding): KLA-246 cross-exchange arb dashboard (conservative, realistic)
```

Git status:
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/analyze.yml
	modified:   .nvmrc
	modified:   analyze-report.md
	modified:   package-lock.json
	modified:   package.json

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	analyze-report-v2.md

no changes added to commit (use "git add" and/or "git commit -a")
```

=== FILSTRUKTUR ===
- TypeScript-filer i src/: 1026
- TS/JS-filer totalt (ekskl. node_modules): 2062

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
- ⚠️ Playwright smoke-chromium:   3 passed (34.6s) (1 kjent feil: meta-description strict mode)
Siste 40 linjer fra Playwright logg:
```
    ║ <3 Playwright Team                                         ║
    ╚════════════════════════════════════════════════════════════╝

    Error Context: test-results/smoke-launch-critical-Ingen-MISSING-MESSAGE-console-errors-smoke-chromium-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/smoke-launch-critical-Ingen-MISSING-MESSAGE-console-errors-smoke-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/smoke-launch-critical-Ingen-MISSING-MESSAGE-console-errors-smoke-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  25 failed
    [smoke-chromium] › e2e/smoke/final-launch.spec.ts:5:1 › Landing /: laster og har CTA ───────────
    [smoke-chromium] › e2e/smoke/final-launch.spec.ts:10:1 › Landing /en: laster ───────────────────
    [smoke-chromium] › e2e/smoke/final-launch.spec.ts:15:1 › Prisside: laster ──────────────────────
    [smoke-chromium] › e2e/smoke/final-launch.spec.ts:20:1 › Innlogging: viser loginskjema ─────────
    [smoke-chromium] › e2e/smoke/final-launch.spec.ts:27:1 › Ingen MISSING_MESSAGE errors ──────────
    [smoke-chromium] › e2e/smoke/health.spec.ts:32:3 › Smoke: Health Checks @smoke › homepage loads without errors 
    [smoke-chromium] › e2e/smoke/health.spec.ts:70:3 › Smoke: Health Checks @smoke › login page is accessible 
    [smoke-chromium] › e2e/smoke/health.spec.ts:81:3 › Smoke: Health Checks @smoke › leaderboard page loads 
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /no ─────────
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /en ─────────
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /no/dashboard 
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /en/dashboard 
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /no/priser ──
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /en/priser ──
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /no/innlogging 
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:18:3 › Ingen MISSING_MESSAGE på /en/innlogging 
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:34:1 › Håndterer korrupt localStorage uten reload-loop 
    [smoke-chromium] › e2e/smoke/i18n-coverage.spec.ts:77:1 › Kun en navbar rendres per side ───────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:5:1 › Landing NO: laster og har CTA ───────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:14:1 › Landing EN: laster og har CTA ──────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:19:1 › Prisside: laster ───────────────────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:28:1 › Innlogging: viser loginskjema ──────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:47:1 › Paper trading: side laster ─────────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:56:1 › Landing: har meta description ──────
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:65:1 › Ingen MISSING_MESSAGE console errors 
  3 passed (34.6s)
```

=== SAMMENDRAG ===
- Lint OK: true
- Type-check OK: true
- Playwright OK: false
- Failed trades (auto_trade_log): 0

✅ Ingen kritiske feilede trades (>5). Ingen Linear-issue nødvendig.

---

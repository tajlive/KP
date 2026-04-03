# Klarpakke Repo Analyse Report
Generert: 2026-04-03T06:49:06+02:00

=== GIT METRIKKER ===
```
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
6d8f82840 feat(trading): optimal Kelly+ATR engine 2026 style KLA-251
```

Git status:
```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	analyze-report.md
	repo-analyze.sh

nothing added to commit but untracked files present (use "git add" to track)
```

=== FILSTRUKTUR ===
- TypeScript-filer i src/: 1026
- TS/JS-filer totalt (ekskl. node_modules): 2052

=== NODE/VERSJONER ===
- Node: v22.22.1
- NPM: 10.9.4

=== LINT & TYPE-CHECK ===
- ✅ ESLint: OK
- ✅ Type-check: OK

=== NPM AUDIT (high+) ===
```
# npm audit report

brace-expansion  <=1.1.12 || 2.0.0 - 2.0.2 || 4.0.0 - 5.0.4
Severity: moderate
brace-expansion: Zero-step sequence causes process hang and memory exhaustion - https://github.com/advisories/GHSA-f886-m6hf-6m8v
brace-expansion: Zero-step sequence causes process hang and memory exhaustion - https://github.com/advisories/GHSA-f886-m6hf-6m8v
brace-expansion: Zero-step sequence causes process hang and memory exhaustion - https://github.com/advisories/GHSA-f886-m6hf-6m8v
fix available via `npm audit fix`
node_modules/@eslint/config-array/node_modules/brace-expansion
node_modules/@eslint/eslintrc/node_modules/brace-expansion
node_modules/brace-expansion
node_modules/depcheck/node_modules/brace-expansion
node_modules/eslint-plugin-import/node_modules/brace-expansion
node_modules/eslint-plugin-jsx-a11y/node_modules/brace-expansion
node_modules/eslint-plugin-react/node_modules/brace-expansion
node_modules/eslint/node_modules/brace-expansion
node_modules/lighthouse/node_modules/brace-expansion
node_modules/multimatch/node_modules/brace-expansion

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

lodash  <=4.17.23
Severity: high
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` - https://github.com/advisories/GHSA-f23m-r3pf-42rh
fix available via `npm audit fix`
node_modules/lodash

lodash-es  <=4.17.23
Severity: high
lodash vulnerable to Code Injection via `_.template` imports key names - https://github.com/advisories/GHSA-r5fr-rjxr-66jc
lodash vulnerable to Prototype Pollution via array path bypass in `_.unset` and `_.omit` - https://github.com/advisories/GHSA-f23m-r3pf-42rh
fix available via `npm audit fix`
node_modules/lodash-es

path-to-regexp  <=0.1.12 || 8.0.0 - 8.3.0
Severity: high
path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters - https://github.com/advisories/GHSA-37ch-88jc-xwx2
path-to-regexp vulnerable to Denial of Service via sequential optional groups - https://github.com/advisories/GHSA-j3q9-mxjg-w52f
path-to-regexp vulnerable to Regular Expression Denial of Service via multiple wildcards - https://github.com/advisories/GHSA-27v5-c462-wpq7
fix available via `npm audit fix`
node_modules/path-to-regexp
node_modules/router/node_modules/path-to-regexp

storybook  8.0.0 - 8.6.16
Severity: high
Storybook manager bundle may expose environment variables during build - https://github.com/advisories/GHSA-8452-54wp-rmv6
Storybook Dev Server is Vulnerable to WebSocket Hijacking - https://github.com/advisories/GHSA-mjf5-7g4m-gx5w
fix available via `npm audit fix`
node_modules/storybook

11 vulnerabilities (6 low, 1 moderate, 4 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force
```

=== SUPABASE STATS (via REST API) ===
- auto_trade_log (failed): 0
- trades (avvikende status): 0

=== PLAYWRIGHT E2E ===
- ⚠️ Playwright smoke-chromium:   27 passed (1.0m) (1 kjent feil: meta-description strict mode)
Siste 40 linjer fra Playwright logg:
```
    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: locator.getAttribute: Error: strict mode violation: locator('meta[name="description"]') resolved to 2 elements:
        1) <meta name="description" content="Kurs, papirhandel og auto-handel på norsk. Start gratis med 100 000 kr i lekepenger — uten kredittkort."/> aka locator('head meta[name="description"]')
        2) <meta name="description" content="Lær å handle på kryptobørs med Klarpakkets kurs. Forstå markeder, risiko og strategier for å bygge din økonomiske fremtid."/> aka locator('body meta[name="description"]')

    Call log:
    [2m  - waiting for locator('meta[name="description"]')[22m


      58 |   const meta = await page
      59 |     .locator('meta[name="description"]')
    > 60 |     .getAttribute("content");
         |      ^
      61 |   expect(meta).toBeTruthy();
      62 |   expect(meta!.length).toBeGreaterThan(50);
      63 | });
        at /Users/taj/klarpakke/e2e/smoke/launch-critical.spec.ts:60:6

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/smoke-launch-critical-Landing-har-meta-description-smoke-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/smoke-launch-critical-Landing-har-meta-description-smoke-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/smoke-launch-critical-Landing-har-meta-description-smoke-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/smoke-launch-critical-Landing-har-meta-description-smoke-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/smoke-launch-critical-Landing-har-meta-description-smoke-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [smoke-chromium] › e2e/smoke/launch-critical.spec.ts:56:1 › Landing: har meta description ──────
  27 passed (1.0m)
```

=== SAMMENDRAG ===
- Lint OK: true
- Type-check OK: true
- Playwright OK: false
- Failed trades (auto_trade_log): 0

✅ Ingen kritiske feilede trades (>5). Ingen Linear-issue nødvendig.

---

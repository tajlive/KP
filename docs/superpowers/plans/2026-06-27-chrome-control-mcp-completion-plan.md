# Chrome Control MCP Server — Completion Plan

**Date:** 2026-06-27  
**Plan for:** Klarpakke project (`/Users/taj/klarpakke`)  
**Design spec:** `docs/superpowers/specs/2026-06-27-browser-control-mcp-design.md`  

---

## 1. Current State Summary

The Chrome Control MCP server is already mostly implemented. The following are **already in place**:

| Area | Status |
|---|---|
| `scripts/chrome-mcp-server.mjs` | Implemented with most tools, persistent profile, logging, snapshot |
| `scripts/run-chrome-mcp.mjs` | Verifies `MCP_API_KEY` and Playwright installation |
| `.kimi/mcp-config.json` | Chrome server already activated |
| `.mcp/mcp_config.json`, `.cursor/mcp.json`, `.claude/mcp.json`, `.perplexity/mcp_config.json` | Already synced with chrome server |
| `.kimi/commands.json` | `browser` alias already exists |
| `docs/CHROME-CONTROL.md` | Comprehensive documentation already exists |
| `scripts/chrome-mcp-smoke-test.mjs` | Standalone chrome smoke test exists |
| `scripts/chrome-mcp-import-session.mjs` | Profile import helper exists |
| `scripts/chrome-mcp-validate-profile.mjs` | Profile validator exists |

The remaining gaps that must be closed to satisfy the design spec are:

1. **`chrome_evaluate` bypasses the approval gate** — it executes immediately instead of requiring `chrome_approve`.
2. **`chrome_navigate` uses a separate `pendingNavigateUrl` variable** instead of the unified `pendingAction` flow described in the spec.
3. **`scripts/mcp-smoke-test.mjs` only tests `initialize` + `tools/list`** — it does not exercise the chrome-specific sequence from the spec.
4. **`.env-templates/` lacks Chrome MCP variables** — `MCP_API_KEY`, `CHROME_MCP_ALLOWLIST`, `CHROME_MCP_PROFILE_MODE`, `CHROME_CDP_URL` are not documented.
5. **`.kimi/commands.json` only has `browser`** — the spec also wants a `chrome` alias.

---

## 2. Files to Create / Modify

| File | Action | Why |
|---|---|---|
| `scripts/chrome-mcp-server.mjs` | Modify | Unify pending-action flow; make `chrome_evaluate` confirm-class; fix navigate pending handling |
| `scripts/mcp-smoke-test.mjs` | Modify | Add chrome-specific smoke sequence (start → navigate → snapshot → screenshot → stop) |
| `.env-templates/.env.local.example` | Modify | Add Chrome MCP environment variables |
| `.kimi/commands.json` | Modify | Add `chrome` alias alongside existing `browser` alias |
| `docs/CHROME-CONTROL.md` | Minor update | Update tool table to reflect confirm-class for `chrome_evaluate`; mention new `chrome` alias |
| `.kimi/mcp-config.json`, `.mcp/mcp_config.json`, `.cursor/mcp.json`, `.claude/mcp.json`, `.perplexity/mcp_config.json` | Verify / re-sync | Already contain chrome server; run `npm run mcp:sync` after any config change |

No new files need to be created.

---

## 3. Exact Changes Needed

### 3.1 `scripts/chrome-mcp-server.mjs`

#### 3.1.1 Unify pending action state

**Current:** Two separate state variables:
```js
let pendingAction = null;
let pendingNavigateUrl = null;
```

**Change:** Replace with a single `pendingAction` object that can represent either a write operation or a navigation approval:

```js
/** @type {{ type: string; args: Record<string, any> } | null} */
let pendingAction = null;
```

Navigation approvals should be stored as:
```js
pendingAction = { type: "navigate", args: { url } };
```

Remove `pendingNavigateUrl` entirely.

#### 3.1.2 Make `chrome_evaluate` require approval

**Current:** `handleEvaluate` executes the script immediately.

**Change:** Convert `handleEvaluate` to create a pending action:

```js
async function handleEvaluate(args) {
  const userScript = String(args.script || "");
  if (!userScript) throw new Error("script is required");
  return createPendingAction("evaluate", { script: userScript });
}
```

Then add an `evaluate` branch in `executePendingAction`:

```js
case "evaluate": {
  const page = getCurrentPage();
  const wrapped = `
    (async () => {
      try {
        return { ok: true, result: await (${action.args.script}) };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    })()
  `;
  const value = await page.evaluate(wrapped);
  if (value && typeof value === "object" && !value.ok) {
    throw new Error(value.error || "Script evaluation failed");
  }
  return { ok: true, executed: "evaluate", result: value?.result ?? value };
}
```

#### 3.1.3 Refactor `handleNavigate` to use unified pending action

**Current:** Sets `pendingNavigateUrl` when domain is not allowlisted.

**Change:** Use `pendingAction`:

```js
async function handleNavigate(args) {
  const url = String(args.url || "");
  const validation = validateNavigateUrl(url);

  if (!validation.ok) {
    if (validation.pendingUrl) {
      pendingAction = { type: "navigate", args: { url: validation.pendingUrl } };
      return {
        ok: true,
        pending: true,
        message:
          `Domain ${validation.urlObj?.hostname || url} is not allowlisted. ` +
          `Run chrome_approve({approve:true}) to approve this domain for the session, ` +
          `or chrome_approve({approve:false}) to reject.`,
      };
    }
    throw new Error(validation.error);
  }

  const page = getCurrentPage();
  await page.goto(url, { waitUntil: args.waitUntil || "domcontentloaded" });
  const title = await page.title().catch(() => "");
  const finalUrl = page.url();
  return { ok: true, title, url: finalUrl };
}
```

#### 3.1.4 Refactor `handleApprove` to dispatch unified pending actions

**Current:** Branches on `pendingAction` vs `pendingNavigateUrl`.

**Change:** Single dispatch:

```js
async function handleApprove(args) {
  const approved = args.approve === true;

  if (!approved) {
    const rejected = pendingAction;
    pendingAction = null;
    return {
      ok: true,
      approved: false,
      message: rejected ? "Action rejected." : "Nothing to reject.",
    };
  }

  if (!pendingAction) {
    return { ok: true, approved: true, message: "Nothing pending to approve." };
  }

  const action = pendingAction;
  pendingAction = null;

  if (action.type === "navigate") {
    const urlObj = parseUrl(action.args.url);
    if (urlObj && urlObj.hostname) {
      sessionApprovedHosts.add(urlObj.hostname);
    }
    return await handleNavigate({ url: action.args.url });
  }

  return await executePendingAction(action);
}
```

#### 3.1.5 Update tool description for `chrome_evaluate`

Change the description to indicate it requires approval.

---

### 3.2 `scripts/mcp-smoke-test.mjs`

Currently the smoke test only verifies that each MCP server can be initialized and returns a tool list. Extend it with a chrome-specific sequence **after** the generic `initialize` + `tools/list` check passes.

Add a new helper `testChromeSequence()` that:

1. Sends `chrome_start` with `{ headless: true, profileMode: "clean" }`.
2. Sends `chrome_navigate` with `{ url: "https://www.klarpakke.no/no", waitUntil: "domcontentloaded" }`.
3. Sends `chrome_snapshot`.
4. Sends `chrome_screenshot`.
5. Sends `chrome_stop`.
6. Verifies each response has `ok: true` (or `pending: false` for navigate).

Call `testChromeSequence` only for the `chrome` server, after the generic check passes. Use a longer timeout (e.g., 60 seconds).

---

### 3.3 `.env-templates/.env.local.example`

Add a new section:

```bash
# ── Chrome Control MCP ──
# Required by scripts/run-chrome-mcp.mjs
MCP_API_KEY=your_mcp_api_key_here

# Optional: comma-separated list of domains allowed for navigation
# Defaults to klarpakke.no,www.klarpakke.no
CHROME_MCP_ALLOWLIST=klarpakke.no,www.klarpakke.no

# Optional: default profile mode for chrome_start when not specified
# Allowed: clean | copy | cdp | storage
CHROME_MCP_PROFILE_MODE=clean

# Optional: CDP endpoint when using profileMode='cdp'
# Defaults to http://127.0.0.1:9222
CHROME_CDP_URL=http://127.0.0.1:9222
```

---

### 3.4 `.kimi/commands.json`

Add a `chrome` alias next to the existing `browser` alias:

```json
"browser": {
  "description": "Start Chrome Control MCP-serveren for KIMI (krever MCP_API_KEY)",
  "command": "npm run chrome:mcp"
},
"chrome": {
  "description": "Start Chrome Control MCP-serveren for KIMI (krever MCP_API_KEY)",
  "command": "npm run chrome:mcp"
}
```

---

### 3.5 `docs/CHROME-CONTROL.md`

Update the tool table row for `chrome_evaluate` to confirm-class. Add note about unified approval flow in the "Sikkerhetsmodell" section. Add the new `chrome` alias under "Oppsett".

---

### 3.6 MCP Config Re-sync

After any config changes, run:

```bash
npm run mcp:sync
npm run mcp:validate-config
```

---

## 4. Testing Steps

### 4.1 Static validation

```bash
npm run mcp:validate-config
```

Expected: `✅ MCP-konfigurasjon OK`.

### 4.2 Start the server manually

```bash
npm run chrome:mcp
```

Expected: Server starts without errors.

### 4.3 Standalone chrome smoke test

```bash
node scripts/chrome-mcp-smoke-test.mjs
```

Expected: `✅ Smoke test completed successfully`.

### 4.4 Full MCP smoke test

```bash
npm run mcp:smoke
```

Expected: All MCP servers pass, including the new chrome-specific sequence.

### 4.5 Manual KIMI verification

From KIMI CLI:

1. `chrome_start` → returns `ok: true`
2. `chrome_navigate` to `https://www.klarpakke.no/no` → returns `ok: true`
3. `chrome_snapshot` → returns title, url, and non-empty `snapshot` array
4. `chrome_screenshot` → returns base64 PNG
5. `chrome_evaluate` with `script: "document.title"` → returns `pending: true`
6. `chrome_approve` with `approve: true` → returns evaluated result
7. `chrome_click` on a snapshot ref → returns `pending: true`
8. `chrome_approve` with `approve: true` → executes click
9. `chrome_stop` → returns `ok: true`

---

## 5. Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `chrome_evaluate` now requires approval, breaking existing workflows | Medium | Medium | Update docs clearly; spec explicitly requires this |
| `mcp:smoke` test becomes slow/flaky | Medium | Medium | Use `headless: true`; increase timeout to 60s |
| Profile import fails because Chrome is running | High (local) | Low | Tool already checks `SingletonLock`; document `profileMode: "cdp"` |
| Playwright Chromium not installed | Medium | High | `run-chrome-mcp.mjs` already checks; document `npx playwright install chromium` |
| `MCP_API_KEY` missing | Medium | Medium | `run-chrome-mcp.mjs` exits gracefully; `.env-templates` update documents it |
| MCP configs get out of sync | Medium | Low | Always run `npm run mcp:sync` and `npm run mcp:validate-config` |

---

## 6. Definition of Done

- [ ] `scripts/chrome-mcp-server.mjs` uses a single `pendingAction` state variable.
- [ ] `chrome_evaluate` returns `pending: true` and requires `chrome_approve`.
- [ ] `chrome_navigate` for non-allowlisted domains uses the unified pending action flow.
- [ ] `chrome_approve` dispatches both write operations and navigation approvals.
- [ ] `scripts/mcp-smoke-test.mjs` exercises the chrome sequence from the design spec.
- [ ] `.env-templates/.env.local.example` documents Chrome MCP env vars.
- [ ] `.kimi/commands.json` contains both `browser` and `chrome` aliases.
- [ ] `docs/CHROME-CONTROL.md` reflects confirm-class status of `chrome_evaluate`.
- [ ] `npm run mcp:validate-config` passes.
- [ ] `npm run chrome:mcp` starts without errors.
- [ ] `node scripts/chrome-mcp-smoke-test.mjs` passes.
- [ ] `npm run mcp:smoke` passes.
- [ ] All MCP config files are re-synced via `npm run mcp:sync`.

---

## 7. Implementation Order

1. Refactor `scripts/chrome-mcp-server.mjs` pending-action flow.
2. Update tool descriptions in `scripts/chrome-mcp-server.mjs`.
3. Extend `scripts/mcp-smoke-test.mjs` with chrome sequence.
4. Update `.env-templates/.env.local.example`.
5. Add `chrome` alias to `.kimi/commands.json`.
6. Update `docs/CHROME-CONTROL.md`.
7. Run `npm run mcp:sync`.
8. Run `npm run mcp:validate-config`.
9. Run `node scripts/chrome-mcp-smoke-test.mjs`.
10. Run `npm run mcp:smoke`.
11. Manual KIMI verification.

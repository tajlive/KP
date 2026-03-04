# Contract-Driven Webflow Automation

**Status:** ✅ Production Ready
**Latest Update:** 2026-01-31

---

## 🎯 Overview

This is the **source of truth** for automating Webflow page creation and DOM anchor setup. It's designed to be used frequently as the project evolves.

### The Contract

The **contract file** (`webflow/contract/klarpakke-pages.v1.json`) is machine-readable JSON that defines:
- ✅ All pages that should exist
- ✅ All DOM anchors (IDs + data-* attributes) each page needs
- ✅ Element structure (tag types, attributes)

### Why This Matters

Instead of "copy/paste" instructions:
1. **Define once** - Pages/anchors in JSON contract
2. **Automate always** - Designer Extension reads contract
3. **Idempotent** - Safe to run multiple times
4. **Testable** - CI validates contract syntax/structure
5. **Scalable** - Easy to add new pages/phases

---

## 🏗️ Architecture

### Files

```
webflow/
├── contract/
│   └── klarpakke-pages.v1.json      ← THE SOURCE OF TRUTH
│
├── auth.js                           ← Reads DOM anchors from contract
├── login.js                          ← Expects certain IDs/data-*
├── app-with-auth.js                 ← Expects signals-container, etc.
└── ...

docs/
├── CONTRACT-DRIVEN-WEBFLOW.md        ← This file
├── WEBFLOW-DESIGNER-EXTENSION-AUTOMATION.md  ← Runbook
└── ONE-CLICK-DEPLOY.md              ← Uses contract

.github/
├── workflows/
│   └── validate-webflow-contract.yml ← CI validation
└── ISSUE_TEMPLATE/
    └── webflow-contract-change.md    ← Template for changes

prompts/
└── CLAUDE_CODE_WEBFLOW_DESIGNER_EXTENSION.md ← Implementation guide
```

### Contract Structure

```json
{
  "contractVersion": "1.0.0",
  "notes": "Describes pages + DOM anchors for Webflow",
  "pages": [
    {
      "path": "/app/dashboard",
      "name": "Dashboard",
      "anchors": [
        {
          "kind": "root",
          "tag": "div",
          "attrs": {
            "id": "klarpakke-dashboard-root",
            "data-kp-root": "dashboard"
          }
        },
        {
          "kind": "signals",
          "tag": "div",
          "attrs": {
            "data-signals-container": ""
          }
        }
      ]
    }
  ]
}
```

### What Each Field Means

| Field | Purpose | Example |
|-------|---------|---------|
| `kind` | Semantic type (for docs/tooling) | `"root"`, `"signals"`, `"toggle"` |
| `tag` | HTML element type | `"div"`, `"input"`, `"span"` |
| `attrs` | Required attributes (IDs + data-*) | `{ "id": "...", "data-x": "" }` |

---

## 🔄 Workflow: Add New Page

### Step 1: Update Contract

Edit `webflow/contract/klarpakke-pages.v1.json`:

```json
{
  "path": "/app/newpage",
  "name": "New Page",
  "anchors": [
    {
      "kind": "root",
      "tag": "div",
      "attrs": {
        "id": "klarpakke-newpage-root",
        "data-kp-root": "newpage"
      }
    },
    {
      "kind": "customElement",
      "tag": "div",
      "attrs": {
        "id": "custom-element"
      }
    }
  ]
}
```

### Step 2: Create Issue

Use template: **"🔧 Webflow Contract Change"**

```
Title: [Contract] Add page: /app/newpage
- [ ] Updated webflow/contract/klarpakke-pages.v1.json
- [ ] Tested JSON is valid
- [ ] CI validation passed
```

### Step 3: Merge to Main

CI will:
1. ✅ Validate JSON syntax
2. ✅ Check schema (all required fields present)
3. ✅ Verify no duplicate paths
4. ✅ Test anchor format

### Step 4: Run Designer Extension

In Webflow Designer:
1. Open "Apps" → "Klarpakke Scaffolder"
2. Click "Create/Repair Pages"
3. Extension reads contract from `main` branch
4. Creates/repairs pages + anchors
5. Shows report (created/updated/skipped)

### Step 5: Verify & Publish

- [ ] Test on staging
- [ ] Verify anchors exist in DOM
- [ ] Check JavaScript finds them (no console errors)
- [ ] Publish to production

---

## 💡 Current Contract (v1.0.0)

### MVP Pages (Phase 1)

```
/ (Home)
  └─ klarpakke-home-root

/signup (Signup)
  └─ klarpakke-signup-root

/app/dashboard (Dashboard)
  ├─ klarpakke-dashboard-root
  └─ data-signals-container

/app/settings (Settings)
  ├─ klarpakke-settings-root
  ├─ data-safe-mode-toggle
  ├─ data-safe-mode-status
  └─ data-safe-mode-info

/app/kalkulator (Calculator)
  └─ klarpakke-calculator-root
```

### Future Pages (Phase 2+)

As you add:
- `/app/history` → Add contract entry
- `/app/profile` → Add contract entry
- `/reset-password` → Add contract entry
- etc.

---

## 🔗 How JavaScript Uses the Contract

### Example: `webflow/auth.js`

```javascript
// Expects these elements to exist (defined in contract)
const dashboardRoot = document.getElementById('klarpakke-dashboard-root');
const signalsContainer = document.querySelector('[data-signals-container]');
const safeModeToggle = document.querySelector('[data-safe-mode-toggle]');

// JavaScript fails gracefully if elements missing
if (!dashboardRoot) {
  console.error('Dashboard root not found - page not scaffolded?');
}
```

### Why This Matters

1. **No hardcoded assumptions** - Contract is the source
2. **Clear dependencies** - "This script needs these anchors"
3. **Easy debugging** - If anchor missing, contract shows what should exist

---

## ✅ Validation

### CI Checks (Automatic)

When you push to contract file:

```bash
# 1. JSON syntax valid?
npm validate:contract

# 2. Schema correct?
python3 validate_contract.py

# 3. No duplicate paths?
grep -c '"path"' webflow/contract/klarpakke-pages.v1.json

# 4. All anchors properly formatted?
jq '.pages[].anchors[].attrs' webflow/contract/klarpakke-pages.v1.json
```

### Local Testing

```bash
# Validate locally
python3 << 'EOF'
import json
with open('webflow/contract/klarpakke-pages.v1.json') as f:
  contract = json.load(f)
print(f"✅ Valid contract with {len(contract['pages'])} pages")
EOF
```

---

## 🤖 Designer Extension

### What It Does

Reads contract, then for each page:

1. **Check if exists** → Skip
2. **If missing** → Create page
3. **For each anchor**:
   - ✅ Exists? → Skip
   - ❌ Missing? → Create element + set attrs
4. **Report** → What changed

### Why It's Safe

- **Idempotent** - Running 2x = same result as 1x
- **Non-destructive** - Never deletes/moves elements
- **Design-preserving** - Only adds anchors, no layout changes
- **Dry-run mode** - Shows what would happen first

### Run It

```
Webflow Designer → Apps → Klarpakke Scaffolder → Run
```

---

## 📚 Related Documents

| Document | Purpose |
|----------|---------|
| `webflow/contract/klarpakke-pages.v1.json` | **The contract** - Machine readable |
| `docs/WEBFLOW-DESIGNER-EXTENSION-AUTOMATION.md` | **Runbook** - How to use extension |
| `docs/ONE-CLICK-DEPLOY.md` | **Deploy guide** - Full setup flow |
| `prompts/CLAUDE_CODE_WEBFLOW_DESIGNER_EXTENSION.md` | **Implementation** - Build extension |
| `.github/ISSUE_TEMPLATE/webflow-contract-change.md` | **Issue template** - Enforce contract updates |

---

## 🚀 Quick Start for Team

### I want to add a new page

1. **Edit contract:**
   ```bash
   nano webflow/contract/klarpakke-pages.v1.json
   ```

2. **Add your page:**
   ```json
   {
     "path": "/my/path",
     "name": "My Page",
     "anchors": [
       { "kind": "root", "tag": "div", "attrs": { "id": "klarpakke-mypage-root" } }
     ]
   }
   ```

3. **Create GitHub issue** using template:
   - Use: `.github/ISSUE_TEMPLATE/webflow-contract-change.md`

4. **Push & merge** when CI passes

5. **Run Designer Extension** in Webflow Designer

6. **Test on staging** before production

---

## 🔍 Debugging

### Contract validation fails?

```bash
# Check syntax
python3 -m json.tool webflow/contract/klarpakke-pages.v1.json

# Check schema
jq '.' webflow/contract/klarpakke-pages.v1.json
```

### Page created but anchor missing?

1. Check contract has anchor: `jq '.pages[] | select(.path == "/my/path")'`
2. Check Designer Extension ran: Look for "created" in report
3. Check Webflow element exists: Right-click → Inspect → Find ID

### JavaScript can't find element?

1. Check contract says element should exist
2. Open DevTools: `document.getElementById('klarpakke-...')`
3. If null → Element not in DOM (Designer Extension didn't run?)
4. If exists → Check JavaScript selector matches contract

---

## 📝 Versioning

Contract version follows semantic versioning:

- `1.0.0` - Initial MVP pages
- `1.1.0` - Add new anchor to existing page
- `2.0.0` - Breaking change (remove page/anchor)

Current version: **1.0.0**

---

## 🎓 Summary

**The contract is:**
- ✅ The source of truth for pages/anchors
- ✅ Machine-readable JSON
- ✅ Validated by CI
- ✅ Used by Designer Extension
- ✅ Part of infrastructure-as-code

**When you need to:**
- **Add page** → Update contract + push
- **Add anchor** → Update contract + push
- **Create pages in Webflow** → Run Designer Extension
- **Debug missing elements** → Check contract vs actual page

**Everything flows from the contract.** 🎯

---

**Last Updated:** 2026-01-31
**Version:** 1.0.0
**Maintained by:** Team (Contract-driven approach)

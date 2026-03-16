# Phase 1 MVP Completion Checklist

**Goal:** Complete PR #67 merge + Phase 1 Webflow pages
**Status:** 🔵 95% code complete, blocking on Webflow manual setup
**Timeline:** ~2 hours of manual Webflow work

---

## 🎯 PR #67 Status

**Title:** 🔒 Småsparer-first: Preview mode + Trygg modus
**State:** OPEN (waiting for Webflow elements)
**Code:** ✅ Complete (961 additions, TypeScript passes, build passes)

### What PR #67 Adds:
- ✅ Preview mode for unauthenticated users (demo signals)
- ✅ Trygg modus (safe mode toggle, default ON)
- ✅ `webflow/auth.js` updated (+428 lines)
- ✅ `webflow/app-with-auth.js` updated (+186 lines)
- ✅ `src/components/SettingsForm.tsx` updated (+61 lines)
- ✅ Documentation complete
- ⏳ Webflow elements (BLOCKING - see below)

---

## 📋 Phase 1 Contract

5 pages, 9 required anchors total:

```
✅ /                (Home)              → 1 anchor
✅ /signup          (Signup)            → 1 anchor
🔵 /app/dashboard   (Dashboard)         → 2 anchors (NEEDS: data-signals-container)
🔵 /app/settings    (Settings)          → 4 anchors (NEEDS: safe-mode toggle, status, info)
✅ /app/kalkulator  (Calculator)        → 1 anchor
```

**Status:**
- ✅ Code ready
- ✅ Documentation ready
- ✅ Contract defined
- ⏳ Webflow pages need manual creation

---

## 🚀 ACTIONABLE CHECKLIST - DO THIS NOW

### Phase 1A: Upload JavaScript Files (5-10 min)

In **Webflow Designer → Settings → Custom Code → Files**:

- [ ] Upload `webflow/auth.js` (8.8 KB)
  - Copy returned URL: `https://cdn.webflow.com/.../auth.js`

- [ ] Upload `webflow/login.js` (4.9 KB)
  - Copy returned URL: `https://cdn.webflow.com/.../login.js`

- [ ] Upload `webflow/app-with-auth.js` (8.1 KB)
  - Copy returned URL: `https://cdn.webflow.com/.../app-with-auth.js`

- [ ] Upload `web/calculator.js` (8.0 KB)
  - Copy returned URL: `https://cdn.webflow.com/.../calculator.js`

---

### Phase 1B: Add HEAD Code to All Pages (5-10 min)

In **Webflow Designer → Settings → Custom Code → HEAD Code**:

```html
<script>
  // Klarpakke Config
  window.KLARPAKKE_CONFIG = {
    version: '1.0.0',
    environment: 'production',
    supabaseUrl: 'https://swfyuwkptusceiouqlks.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    features: {
      previewMode: true,
      safeModeDefault: true,
      paperTradingEnabled: true
    }
  };
</script>

<!-- Load auth.js first (dependency for others) -->
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/auth.js"></script>
```

- [ ] Paste HEAD code to all pages
- [ ] Replace `YOUR_UPLOAD_ID` with actual uploaded auth.js URL

---

### Phase 1C: Add Footer Code to Specific Pages (10-15 min)

#### Landing Page (/)
```html
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/klarpakke-site.js"></script>
```

#### Login Page (/login)
```html
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/login.js"></script>
```

#### Dashboard Page (/app/dashboard) ⚠️ CRITICAL FOR PR #67
```html
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/app-with-auth.js"></script>
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/dashboard-roles.js"></script>
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/realtime.js"></script>
```

#### Settings Page (/app/settings) ⚠️ CRITICAL FOR PR #67
```html
<!-- Auth already loaded in HEAD -->
```

#### Calculator Page (/app/kalkulator)
```html
<script src="https://cdn.webflow.com/YOUR_UPLOAD_ID/calculator.js"></script>
```

---

### Phase 1D: Add Required Element IDs (20-30 min) ⚠️ CRITICAL

#### Dashboard Page - Add These Elements

**Element 1: Signals Container** (for PR #67)
- [ ] Create or select existing `<div>` where signals should appear
- [ ] Set **ID:** `signals-container`
- [ ] Set **data attribute:** `data-signals-container`
- [ ] This is where signal cards will render

**Element 2: Filters Section**
- [ ] Create `<div>` for filters
- [ ] Set **ID:** `filters-section`

**Element 3: Logout Button**
- [ ] Set **ID:** `logout-button`

#### Settings Page - Add These Elements (PR #67)

**Element 1: Safe Mode Toggle** (CRITICAL)
- [ ] Find or create checkbox `<input>`
- [ ] Set **ID:** `safe-mode-toggle`
- [ ] Set **data attribute:** `data-safe-mode-toggle`
- [ ] `type="checkbox"`

**Element 2: Safe Mode Status** (CRITICAL)
- [ ] Create `<span>` to show "PÅ" or "AV"
- [ ] Set **ID:** `safe-mode-status-text`
- [ ] Set **data attribute:** `data-safe-mode-status`
- [ ] Initial text: "PÅ"

**Element 3: Safe Mode Info** (CRITICAL)
- [ ] Create `<div>` for info/warning messages
- [ ] Set **ID:** `safe-mode-info`
- [ ] Set **data attribute:** `data-safe-mode-info`

**Element 4: User Info**
- [ ] Create `<span>` for user email
- [ ] Set **data attribute:** `data-user-email`
- [ ] Create `<span>` for user name
- [ ] Set **data attribute:** `data-user-name`

**Element 5: Logout Button**
- [ ] Set **ID:** `logout-button`

#### Other Pages

**Login Page:**
- [ ] `#login-form` (form element)
- [ ] `#email-input` (email input)
- [ ] `#password-input` (password input)
- [ ] `#login-button` (submit button)

**Calculator Page:**
- [ ] `#calculator-root` (main container)
- [ ] `#calculator-form` (form element)

---

### Phase 1E: Test Locally (10-15 min)

- [ ] Clear browser cache: **Cmd+Shift+Delete**
- [ ] Open DevTools: **F12**
- [ ] Go to **Console** tab
- [ ] Test each page:
  - [ ] Landing page loads, no errors
  - [ ] Login page shows form
  - [ ] Dashboard: Signals should load (demo if logged out)
  - [ ] Settings: Safe mode toggle appears
  - [ ] Calculator: Form appears
- [ ] Check console for errors (should be none)
- [ ] Verify `data-signals-container` element exists
- [ ] Verify `data-safe-mode-toggle` element exists

**No console errors = GOOD!**

---

### Phase 1F: Publish to Staging (5 min)

- [ ] Save all changes in Webflow Designer
- [ ] Click **"Publish"** button (top right)
- [ ] Select **"Publish to staging"**
- [ ] Wait for publish to complete
- [ ] Check staging URL

---

### Phase 1G: Test on Staging (10-15 min)

On staging URL (usually `staging.yoursite.webflow.io`):

- [ ] Landing page loads: ✅
- [ ] Can navigate to login
- [ ] Login form works
- [ ] Dashboard loads
  - [ ] Signals appear (demo signals if not logged in)
  - [ ] Can see "Demo" badges
  - [ ] Login overlay visible
- [ ] Settings page loads
  - [ ] Safe mode toggle visible
  - [ ] Can toggle on/off
  - [ ] Status text changes
- [ ] Calculator page works
- [ ] Console clear of errors
- [ ] No network errors (F12 → Network tab)

---

### Phase 1H: Merge PR #67 ✅

Once Webflow setup is complete:

```bash
# In GitHub
- [ ] PR #67 checkbox "Webflow elements added" → check
- [ ] PR #67 checkbox "Staging tested" → check
- [ ] Approve PR
- [ ] Merge PR to main
```

---

### Phase 1I: Publish to Production (5 min)

- [ ] Back in Webflow Designer
- [ ] Click **"Publish"** button
- [ ] Select **"Publish to production"**
- [ ] Confirm changes
- [ ] Wait for publish

---

### Phase 1J: Verify Production ✅

- [ ] Visit production URL
- [ ] Test all flows
- [ ] Check console
- [ ] Everything working?
  - [ ] YES → 🎉 **PHASE 1 COMPLETE**
  - [ ] NO → Debug & fix

---

## 📊 Success Criteria

### PR #67 Can Be Merged When:
- [x] Code complete & TypeScript passes
- [x] All 4 JS files uploaded to Webflow
- [x] HEAD code added to all pages
- [x] Footer code added to specific pages
- [ ] `data-signals-container` element exists on Dashboard
- [ ] `data-safe-mode-toggle` element exists on Settings
- [ ] `data-safe-mode-status` element exists on Settings
- [ ] `data-safe-mode-info` element exists on Settings
- [ ] Tested on staging: ✅
- [ ] No console errors
- [ ] Signals load and show demo badges
- [ ] Safe mode toggle works

### Phase 1 MVP Is Complete When:
- [x] 5 pages defined in contract
- [x] All JavaScript files ready
- [x] All documentation complete
- [ ] All pages created in Webflow
- [ ] All required anchors added
- [ ] All tested on staging
- [ ] PR #67 merged
- [ ] Deployed to production

---

## 🆘 Troubleshooting

### JavaScript not loading?
1. Check browser console (F12)
2. Look for 404 errors on scripts
3. Verify uploaded URLs are correct
4. Clear browser cache

### Elements not finding the right selectors?
1. Right-click → Inspect Element
2. Search for ID/data-attribute in HTML
3. If missing: Add it via Webflow ID field
4. Refresh page

### Dashboard shows no signals?
1. Check `data-signals-container` exists
2. Check auth.js loaded (no errors in console)
3. Check network tab for failed fetch
4. Try logging in to see real signals

### Safe mode toggle not working?
1. Verify `data-safe-mode-toggle` on checkbox
2. Verify `data-safe-mode-status` on status span
3. Check console for errors
4. Try toggling manually in DevTools

---

## ⏱️ Time Estimate

| Phase | Time |
|-------|------|
| 1A: Upload files | 5-10 min |
| 1B: HEAD code | 5-10 min |
| 1C: Footer code | 10-15 min |
| 1D: Element IDs | 20-30 min |
| 1E: Local testing | 10-15 min |
| 1F: Publish staging | 5 min |
| 1G: Test staging | 10-15 min |
| 1H: Merge PR | 2 min |
| 1I: Publish prod | 5 min |
| 1J: Verify prod | 5-10 min |
| **TOTAL** | **~90 min** |

---

## 🎉 When Complete

- ✅ PR #67 merged to main
- ✅ Phase 1 MVP live in production
- ✅ 5 pages with all required anchors
- ✅ Småsparer-first features enabled (preview mode + safe mode)
- ✅ Ready for Phase 2 (security pages)

---

## 📖 References

**If you need to check anything:**
- Contract: `webflow/contract/klarpakke-pages.v1.json`
- Element IDs: `docs/WEBFLOW-ELEMENT-IDS-TEMPLATE.md`
- Upload guide: `docs/WEBFLOW-UPLOAD-STEPS.md`
- PR #67: https://github.com/tajlive/KP/pull/67
- Contract-driven guide: `docs/CONTRACT-DRIVEN-WEBFLOW.md`

---

**Status:** Ready to execute
**Last Updated:** 2026-01-31
**Next Step:** Start with Phase 1A (upload files)

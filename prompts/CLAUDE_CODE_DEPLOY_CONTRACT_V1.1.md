# Claude Code Prompt: Deploy Contract v1.1.0 + Test Paper Trading

Du er Claude Code (programmeringsagent). Din oppgave er å merge PR #68, verifisere at alt fungerer, og teste Paper Trading-integrasjonen.

Repo: https://github.com/tajlive/KP
PR: https://github.com/tajlive/KP/pull/68

---

## 🎯 Hovedmål

1. **Merge PR #68** til `main`
2. **Verifiser at contract v1.1.0 er gyldig** (kjør validator)
3. **Test dry-run** for alle 18 sider
4. **Dokumenter Paper Trading setup** for Webflow

---

## 📝 Bakgrunn

**Hva PR #68 gjør:**
- Utvider `webflow/contract/klarpakke-pages.v1.json` fra 5 til 18 sider
- Legger til JS-mapping (`scripts`-felt per side)
- Legger til SEO metadata (`meta`-felt per side)
- Inkluderer Paper Trading anchors på `/app/dashboard`:
  - `#klarpakke-paper-trading-root` (mount point)
  - `[data-paper-trading-badge]` (white demo badge)

**Paper Trading context:**
- Feature implementert i PR #55 (allerede merged)
- Docs: `docs/PAPER-TRADING.md`
- Komponenter: `PaperTradingDashboard`, `PaperBadge`
- Database: `paper_accounts`, `paper_positions`, `paper_trades`
- Krever: anchors på dashboard for å mounte React-komponenter

---

## ✅ Oppgaver (prioritert)

### 1. Merge PR #68

```bash
# Sjekk at du er på main
git checkout main
git pull origin main

# Merge PR (squash)
gh pr merge 68 --squash --delete-branch

# Alternativt hvis gh CLI ikke funker:
git merge --squash feat/expand-contract-all-18-pages
git commit -m "feat: Expand contract to all 18 pages with JS mapping and Paper Trading (#68)"
git push origin main
```

**Success criteria:**
- PR #68 merged til `main`
- Branch `feat/expand-contract-all-18-pages` slettet
- `webflow/contract/klarpakke-pages.v1.json` oppdatert på `main`

---

### 2. Verifiser Contract Schema

```bash
# Test contract parser
node scripts/lib/contract-parser.js

# Eller skriv et lite test-script:
node -e "
const parser = require('./scripts/lib/contract-parser');
try {
  const contract = parser.loadContract('./webflow/contract/klarpakke-pages.v1.json');
  const summary = parser.getContractSummary(contract);
  console.log('\u2705 Contract valid!');
  console.log('Version:', summary.version);
  console.log('Pages:', summary.pageCount);
  console.log('Total anchors:', summary.totalAnchors);
  process.exit(0);
} catch (err) {
  console.error('\u274c Contract invalid:', err.message);
  process.exit(1);
}
"
```

**Success criteria:**
- Contract parser kjører uten feil
- Output viser:
  - Version: 1.1.0
  - Pages: 18
  - Total anchors: 70+

---

### 3. Test Dry-Run (Preview All Pages)

```bash
# Dry-run for alle 18 sider (no auth needed)
WEBFLOW_SITE_ID=klarpakke-c65071 npm run webflow:dry-run
```

**Success criteria:**
- Script kjører uten feil
- Report viser alle 18 sider:
  - `/` (Home)
  - `/signup`, `/login`
  - `/pricing`
  - `/app/dashboard`, `/app/settings`, `/app/kalkulator`
  - `/app/history`, `/app/profile`
  - `/reset-password`, `/verify-email`
  - `/404`, `/403`, `/500`
  - `/terms`, `/privacy`
  - `/help`, `/about`
- Hver side har forventet antall anchors
- Paper Trading anchors (`#klarpakke-paper-trading-root`, `[data-paper-trading-badge]`) er inkludert på `/app/dashboard`

**Feilhåndtering:**
- Hvis dry-run feiler: debug med `DEBUG=* npm run webflow:dry-run`
- Hvis contract parsing feiler: sjekk JSON syntax i contract-filen

---

### 4. Generer Paper Trading Setup Guide

Lag en fil: `docs/WEBFLOW-PAPER-TRADING-SETUP.md`

**Innhold:**
```markdown
# Paper Trading Setup i Webflow

**Status:** Ready for implementation
**PR:** #68 (merged)
**Contract version:** 1.1.0

---

## Oversikt

Paper Trading er nå inkludert i Webflow-kontrakten. Denne guiden viser hvordan du setter det opp i Webflow Designer etter at sidene er opprettet.

---

## Prerequisites

- [ ] PR #68 merged
- [ ] Webflow automation kjørt (alle 18 sider opprettet)
- [ ] `/app/dashboard` finnes i Webflow Designer
- [ ] Paper Trading JavaScript klar (hvis egen fil)

---

## Required DOM Anchors

Disse er **allerede inkludert** i kontrakten og blir opprettet automatisk:

### 1. Paper Trading Root Container
```html
<div id="klarpakke-paper-trading-root" data-kp-feature="paper-trading"></div>
```
**Plassering:** På `/app/dashboard`, typisk øverst eller i eget panel.

### 2. Paper Trading Badge
```html
<div data-paper-trading-badge></div>
```
**Plassering:** Ved brukernavnet eller i header på dashboard.
**Styling:** White badge med tekst "Demo Account" eller "Paper Trading".

---

## Webflow Implementation Steps

### Step 1: Verifiser at Anchors Finnes

1. Åpne Webflow Designer
2. Gå til `/app/dashboard`
3. Åpne Navigator panel
4. Søk etter:
   - Element med ID `klarpakke-paper-trading-root`
   - Element med attributt `data-paper-trading-badge`

**Hvis de IKKE finnes:**
```bash
# Kjør repair mode
WEBFLOW_SITE_ID=klarpakke-c65071 npm run webflow:repair
```

### Step 2: Style Paper Trading Badge (Optional)

Webflow Designer:
1. Select element med `data-paper-trading-badge`
2. Style panel:
   - Background: White (`#FFFFFF`)
   - Border: 1px solid light gray
   - Border radius: 4px
   - Padding: 4px 8px
   - Font size: 12px
   - Color: Dark gray
3. Legg til tekst: "Demo Account" eller "Paper Trading"

### Step 3: Position Paper Trading Dashboard

Webflow Designer:
1. Select `#klarpakke-paper-trading-root`
2. Flytt til ønsket posisjon (f.eks. over signals container)
3. Sett bredde: 100% eller fixed width
4. Legg til margin/padding etter behov

### Step 4: Add JavaScript (Custom Code)

**Hvis Paper Trading har egen JS-fil:**

Project Settings → Custom Code → Footer:
```html
<!-- Paper Trading (Dashboard only) -->
<script>
  if (window.location.pathname === '/app/dashboard') {
    const script = document.createElement('script');
    script.src = 'YOUR_PAPER_TRADING_JS_URL'; // Upload to Webflow Assets first
    document.body.appendChild(script);
  }
</script>
```

**Hvis integrert i `app-with-auth.js`:**
Ingen ekstra steg nødvendig (allerede lastet via contract).

---

## Testing

### Local Testing (Before Publish)

1. **Preview Mode** i Webflow Designer:
   - Klikk Preview (top-right)
   - Gå til `/app/dashboard`
   - Åpne DevTools Console
   - Sjekk for feilmeldinger

2. **Verifiser Anchors:**
   ```javascript
   // Run in browser console
   console.log('Root:', document.getElementById('klarpakke-paper-trading-root'));
   console.log('Badge:', document.querySelector('[data-paper-trading-badge]'));
   ```
   Begge skal returnere HTML-elementer (ikke `null`).

### Staging Testing (After Publish)

1. Publiser til staging domain
2. Logg inn med test-bruker
3. Gå til `/app/dashboard`
4. Verifiser:
   - [ ] Paper Trading dashboard vises
   - [ ] "Demo Account" badge vises
   - [ ] Balanse og statistikk vises (hvis integrert med backend)
   - [ ] Ingen console errors

---

## Integration with Backend

**API Endpoints (allerede implementert):**
- `GET /api/paper-trading/account` - Get user's paper account
- `POST /api/paper-trading/account` - Create paper account
- `GET /api/paper-trading/stats` - Get trading statistics
- `GET /api/paper-trading/positions` - Get positions
- `POST /api/paper-trading/positions` - Open position

**React Components (allerede implementert):**
- `PaperTradingDashboard` - Main dashboard
- `PaperBadge` - White badge indicator

**Mount point:**
```javascript
// In app-with-auth.js or paper-trading.js
const root = document.getElementById('klarpakke-paper-trading-root');
if (root) {
  ReactDOM.render(<PaperTradingDashboard userId={user.id} />, root);
}
```

---

## Troubleshooting

### Issue: Anchors ikke funnet
**Fix:**
```bash
npm run webflow:repair
```

### Issue: JavaScript laster ikke
**Check:**
1. Webflow Assets → verifiser at JS-fil er uploaded
2. Custom Code → sjekk at URL er riktig
3. Browser Console → sjekk for 404 errors

### Issue: Paper Trading vises ikke
**Debug:**
```javascript
// Browser console
console.log('User:', window.currentUser);
console.log('Root element:', document.getElementById('klarpakke-paper-trading-root'));
```

---

## Next Steps

1. [ ] Verify anchors in Webflow Designer
2. [ ] Style badge (optional)
3. [ ] Upload Paper Trading JS (if separate file)
4. [ ] Test in Preview mode
5. [ ] Publish to staging
6. [ ] Test with real user account
7. [ ] Verify backend integration
8. [ ] Deploy to production

---

## Related Documentation

- Paper Trading Feature: `docs/PAPER-TRADING.md`
- Contract: `webflow/contract/klarpakke-pages.v1.json`
- Dashboard Implementation: `docs/DEPLOYMENT-CHECKLIST.md`
- Webflow Automation: `docs/WEBFLOW-DESIGNER-EXTENSION-AUTOMATION.md`

---

**Status:** ✅ Ready for Webflow implementation
**Last Updated:** 2026-01-31
```

**Success criteria:**
- Fil opprettet: `docs/WEBFLOW-PAPER-TRADING-SETUP.md`
- Inneholder step-by-step Webflow setup guide
- Inkluderer troubleshooting
- Lenker til relevante docs

---

### 5. Oppdater README (Optional)

Legg til i `README.md` under "Features" eller "Getting Started":

```markdown
## 🎮 Paper Trading

Practice risk-free trading with virtual balance:
- ⚪ White "Demo Account" badge
- Real-time P&L tracking
- Trading statistics and history
- Integrated with Safe Mode (Trygg Modus)

[Setup Guide](docs/WEBFLOW-PAPER-TRADING-SETUP.md) | [API Docs](docs/PAPER-TRADING.md)
```

---

### 6. Create Summary Report

Generer en fil: `IMPLEMENTATION-SUMMARY.md` i repo root.

**Template:**
```markdown
# Contract v1.1.0 Deployment Summary

**Date:** 2026-01-31
**PR:** #68
**Status:** ✅ Merged

---

## What Was Deployed

- **Contract version:** 1.0.0 → 1.1.0
- **Pages:** 5 MVP → 18 complete
- **Anchors:** 9 → 70+
- **New features:** JS mapping, SEO meta, Paper Trading anchors

---

## Verification Results

### Contract Validation
- [x] Schema valid
- [x] No duplicate IDs
- [x] No duplicate paths
- [x] All required fields present

### Dry-Run Test
- [x] All 18 pages detected
- [x] All anchors present in contract
- [x] Paper Trading anchors included

### Paper Trading Anchors
- [x] `#klarpakke-paper-trading-root` on `/app/dashboard`
- [x] `[data-paper-trading-badge]` on `/app/dashboard`

---

## Next Steps

1. **Setup GitHub Secrets** (if not done):
   - `WEBFLOW_STORAGE_STATE_B64`
   - `WEBFLOW_API_TOKEN`

2. **Run Webflow Automation**:
   ```bash
   # Via GitHub Actions:
   GitHub Actions → Webflow Automation → Run workflow → mode: create
   
   # Or locally:
   WEBFLOW_SITE_ID=klarpakke-c65071 npm run webflow:create:all
   ```

3. **Verify in Webflow Designer**:
   - Check that 18 pages exist
   - Verify Paper Trading anchors on dashboard

4. **Test Paper Trading**:
   - Follow `docs/WEBFLOW-PAPER-TRADING-SETUP.md`
   - Upload JS files
   - Test in browser

5. **Publish to Staging**:
   - Test all pages
   - Verify authentication
   - Test Paper Trading flow

---

## Files Changed

- `webflow/contract/klarpakke-pages.v1.json` (expanded)
- `docs/WEBFLOW-PAPER-TRADING-SETUP.md` (new)
- `IMPLEMENTATION-SUMMARY.md` (this file)
- `README.md` (updated)

---

**All checks passed. Ready for production deployment.** ✅
```

---

## 🛡️ Error Handling

**If merge fails:**
- Check for merge conflicts
- Resolve in favor of PR #68 changes
- Re-run contract validation after merge

**If dry-run fails:**
- Check that `scripts/webflow-designer-clicker.js` uses contract parser
- Verify `WEBFLOW_SITE_ID` is correct
- Check for JavaScript syntax errors

**If contract validation fails:**
- Check JSON syntax in `klarpakke-pages.v1.json`
- Verify no duplicate IDs or paths
- Run schema validator: `node scripts/lib/contract-parser.js`

---

## ✅ Success Criteria (All Must Pass)

- [ ] PR #68 merged to `main`
- [ ] Contract v1.1.0 validates successfully
- [ ] Dry-run shows all 18 pages
- [ ] Paper Trading anchors present in contract
- [ ] `docs/WEBFLOW-PAPER-TRADING-SETUP.md` created
- [ ] `IMPLEMENTATION-SUMMARY.md` created
- [ ] README updated
- [ ] No errors in CI/validation

---

## 📝 Deliverables

Når ferdig, commit og push:

```bash
git add docs/WEBFLOW-PAPER-TRADING-SETUP.md IMPLEMENTATION-SUMMARY.md README.md
git commit -m "docs: Add Paper Trading Webflow setup guide and deployment summary"
git push origin main
```

**Output summary til terminal:**
```
✅ PR #68 merged
✅ Contract v1.1.0 validated (18 pages, 70+ anchors)
✅ Dry-run test passed
✅ Paper Trading setup guide created
✅ Deployment summary created

🚀 Ready for Webflow deployment!

Next: Run 'npm run webflow:create:all' to create all 18 pages.
```

---

**Start nå med Oppgave 1 (merge PR #68) og jobb deg nedover listen.**

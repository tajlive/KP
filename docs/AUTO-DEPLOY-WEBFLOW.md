# 🚀 Klarpakke Webflow Automation - Complete Guide

**Status:** ✅ Production Ready
**Version:** 2.0.0 (Enhanced with Bulk Editor)
**Mål:** Automatiser opprettelse, redigering og validering av alle 25 Webflow-sider

---

## 📖 Quick Start (Valg av Metode)

Velg en av tre metoder avhengig av dine behov:

| Metode | Bruk | Kompleksitet | Kraft |
|--------|------|--------------|-------|
| **🔖 Bookmarklet** | Rask start, manuell bruk | Enkel | 70% |
| **⚡ Designer Extension** | Visuell UI, avansert | Medium | 95% |
| **🤖 GitHub Actions** | Automated CI/CD | Høy | 90% |

---

## 🔖 Metode 1: Klarpakke Bookmarklet (Raskest)

### Hva den gjør
- ✅ Oppretter alle 25 sider automatisk fra contract
- ✅ Injiserer DOM-ankere via HTML Embed
- ✅ Redigerer tekst, bilder, linker på eksisterende sider
- ✅ Validerer at alle ankere er på plass
- ✅ Reparerer manglende ankere
- ✅ Idempotent (sikker å kjøre flere ganger)

### Installasjon (30 sekunder)

**Alternativ A: Som Bookmark**
1. Åpne Chrome/Firefox/Safari
2. Høyreklikk bookmarkbar → "Add page as bookmark"
3. Navn: `Klarpakke Auto`
4. URL - Kopier dette:
```
javascript:(function(){fetch('https://raw.githubusercontent.com/tombomann/klarpakke/main/webflow-automation-enhanced.js').then(r=>r.text()).then(eval);})();
```
5. Lagre bookmark

**Alternativ B: I Console**
1. Gå til Webflow Designer
2. Åpne DevTools (F12)
3. Gå til "Console" tab
4. Lim inn hele `webflow-automation-enhanced.js` filen
5. Kjør: `startKlarpakkeAuto()`

### Bruk

1. **Gå til Webflow Designer**
   ```
   https://webflow.com/designer/YOUR-SITE-ID
   ```

2. **Klikk bookmarklet** eller kjør `startKlarpakkeAuto()` i console

3. **Floating panel dukker opp** med 4 modus:
   - **Create All** - Opprett alle 25 sider
   - **Repair** - Legg til manglende ankere
   - **Edit** - Rediger innhold på eksisterende sider
   - **Validate** - Sjekk samsvar med contract

4. **Velg sider** du ønsker å behandle (checkbox)

5. **Klikk "Start"** og se progress i realtime

6. **Få rapport** når ferdig

### Eksempel: Create All Pages

```
1. Åpne Webflow Designer
2. Klikk Klarpakke Auto bookmark
3. Klikk "Create All" mode
4. Klikk "Select All"
5. Klikk "Start"
6. Vent 2-3 minutter
7. Alle 25 sider er opprettet! ✅
```

### Eksempel: Repair Mode

```
1. Noen HTML Embed elementer mangler
2. Klikk bookmarklet
3. Velg "Repair" mode
4. Velg sidene som trenger reparasjon
5. Klikk "Start"
6. Manglende ankere blir lagt til automatisk
```

### Feilsøking

| Problem | Løsning |
|---------|---------|
| "Must be used in Webflow Designer" | Kontroller at du er på webflow.com/designer |
| Bookmarklet gjør ingenting | Åpne DevTools (F12) og sjekk console for feil |
| Pages opprettes ikke | Prøv å kjøre i "Create All" mode en gang til |
| Session utløpt | Login igjen i Webflow Designer |

---

## ⚡ Metode 2: Designer Extension (Mest Kraftig)

### Hva den gjør
- ✅ Visuelt UI inne i Webflow Designer
- ✅ Bulk-redigering av 100+ elementer samtidig
- ✅ Live validering mot contract
- ✅ Auto-repair av manglende elementer
- ✅ Real-time progress tracking
- ✅ Offisielle Webflow Designer APIs

### Installasjon (5 minutter)

**Steg 1: Start extension i dev mode**
```bash
cd webflow-extension
npm install
npm run dev
```
Servicen kjører nå på `http://localhost:1337`

**Steg 2: Last inn i Webflow Designer**
1. Gå til Webflow Designer
2. Klikk "Apps" i venstre sidebar
3. Klikk "Developer Apps" eller "+"
4. Klikk "Load local extension"
5. Paste URL: `http://localhost:1337`
6. Klikk "Load"

**Steg 3: Din extension dukker opp!**
- Icon "⚙️" i høyre sidebar
- Kan åpnes/lukkes fritt

### Bruk: Bulk Editor

**4-Steg Wizard:**

**Step 1: Select Pages**
- Se alle 25 sider
- Checkbox for å velge hvilke som skal redigeres
- "Select All" eller "Clear" for å velge mange

**Step 2: Define Updates**
- Spesifiser HTML-selector (`#id` eller `.class`)
- Velg hva som skal endres (Text, Link href, Image src)
- Skriv ny verdi
- Klikk "Add Update Rule"
- Gjenta for alle endringer

**Step 3: Execute**
- Se oversikt over hva som skal endres
- Klikk "Execute Updates"
- Progress vises i realtime

**Step 4: Results**
- Rapport med antall sider oppdatert
- Success/error status for hver side
- Se detaljerte meldinger

### Eksempel: Update Text on 5 Pages

```
Step 1: Velg 5 sider
  ☑️ Dashboard
  ☑️ Settings
  ☑️ History
  ☑️ Profile
  ☑️ Help

Step 2: Definer updates
  Selector: #hero-headline
  Type: Text Content
  Value: "Welcome to Klarpakke 2.0"
  → Add Update Rule

Step 3: Execute
  → Execute Updates

Step 4: Results
  ✅ 5 pages updated successfully!
```

### Andre Tabs i Extension

1. **Oversikt** - Site overview og page status
2. **Opprett Sider** - Create new pages
3. **Element IDs** - Manage element IDs
4. **SEO** - SEO validation
5. **Custom Code** - Inject JS/CSS
6. **Assets** - Upload images
7. **1-Click Deploy** - Deploy hele siten

---

## 🤖 Metode 3: GitHub Actions (Fully Automated)

### Hva den gjør
- ✅ Trigger automatisk fra GitHub
- ✅ Kjører headless (ingen browser window)
- ✅ Oppretter/reparerer sider
- ✅ Publiserer til Webflow
- ✅ Sender resultat-rapport
- ✅ Perfekt for CI/CD

### Installasjon

**Steg 1: Legg til GitHub Secret**
```bash
# Din Webflow Session State (base64 encoded)
gh secret set WEBFLOW_STORAGE_STATE --body "$(cat /Users/taj/klarpakke/.auth/webflow-storage-state.json | base64)"
```

**Steg 2: Trigger Workflow**
```bash
gh workflow run auto-deploy-webflow.yml --repo tombomann/klarpakke
```

Eller via GitHub Web:
1. Gå til https://github.com/tombomann/klarpakke/actions
2. Velg "Auto Deploy to Webflow"
3. Klikk "Run workflow"

**Steg 3: Se progress**
- Workflow kjører automatisk
- Status vises i GitHub Actions tab
- Rapport genereres når ferdig

### Workflow File

`.github/workflows/auto-deploy-webflow.yml`:
- Trigger på push til `main`
- Eller manual via workflow_dispatch
- Kjører alle 25 sider
- Publiserer resultat som artifact

---

## 📊 Contract-Driven Architecture

Alle tre metoder bruker samme **contract-fil**:

**`webflow/contract/klarpakke-pages.v1.json`**
- Definerer alle 25 sider
- Spesifiserer alle 174+ DOM-ankere
- Valideringsregler
- Metadata (SEO, descriptions)

### Hva er et "anchor"?
En anchor er en unik ID eller data-attributt som identifiserer ett element:

```html
<!-- Examples of anchors -->
<div id="klarpakke-dashboard-root"></div>
<input data-login-email type="email" />
<button data-signup-submit>Sign Up</button>
```

**Hver side MÅ ha:**
- ✅ En root container (`id="klarpakke-XX-root"`)
- ✅ Spesifiserte form inputs, buttons, etc.
- ✅ Riktig HTML-struktur

Automationen **validerer** at alle ankere finnes før publisering.

---

## 🛠️ Troubleshooting

### Problem: "Page already exists"
**Løsning:** Bruk Repair mode for å oppdatere eksisterende sider

### Problem: "Could not find Designer button"
**Løsning:** Webflow UI kan ha endret seg. Prøv Designer Extension i stedet.

### Problem: Session expired
**Løsning:**
```bash
# Re-authenticate
npm run setup
# eller
gh secret set WEBFLOW_STORAGE_STATE --body "$(cat .auth/webflow-storage-state.json | base64)"
```

### Problem: Only 16 pages created instead of 25
**Løsning:** Kontakt support med detaljer - contract har 25 sider

---

## 📋 Checklist: Full Deployment

Bruk denne checklisteen for komplett deployment:

- [ ] **Fase 1: Create Pages**
  - [ ] Bruk Bookmarklet "Create All" mode
  - [ ] Verifiser alle 25 sider finnes
  - [ ] Sjekk console for errors

- [ ] **Fase 2: Validate**
  - [ ] Kjør "Validate" mode
  - [ ] Sjekk at alle ankere er på plass
  - [ ] Fikse manglende ankere med Repair mode

- [ ] **Fase 3: Edit Content**
  - [ ] Bruk Designer Extension Bulk Editor
  - [ ] Oppdater alle tekster og bilder
  - [ ] Valider SEO meta tags

- [ ] **Fase 4: Publish**
  - [ ] Gå til hver side i Designer
  - [ ] Sjekk at alt ser riktig ut
  - [ ] Klikk "Publish"
  - [ ] Test på live domain

---

## 📞 Support

### Dokumentasjon
- `CLAUDE.md` - Project overview
- `docs/ARCHITECTURE.md` - Technical details
- `docs/CONTRACT-DRIVEN-WEBFLOW.md` - Contract specification

### Scripts Location
```
webflow-automation-enhanced.js  <- Bookmarklet
webflow-extension/             <- Designer Extension
scripts/                        <- Helper scripts
.github/workflows/              <- GitHub Actions
```

### Report Issues
```bash
# Lag issue på GitHub
gh issue create --title "Webflow automation issue" --body "Describe problem"
```

---

## 🎯 Summary

| Metode | Best For | Setup | Time |
|--------|----------|-------|------|
| 🔖 Bookmarklet | Quick start, testing | 30 sec | 2-3 min |
| ⚡ Extension | Daily work, editing | 5 min | 1-2 min |
| 🤖 GitHub Actions | CI/CD, automation | 10 min | Automated |

**Anbefaling:** Start med bookmarklet, bruk Extension for edit-arbeid, GitHub Actions for prod.

---

**Sist oppdatert:** February 1, 2026
**Version:** 2.0.0 (Enhanced Automation)

# 🤖 GitHub Actions Oppsett

> **Status**: Workflows klare for aktivering
> **Siste oppdatering**: 2026-01-31

---

## 📋 Oversikt over Workflows

| Workflow | Beskrivelse | Trigger |
|----------|-------------|---------|
| `deploy-webflow.yml` | 🚀 Hoved-deployment workflow | Push til main, Manual |
| `deploy-supabase.yml` | 📦 Deploy Edge Functions | Push til main (supabase/**) |
| `ci.yml` | ✅ Lint og test | Push/PR til main/develop |
| `ai-webflow-builder.yml` | 🤖 AI Page Builder | Manual, Weekly schedule |
| `webflow-automation.yml` | 🔄 Webflow automation | Manual |

---

## 🔧 Steg 1: Aktiver GitHub Actions

### 1.1 Gå til repository Settings
```
https://github.com/tombomann/klarpakke/settings
```

### 1.2 Aktiver Actions
1. Klikk **Actions** → **General** i venstre sidebar
2. Under **Actions permissions** velg:
   - ✅ **Allow all actions and reusable workflows**
3. Klikk **Save**

### 1.3 Verifiser at workflows er synlige
```
https://github.com/tombomann/klarpakke/actions
```

Du skal se følgende workflows:
- 🚀 Deploy to Webflow
- 🤖 AI Webflow Page Builder
- 📦 Deploy to Supabase
- ✅ CI - Lint and Test

---

## 🔐 Steg 2: Legg til Secrets

### 2.1 Gå til Secrets-siden
```
https://github.com/tombomann/klarpakke/settings/secrets/actions
```

### 2.2 Legg til følgende Repository Secrets

Klikk **New repository secret** for hver:

#### Påkrevde Secrets

| Secret Name | Value | Beskrivelse |
|-------------|-------|-------------|
| `WEBFLOW_API_TOKEN` | `f1ed265daa77d3385572dc3d4b2f4f3fcde9efd3b55cf21581f866c11e1e7b29` | Webflow API token |
| `SUPABASE_URL` | `https://swfyuwkptusceiouqlks.supabase.co` | Supabase prosjekt URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdXNjZWlvdXFsa3MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2OTE4NjgwMSwiZXhwIjoyMDg0NzYyODAxfQ.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk` | Supabase anon key |

#### Valgfrie Secrets (for avansert funksjonalitet)

| Secret Name | Value | Beskrivelse |
|-------------|-------|-------------|
| `SUPABASE_ACCESS_TOKEN` | (fra Supabase dashboard) | For Edge Function deployment |
| `SUPABASE_SERVICE_KEY` | (fra Supabase dashboard) | Service role key |
| `PPLX_API_KEY` | (hvis du har Perplexity) | For AI content generation |

### 2.3 Verifiser Secrets
Etter å ha lagt til alle secrets, skal siden vise:
```
✓ WEBFLOW_API_TOKEN (Last used: Never)
✓ SUPABASE_URL
✓ SUPABASE_ANON_KEY
```

---

## 🚀 Steg 3: Kjør Workflows

### 3.1 CI Workflow (automatisk)
Dette kjører automatisk på push til main/develop:
```bash
git add .
git commit -m "Aktiver GitHub Actions"
git push origin main
```

Gå til Actions-taben og verifiser at CI-kjøringen er grønn:
```
https://github.com/tombomann/klarpakke/actions
```

### 3.2 Deploy to Webflow (manuel)

1. Gå til **Actions** tab
2. Klikk **🚀 Deploy to Webflow**
3. Klikk **Run workflow**
4. Velg miljø:
   - `staging` - For testing
   - `production` - For live site
5. Klikk **Run workflow**

### 3.3 Verifiser Deployment

Etter kjøring, sjekk:
1. **Artifacts** seksjonen for deployment package
2. **Summary** for statusrapport
3. Last ned deployment package hvis nødvendig

---

## 📁 Workflow Detaljer

### deploy-webflow.yml

**Hva den gjør:**
1. ✅ Validerer HTML og JavaScript filer
2. ✅ Sjekker at alle nødvendige filer finnes
3. 📦 Pakker deployment-filer
4. 📤 Laster opp som artifact
5. 📢 Lager statusrapport

**Når den kjører:**
- Push til `main` branch med endringer i:
  - `webflow-pages-missing/**`
  - `webflow/**`
- Manuell trigger (workflow_dispatch)

### ci.yml

**Hva den gjør:**
1. ✅ Lint JavaScript (webflow/*.js)
2. ✅ Lint TypeScript (supabase/functions)
3. ✅ Valider SQL migrations
4. ✅ Sikkerhetsscan (secrets)
5. ✅ Verifiser prosjektstruktur

**Når den kjører:**
- Push til `main` eller `develop`
- Pull requests til `main` eller `develop`

### deploy-supabase.yml

**Hva den gjør:**
1. ✅ Lint Edge Functions
2. ✅ Type check
3. 📦 Deploy migrations
4. 🚀 Deploy Edge Functions

**Når den kjører:**
- Push til `main` med endringer i `supabase/**`
- Manuell trigger

---

## 🔍 Feilsøking

### Problem: "Workflow not found"
**Løsning:**
```bash
# Sjekk at workflow-filen er committed
git status

# Push workflow til main
git add .github/workflows/
git commit -m "Add GitHub Actions workflows"
git push origin main
```

### Problem: "Secret not found"
**Løsning:**
1. Gå til Settings → Secrets → Actions
2. Verifiser at secret-navnet er riktig (case-sensitive)
3. Sjekk at secret er lagt til på repository-nivå (ikke environment)

### Problem: "Permission denied"
**Løsning:**
1. Gå til Settings → Actions → General
2. Sjekk at "Workflow permissions" er satt til:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### Problem: Workflow feiler
**Løsning:**
1. Klikk på den feilede workflow-kjøringen
2. Utvid den feilede jobben
3. Les error-meldingen
4. Vanlige årsaker:
   - Manglende secrets
   - Syntax errors i kode
   - Nettverksproblemer (prøv på nytt)

---

## 📊 Workflow Status

Sjekk status på alle workflows:
```
https://github.com/tombomann/klarpakke/actions
```

### Statusikoner
- ✅ **Success** - Workflow fullført uten feil
- ❌ **Failure** - Workflow feilet (sjekk log)
- 🟡 **In progress** - Kjører nå
- ⚪ **Skipped** - Hoppet over (f.eks. path filter)

---

## 🔔 Notifikasjoner

### Aktiver e-postnotifikasjoner
1. Gå til GitHub Settings → Notifications
2. Under **Actions** velg:
   - ✅ **Send notifications for failed workflows only**
   - Eller: ✅ **Send notifications for all workflows**

### Slack integrasjon (valgfritt)
For Slack-varsler, legg til i workflow:
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {"text": "Deployment ${{ job.status }}"}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 📚 Ressurser

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Managing Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## ✅ Sjekkliste for Aktivering

- [ ] Gå til Settings → Actions → General
- [ ] Aktiver "Allow all actions and reusable workflows"
- [ ] Lagre endringer
- [ ] Gå til Settings → Secrets → Actions
- [ ] Legg til `WEBFLOW_API_TOKEN`
- [ ] Legg til `SUPABASE_URL`
- [ ] Legg til `SUPABASE_ANON_KEY`
- [ ] Commit og push workflows til main
- [ ] Verifiser at workflows vises i Actions-taben
- [ ] Kjør CI workflow og verifiser at den er grønn
- [ ] Kjern "Deploy to Webflow" workflow manuelt

---

**Neste steg**: Følg sjekklisten ovenfor for å aktivere GitHub Actions.

Spørsmål? support@klarpakke.no

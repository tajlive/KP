# ⚡ Quick Start: Aktiver GitHub Actions Cron (1 minutt)

**Mål:** Aktiver automatisk trading tick via GitHub Actions  
**Tid:** 1 minutt  
**Krav:** GitHub CLI (`gh`) installert

---

## 🚀 Én-Kommando Aktivering

### Metode 1: Automatisk Script (Anbefalt)

```bash
# Kjør fra rot-mappen til klarpakke:
chmod +x scripts/setup-github-secret.sh
./scripts/setup-github-secret.sh
```

**Output:**
```
🔑 Setter opp GitHub Actions Secret: CRON_SECRET
✅ Fant CRON_SECRET i .env.local
✅ GitHub CLI installert
✅ Logget inn i GitHub CLI
🚀 Setter CRON_SECRET i GitHub...
✅ CRON_SECRET satt i GitHub!
🔍 Verifiserer...
✅ Verifisert: CRON_SECRET eksisterer
🎉 SUKSESS! GitHub Actions cron er nå aktivert!
```

### Metode 2: Direkte CLI-kommando

```bash
# Kopierer CRON_SECRET fra .env.local og setter i GitHub
grep '^CRON_SECRET=' .env.local | cut -d'=' -f2 | \
  gh secret set CRON_SECRET --repo tomarnejensen/klarpakke
```

---

## ✅ Verifisering

### Sjekk at secret er satt:

```bash
gh secret list --repo tomarnejensen/klarpakke
```

**Forventet output:**
```
CRON_SECRET  Updated 2026-02-25
```

### Sjekk workflow status:

```bash
gh workflow list --repo tomarnejensen/klarpakke
```

**Forventet output:**
```
Trading Tick Cron  active  4c7ba66
```

---

## 🧪 Test Workflow Manuelt

### Trigger første kjøring:

```bash
gh workflow run trading-cron.yml --repo tomarnejensen/klarpakke
```

### Overveielse real-time:

```bash
gh run watch --repo tomarnejensen/klarpakke
```

**Forventet output:**
```
✓ tomarnejensen/klarpakke trading-tick (main) · 4c7ba66
Triggered via workflow_dispatch about 1 minute ago

JOBS
✓ trading-tick in 5s (ID 123456)
  ✓ Call Trading Tick API
```

### Sjekk resultatet:

```bash
gh run view --repo tomarnejensen/klarpakke --log
```

**Forventet log:**
```
🤖 Triggering trading tick at Wed Feb 25 15:30:00 CET 2026
HTTP Status: 200
Response: {"processed":0,"total_active":0,"trades_executed":0,...}
✅ Trading tick completed successfully
```

---

## 📅 Automatisk Kjøring

Etter at CRON_SECRET er satt, vil GitHub Actions automatisk:

| Tidspunkt | Action |
|-----------|--------|
| **Hver 5. minutt** | Kjør `/api/cron/tick` (prosesser trading sessions) |
| **Daglig kl. 19:00 CET** | Kjør `/api/cron/daily-summary` (send email) |

**Første automatiske kjøring:** < 5 minutter etter secret er satt

---

## 🔍 Monitoring

### Se siste 10 kjøringer:

```bash
gh run list --workflow=trading-cron.yml --limit 10 --repo tomarnejensen/klarpakke
```

### Overveielse live:

```bash
watch -n 10 'gh run list --workflow=trading-cron.yml --limit 5 --repo tomarnejensen/klarpakke'
```

### Sjekk om noe har feilet:

```bash
gh run list --workflow=trading-cron.yml --status failure --repo tomarnejensen/klarpakke
```

---

## ❌ Troubleshooting

### "gh: command not found"

**Løsning:** Installer GitHub CLI

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install GitHub.cli
```

### "gh auth status" feiler

**Løsning:** Logg inn

```bash
gh auth login
# Velg: GitHub.com
# Velg: HTTPS
# Velg: Login with a web browser
```

### Workflow kjører ikke automatisk

**Sjekk:**

1. **Er CRON_SECRET satt?**
   ```bash
   gh secret list --repo tomarnejensen/klarpakke | grep CRON_SECRET
   ```

2. **Er workflow enabled?**
   ```bash
   gh workflow list --repo tomarnejensen/klarpakke
   # Skal vise "active", ikke "disabled"
   ```

3. **Er repo public?**
   ```bash
   gh repo view tomarnejensen/klarpakke --json visibility
   # Skal vise: "visibility": "PUBLIC"
   ```

### "HTTP 401 Unauthorized" i workflow logs

**Årsak:** CRON_SECRET er feil

**Løsning:**
```bash
# Hent korrekt secret fra .env.local
cat .env.local | grep CRON_SECRET

# Sett på nytt
grep '^CRON_SECRET=' .env.local | cut -d'=' -f2 | \
  gh secret set CRON_SECRET --repo tomarnejensen/klarpakke
```

---

## 📊 Success Metrics

Etter 30 minutter skal du se:

✅ **6 vellykkede workflow runs** (hver 5. minutt)  
✅ **0 feilede runs**  
✅ **HTTP 200** i alle logs  
✅ **Trades i database** (hvis paper session er aktiv)

**Sjekk:**
```bash
gh run list --workflow=trading-cron.yml --limit 10 --repo tomarnejensen/klarpakke
```

---

## 🎉 Du er ferdig!

**GitHub Actions cron er nå aktivert og kjører automatisk!**

**Neste steg:**
1. Opprett en paper trading session (se `docs/PAPER_TRADING_GUIDE.md`)
2. Vent 5 minutter på første tick
3. Sjekk trades-tabellen i Supabase

---

## 📚 Mer Informasjon

- **Full guide:** `docs/GITHUB_ACTIONS_CRON_SETUP.md`
- **Workflow fil:** `.github/workflows/trading-cron.yml`
- **Actions dashboard:** https://github.com/tomarnejensen/klarpakke/actions

---

*Opprettet: 2026-02-25*

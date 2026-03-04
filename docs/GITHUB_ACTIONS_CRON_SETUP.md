# 🔄 GitHub Actions Cron - Automatisk Trading

**Status:** ✅ Aktivert  
**Workflow:** `.github/workflows/trading-cron.yml`  
**Sist oppdatert:** 2026-02-25

---

## 🎯 Oversikt

Klarpakke bruker GitHub Actions for å kjøre automatisk trading uten å betale for Vercel Pro.

### Cron Jobs:

| Job | Schedule | Beskrivelse |
|-----|----------|-------------|
| **Trading Tick** | Hver 5. minutt | Prosesserer alle aktive trading sessions |
| **Daily Summary** | Daglig kl. 19:00 CET | Sender daglig oppsummering via email |

---

## ⚙️ Konfigurasjon

### 1. GitHub Secret (KRITISK!)

Workflow krever `CRON_SECRET` for å autentisere mot Klarpakke API.

**Sett opp secret:**

```bash
# Gå til:
https://github.com/tomarnejensen/klarpakke/settings/secrets/actions

# Klikk "New repository secret"
# Name: CRON_SECRET
# Value: a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8
```

**Eller via GitHub CLI:**

```bash
gh secret set CRON_SECRET \
  --body "a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8" \
  --repo tomarnejensen/klarpakke
```

### 2. Aktiver Workflow

Workflow er automatisk aktivert når filen pushes til `main`.

**Verifiser:**
```
https://github.com/tomarnejensen/klarpakke/actions
```

Du skal se:
- ✅ "Trading Tick Cron" workflow
- ⏰ Neste kjøring om < 5 minutter

---

## 🛠️ Manuell Trigger

For testing kan du kjøre workflow manuelt:

### Via GitHub UI:

```
1. Gå til: https://github.com/tomarnejensen/klarpakke/actions
2. Klikk "Trading Tick Cron"
3. Klikk "Run workflow" (høyre side)
4. Velg branch: main
5. Klikk "Run workflow"
```

### Via GitHub CLI:

```bash
gh workflow run trading-cron.yml \
  --repo tomarnejensen/klarpakke
```

---

## 📊 Monitoring

### Sjekk Status

**Siste kjøringer:**
```bash
gh run list --workflow=trading-cron.yml --repo tomarnejensen/klarpakke --limit 10
```

**Live logs:**
```bash
gh run watch --repo tomarnejensen/klarpakke
```

**Eller via UI:**
```
https://github.com/tomarnejensen/klarpakke/actions/workflows/trading-cron.yml
```

### Success Metrics

✅ **Vellykket kjøring:**
- HTTP Status: 200
- Response inneholder: `{"processed": X, "trades_executed": Y}`
- Exit code: 0

❌ **Feilet kjøring:**
- HTTP Status: != 200
- Workflow exit code: 1
- GitHub sender email-varsel (hvis aktivert)

---

## ⚠️ Kjente Begrensninger

### 1. Timing Accuracy

**Problem:**  
GitHub Actions cron har **IKKE garantert timing**. Faktisk intervall kan være 5-30 minutter under høy load.

**Løsning:**  
Dette er OK for paper trading, men **IKKE** for live trading med høyfrekvent strategi.

**Overveielser:**
- 🟢 Paper trading: ✅ OK
- 🟡 DCA strategy (1h intervall): ✅ OK
- 🔴 Scalping (< 5min): ❌ IKKE OK

### 2. Maximum Run Time

GitHub Actions har 6 timer max runtime per job.

**Klarpakke:** `/api/cron/tick` fullfører på < 1 sekund, så dette er **ikke** et problem.

### 3. Rate Limiting

**GitHub Free:**
- 2,000 minutter/måned for private repos
- Ubegrenset for public repos

**Klarpakke (public repo):**
- ✅ Ubegrenset bruk
- Hver cron bruker ~5 sekunder
- Ca. 8,640 kjøringer/måned = 12 timer total

---

## 🔧 Troubleshooting

### "Workflow not running"

**Sjekk:**

1. **Er CRON_SECRET satt?**
   ```
   https://github.com/tomarnejensen/klarpakke/settings/secrets/actions
   ```

2. **Er repo public?**
   ```bash
   # GitHub Actions cron fungerer IKKE på private repos uten betalt plan
   gh repo view tomarnejensen/klarpakke --json visibility
   ```

3. **Er workflow enabled?**
   ```
   https://github.com/tomarnejensen/klarpakke/actions
   # Skal IKKE vise "This workflow is disabled"
   ```

### "HTTP 401 Unauthorized"

**Årsak:** CRON_SECRET er feil eller mangler.

**Løsning:**
```bash
# Verifiser secret finnes
gh secret list --repo tomarnejensen/klarpakke | grep CRON_SECRET

# Hvis mangler, sett på nytt
gh secret set CRON_SECRET \
  --body "a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8" \
  --repo tomarnejensen/klarpakke
```

### "Workflow runs but trades not executing"

**Debug:**

1. **Sjekk workflow logs:**
   ```bash
   gh run view --repo tomarnejensen/klarpakke --log
   ```

2. **Sjekk API response:**
   ```bash
   # Skal vise JSON med trading summary
   # Hvis "processed: 0" -> ingen aktive sessions
   ```

3. **Verifiser aktive sessions i Supabase:**
   ```sql
   SELECT id, status, strategy_id, mode, last_tick_at
   FROM trading_sessions
   WHERE status = 'active';
   ```

### "Cron timing is unreliable"

**Dette er forventet adfærd for GitHub Actions.**

**Alternativer:**

1. **cron-job.org** (gratis, pålitelig 5 min intervall)
2. **Vercel Pro** ($20/måned, garantert timing)
3. **Aksepter variansen** (OK for paper trading)

---

## 🚨 Disable Workflow

Hvis du ønsker å stoppe GitHub Actions cron:

### Metode 1: Disable i GitHub UI

```
1. Gå til: https://github.com/tomarnejensen/klarpakke/actions
2. Klikk "Trading Tick Cron"
3. Klikk "..." (meny)
4. Klikk "Disable workflow"
```

### Metode 2: Slett workflow-filen

```bash
git rm .github/workflows/trading-cron.yml
git commit -m "chore: disable GitHub Actions cron"
git push origin main
```

### Metode 3: Kommenter ut schedule

```yaml
# .github/workflows/trading-cron.yml
on:
  # schedule:
  #   - cron: '*/5 * * * *'
  workflow_dispatch: # Keep manual trigger
```

---

## 📊 Sammenligning med Alternativer

| Løsning | Kostnad | Timing | Pålitelighet | Oppsett |
|---------|---------|--------|---------------|----------|
| GitHub Actions | 🟢 Gratis | ⏰ 5-30 min | ⭐⭐⭐ | 5 min |
| cron-job.org | 🟢 Gratis | ⏰ 5 min | ⭐⭐⭐⭐⭐ | 5 min |
| Vercel Pro | 🔴 $20/mnd | ⏰ 5 min | ⭐⭐⭐⭐⭐ | 2 min |

**Anbefaling:**
- 🟢 **Nå:** GitHub Actions (gratis testing)
- 🟡 **Beta:** cron-job.org (pålitelig, gratis)
- 🔴 **Produksjon:** Vercel Pro (hvis mange brukere)

---

## 📝 Logging

Hver workflow-kjøring logger:

```
🤖 Triggering trading tick at [timestamp]
HTTP Status: 200
Response: {"processed": 5, "trades_executed": 2, ...}
✅ Trading tick completed successfully
```

**Tilgang til logs:**
- **GitHub UI:** Actions tab > Workflow run > Job > Step
- **GitHub CLI:** `gh run view --log`
- **Varighet:** 90 dager (GitHub retention policy)

---

## 🔔 Notifications

### Aktiver Email Alerts

**For å få email når workflow feiler:**

```
1. Gå til: https://github.com/settings/notifications
2. Under "Actions":
   ☑️ Send notifications for failed workflows only
3. Velg email: tom@klarpakke.no
4. Lagre
```

**Du får nå email hvis:**
- HTTP status != 200
- Workflow exit code != 0
- Network error

---

## ✅ Neste Steg

1. **Sett GitHub Secret** (CRON_SECRET)
2. **Vent 5 minutter** (første automatiske kjøring)
3. **Sjekk Actions tab** (verifiser success)
4. **Opprett paper trading session** (for å teste)
5. **Monitor i 24 timer** (evaluer pålitelighet)

**Etter 24t testing:**
- ✅ Hvis OK: Behold GitHub Actions
- ❌ Hvis upålitelig: Bytt til cron-job.org (se hovedguide)

---

*Opprettet: 2026-02-25*  
*Sist oppdatert: 2026-02-25*

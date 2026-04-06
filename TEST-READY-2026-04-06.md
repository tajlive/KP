# ✅ KLAR FOR TESTING — Watchdog & Self-Healing

**Tidspunkt:** 2026-04-06 17:42 UTC  
**Status:** Alle kritiske komponenter operasjonelle

---

## 🟢 Fikset akkurat nå

| Komponent | Handling | Status |
|-----------|----------|--------|
| Signal-engine | Deployet + triggered | ✅ Heartbeat 1.07 min |
| Testbruker repair | Repair-only testet | ✅ Success |
| Health recovery | Auto-modus testet | ✅ Healthy |
| .nvmrc | Oppdatert til 24.0.0 | ✅ OK |

---

## 🟢 Verifisert OK (test nå)

```bash
# 1. Health check (skal vise healthy)
npm run health:prod:gate

# 2. Signal health (skal vise < 2 min heartbeat)
npm run signals:health

# 3. Watchdog repair (testbruker)
npm run watchdog:repair -- --primary-only

# 4. Health recovery (auto)
npm run health:recover

# 5. Check-only (trygg i prod)
npm run watchdog:repair:check
npm run health:recover -- --check-only
```

---

## 🟡 Gjenstår for full test (ikke blokkerende)

| Komponent | Status | Workaround |
|-----------|--------|------------|
| LINEAR_TEAM_ID | Mangler | Test uten Linear først, legg til etterpå |
| SUPABASE_ACCESS_TOKEN | Mangler | DB drift kun i dry-run/check-only |
| Copy-leader bruker | Mangler | Test kun primary bruker |

---

## 🚀 Test-protokoll (kjør nå)

### Steg 1: Verifiser basis (1 min)
```bash
npm run health:prod:gate
npm run signals:health
```
**Forventet:** Begge viser "healthy" og "ok"

### Steg 2: Test repair (2 min)
```bash
npm run watchdog:repair -- --primary-only
```
**Forventet:** "success": true, "repairs": [...]

### Steg 3: Test recovery (2 min)
```bash
npm run health:recover
```
**Forventet:** "All systems healthy"

### Steg 4: Verifiser rapporter
```bash
ls watchdog-reports/
cat watchdog-reports/repair-latest.json
cat watchdog-reports/recovery-latest.json
```
**Forventet:** JSON-filer med timestamp, status, actions

---

## 🔧 Hvis du vil teste Slack/Linear

### Slack (med test-webhook)
```bash
# Bruk httpbin for testing
SLACK_WEBHOOK_URL=https://httpbin.org/post \
  npm run slack:watchdog:thread -- --status=failed
```

### Linear (krever TEAM_ID)
```bash
# 1. Hent team ID fra Linear dashboard
# 2. Legg til i .env.local:
echo "LINEAR_TEAM_ID=dit_team_id" >> .env.local

# 3. Test
echo "LINEAR_TEAM_ID=dit_team_id" npm run linear:watchdog:sync -- --status=failed
```

---

## 📊 Nåværende status

| System | Verdi | Status |
|--------|-------|--------|
| Health endpoint | healthy | 🟢 |
| Signal heartbeat | 1.07 min | 🟢 |
| Testbruker | repaired | 🟢 |
| Rapporter | genereres | 🟢 |
| Signal-engine | deployed | 🟢 |

---

## ✅ GO for testing

Alt kritisk er operasjonelt. Kjør test-protokollen nå.

**Eventuelle feil:** Sjekk `watchdog-reports/*.json` for detaljer.

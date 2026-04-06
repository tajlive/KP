# 🧪 Watchdog Verifiseringsplan

> **Mål:** Verifisere at faktisk oppførsel matcher dokumentert policy i `WATCHDOG-EXTERNAL-USER.md`

---

## Fase 1: Staging (Umiddelbart)

### Test A: Check-only modus
```bash
# Kjør i staging
npm run watchdog:repair:check
npm run db:drift:check

# Forventet: Ingen endringer, kun rapportering
# Verifiser: Ingen nye brukere opprettet, ingen migrasjoner kjørt
```

### Test B: Auto-repair (testbruker)
```bash
# Slett testbruker manuelt i Supabase
# Kjør repair
npm run watchdog:repair -- --primary-only

# Forventet: Bruker gjenopprettet
# Verifiser: Auth + profile eksisterer, innlogging fungerer
```

### Test C: Slack/Linear varsling
```bash
# Trigger kunstig feil
npm run slack:watchdog:thread -- --status=failed
npm run linear:watchdog:sync -- --status=failed

# Forventet: Melding i #ops, issue i Linear
# Verifiser: Thread-struktur, issue-tittelformat
```

---

## Fase 2: Prod-lignende (Før prod)

### Test D: Self-Healing Guard workflow
```bash
# GitHub Actions → Self-Healing Guard → Run workflow
# Mode: check-only
# Environment: staging

# Forventet: Alle steg grønne, ingen endringer
# Verifiser: Rapporter i artifacts
```

### Test E: DB drift (dry-run)
```bash
npm run db:drift:auto -- --dry-run

# Forventet: Viser diff, gjør ingen endringer
# Verifiser: dry-run flagget respekteres
```

### Test F: Recovery (simulert)
```bash
# Manuelt sett bot_health til stale
# Kjør health:recover
npm run health:recover -- --check-only

# Forventet: Detekterer stale, foreslår action
```

---

## Fase 3: Produksjon (Etter staging OK)

### Test G: Første timekjøring
```
1. Deploy til prod
2. Vent på første hourly workflow
3. Sjekk: GitHub Actions logg
4. Sjekk: #ops Slack (skal ikke feile)
5. Sjekk: Linear (ingen issues = alle sjekker OK)
```

### Test H: Kunstig feil (kontrollert)
```
1. Manuelt slett testbruker (tom@klarpakke.no)
2. Vent på neste hourly kjøring
3. Verifiser: Auto-repair gjenoppretter
4. Verifiser: Slack melding "recovered"
5. Verifiser: Ingen Linear issue (fordi recovery lyktes)
```

---

## Verifiseringsjekkliste

| # | Test | Staging | Prod | Passerer |
|---|------|---------|------|----------|
| 1 | Check-only gjør ingen endringer | [ ] | N/A | |
| 2 | Auto-repair gjenoppretter testbruker | [ ] | [ ] | |
| 3 | Slack varsler ved feil | [ ] | [ ] | |
| 4 | Linear oppretter issue ved feil | [ ] | [ ] | |
| 5 | Linear oppdateres ved recovery | [ ] | [ ] | |
| 6 | DB drift alltid dry-run først | [ ] | N/A | |
| 7 | Vercel rollback krever approval | N/A | [ ] | |
| 8 | Workflow stopper aldri helt (fortsetter etter feil) | [ ] | [ ] | |
| 9 | Rapporter genereres i artifacts | [ ] | [ ] | |
| 10 | Stateful writes kun for testbrukere | [ ] | [ ] | |

---

## Akseptanskriterier

```
✅ ALLE staging-tester passerer
✅ ALLE prod-lignende tester passerer  
✅ Dokumentasjon oppdateres hvis avvik funnet
✅ On-call er informert om første prod-kjøring
✅ Rollback-plan klar hvis watchdog selv feiler
```

---

## Neste steg etter verifisering

1. **Overvåk 48 timer:** Sjekk at hourly kjører stabilt
2. **Måle MTTR:** Mål faktisk tid fra feil til recovery
3. **Tune terskler:** Juster P0/P1/P2 basert på falske alarmer
4. **Dokumenter avvik:** Hvis noe ikke matcher policy, oppdater policy eller kode

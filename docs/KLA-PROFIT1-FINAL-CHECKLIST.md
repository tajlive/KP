# KLA-PROFIT1 Final Checklist — Manuell Merge-Gate

## Forutsetning
⚠️ **Repository er privat uten GitHub Pro** → Ingen automatisk branch protection  
**Løsning:** Manuell prosess med selv-disiplin

---

## Steg 1: Vurder Branch Protection (valgfritt)

⚠️ **Repository er privat** → Branch protection krever GitHub Pro ($4/mnd) eller public repo

**Alternativer:**

### A) Gjøre repo public (gratis)
```bash
gh repo edit tajlive/KP --visibility public
# Deretter: Settings → Branches → Add rule for main
```

### B) Upgrade til GitHub Pro ($4/mnd)
```
Settings → Billing → Upgrade to Pro
```

### C) Fortsett uten (manuell prosess) ⭐ Anbefalt for nå
Fortsett til Steg 2 med manuell sjekkliste.

---

## Steg 2: Push og Opprett PR (2 min)

```bash
# I terminal
git checkout feat/ai-profit-max
git push origin feat/ai-profit-max
```

**Gå til:** https://github.com/tajlive/klarpakke/pull/new/feat/ai-profit-max

| # | Handling | Status |
|---|----------|--------|
| 1 | Klikk "Create pull request" | ⬜ |
| 2 | Sjekk at base er `main` | ⬜ |
| 3 | Klikk "Create pull request" | ⬜ |

---

## Steg 3: Verifiser PR (10 min)

Vent på at checks kjører (tar ca 10-15 min).

### Sjekk "Checks" tab

| Check | Forventet | Status |
|-------|-----------|--------|
| type-check | 🟡/🟢 kjører/grønn | ⬜ |
| lint | 🟡/🟢 kjører/grønn | ⬜ |
| unit-tests | 🟡/🟢 kjører/grønn | ⬜ |
| build | 🟡/🟢 kjører/grønn | ⬜ |
| e2e-tests | 🟡/🟢 kjører/grønn | ⬜ |

### Sjekk reviewers

| Sjekkpunkt | Status |
|------------|--------|
| @tajlive er auto-assigned under "Reviewers" | ⬜ |

### Sjekk merge-knapp

| Tilstand | Forventet | Status |
|----------|-----------|--------|
| Uten approval | Grå / "Review required" | ⬜ |
| Etter approval + grønne checks | Grønn / "Merge pull request" | ⬜ |
| Hvis en check feiler | Rød X / "Merge blocked" | ⬜ |

---

## Steg 4: Final Approval og Merge (3 min)

Når alle 5 checks er grønne:

| # | Handling | Status |
|---|----------|--------|
| 1 | @tajlive gir approval | ⬜ |
| 2 | Klikk "Merge pull request" | ⬜ |
| 3 | Velg "Squash and merge" | ⬜ |
| 4 | Klikk "Confirm merge" | ⬜ |

---

## Etter Merge

- [ ] Verifiser at Edge Function deployer (sjekk #deployments i Slack)
- [ ] Verifiser at /no/dashboard/metrics fungerer i prod
- [ ] Oppdater docs/KLA-PROFIT1-LINEAR-UPDATE.md til "GO for merge — verified"

---

## Feilsøking

### Problem: Checks dukker ikke opp
**Løsning:** Push en liten endring til feat/ai-profit-max for å trigge workflow.

### Problem: "This branch has conflicts"
**Løsning:** Rebase på main: `git pull origin main && git rebase main && git push -f`

### Problem: Checks feiler
**Løsning:** Sjekk logs i PR → Checks tab → klikk på feilet check.

---

**Starttid:** ___________  
**Sluttid:** ___________  
**Resultat:** ⬜ GO / ⬜ NEI

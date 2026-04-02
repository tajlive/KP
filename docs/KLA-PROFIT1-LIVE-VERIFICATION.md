# KLA-PROFIT1 Live Verifisering

## Status: ⏳ VENTER PÅ MANUELL VERIFISERING

**Dokumentasjon klar:** 2026-04-02  
**Verifisert av:** (fylles ut etter test)  
**Tidspunkt:** (fylles ut etter test)  

---

## Sjekkliste for Repo Admin

### 1. Branch Protection Aktivering

Gå til: https://github.com/tajlive/klarpakke/settings/branches

| Setting | Status |
|---------|--------|
| Add rule for `main` | ⬜ |
| Require pull request before merging | ⬜ |
| Require approvals: 1 | ⬜ |
| Dismiss stale PR approvals | ⬜ |
| Require review from Code Owners | ⬜ |
| Require status checks to pass | ⬜ |
| **Required checks lagt til:** | |
| ⬜ type-check | |
| ⬜ lint | |
| ⬜ unit-tests | |
| ⬜ build | |
| ⬜ e2e-tests | |
| Block force pushes | ⬜ |
| Save changes | ⬜ |

### 2. Live PR Test

```bash
# Kjør lokalt
git checkout feat/ai-profit-max
git push origin feat/ai-profit-max
```

Gå til: https://github.com/tajlive/klarpakke/pull/new/feat/ai-profit-max

| Sjekkpunkt | Status |
|------------|--------|
| PR opprettet mot `main` | ⬜ |
| "Checks" tab vises | ⬜ |
| 5 checks dukker opp: | |
| ⬜ type-check | |
| ⬜ lint | |
| ⬜ unit-tests | |
| ⬜ build | |
| ⬜ e2e-tests | |
| @tajlive auto-assigned som reviewer | ⬜ |
| Merge-knapp grå uten approval | ⬜ |
| Etter approval: merge mulig hvis grønt | ⬜ |
| Hvis rød check: merge blokkert | ⬜ |

### 3. Resultat

**Alle sjekker bestått:** ⬜ JA / ⬜ NEI  
**Hvis JA:** Endre status til "GO for merge"  
**Hvis NEI:** Dokumenter hva som feilet

---

## Etter Verifisering

1. Oppdater `docs/KLA-PROFIT1-LINEAR-UPDATE.md` med verifisert status
2. Oppdater `docs/RELEASE-GATE.md` med tidspunkt og resultat
3. Slett denne filen eller behold som logg

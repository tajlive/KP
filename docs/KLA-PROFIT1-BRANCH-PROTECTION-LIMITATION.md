# KLA-PROFIT1: Branch Protection Begrensning

**Oppdaget:** 2026-04-02  
**Status:** 🔴 Blocker for automatisk merge-gate

---

## Problem

Repository `tajlive/KP` er:
- ✅ Privat
- ✅ Personlig konto (ikke organisasjon)
- ❌ **Branch protection krever GitHub Pro**

GitHub API respons:
```json
{
  "message": "Upgrade to GitHub Pro or make this repository public to enable this feature."
}
```

---

## Konsekvenser

| Feature | Med Pro/Public | Uten (nåværende) |
|---------|---------------|------------------|
| Required status checks | ✅ Blokkerer merge | ❌ Ingen håndhevelse |
| Required PR reviews | ✅ Blokkerer merge | ❌ Ingen håndhevelse |
| CODEOWNERS enforcement | ✅ Blokkerer merge | ❌ Kun informativ |
| Dismiss stale approvals | ✅ Automatisk | ❌ Ikke tilgjengelig |
| Block force pushes | ✅ Teknisk sperre | ❌ Ingen sperre |

---

## Alternativer

### A) Gjøre Repository Public (Anbefalt for open source)

**Fordeler:**
- Gratis branch protection
- Full merge-gate funksjonalitet
- Transparent utvikling

**Ulemper:**
- Kode blir offentlig
- Kreker review av sensitive filer

**Kommando:**
```bash
gh repo edit tajlive/KP --visibility public
# eller via GitHub UI: Settings → Danger Zone → Change visibility
```

---

### B) Upgrade til GitHub Pro ($4/måned)

**Fordeler:**
- Beholder privat repo
- Full branch protection
- Andre Pro-funksjoner

**Ulemper:**
- Månedlig kostnad
- Personlig konto (ikke team-features)

**Kommando:**
```bash
# Via GitHub UI:
# Settings → Billing → Upgrade to Pro
```

---

### C) Manuell Prosess (Workaround)

**Tilnærming:**
- Ingen teknisk håndhevelse
- Ren prosess-disiplin
- Dokumentert sjekkliste

**Sjekkliste før merge:**
```markdown
- [ ] Kjør: npm run check:merge-ready (lokalt)
- [ ] Verifiser at alle 5 checks er grønne i PR
- [ ] Få eksplisitt approval fra reviewer
- [ ] Ingen force push til main
- [ ] Squash and merge
```

**Ulemper:**
- Menneskelig feil mulig
- Ingen automatisk blokkerings
- Krever selv-disiplin

---

## Anbefaling

**For KLA-PROFIT1 (nå):**

Hvis repo MÅ forbli privat uten Pro:
- ✅ Bruk manuell sjekkliste
- ✅ Dokumenter prosess i teamet
- ✅ Self-enforced merge-gate

**Langsiktig:**
- Vurder å gjøre repo public (hvis ikke sensitive data)
- Eller upgrade til Pro/Team/Enterprise

---

## Oppdatert Merge-Anbefaling

**Status:** 🟡 **CONDITIONAL GO - Manuel Prosess**

**Betingelser:**
1. ✅ CODEOWNERS på plass (informativ)
2. ✅ Workflows klare
3. ✅ Dokumentasjon klar
4. ⚠️ **Mangler:** Teknisk håndhevelse (krever Pro/Public)

**Merge-prosedyre uten branch protection:**
```bash
# 1. Verifiser lokalt
npm run check:merge-ready

# 2. Push og opprett PR
git push origin feat/ai-profit-max
gh pr create --base main

# 3. Vent på grønne checks i PR
# 4. Få approval fra reviewer
# 5. Merge manuelt (ingen teknisk sperre)
```

---

## Referanser

- GitHub Docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Pricing: https://github.com/pricing

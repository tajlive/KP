# Runbook: Rollback deployment

**Eier:** Taj  
**Bruk når:** Deploy feiler i produksjon, kritisk bug oppdaget  

## Steg

### 1. Identifiser feilende commit

```bash
git log --oneline -10
```

Noter commit hash som introduserte feilen.

---

### 2. Revert commit

```bash
git revert <commit-hash>
git push origin main
```

Cloudflare Pages deployer automatisk revert.

---

### 3. Database rollback (hvis nødvendig)

Hvis ny migrasjon introduserte feilen:

```bash
bash scripts/rollback.sh 20260201000000
```

Dette kjører `supabase migration repair --status reverted` for alle migrasjoner etter timestamp.

---

### 4. Verifiser

```bash
bash scripts/verify-production.sh
```

---

### 5. Postmortem

Skriv kort postmortem:

- Hva gikk galt?
- Hvorfor oppdaget vi det ikke i testing?
- Hvordan forhindre i fremtiden?

Legg til i `docs/postmortems/YYYY-MM-DD-beskrivelse.md`

---

## Emergency Contact

- Taj: taj@klarpakke.no

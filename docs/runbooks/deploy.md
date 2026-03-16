# Runbook: Deploy til produksjon

**Eier:** Taj  
**Sist oppdatert:** 2026-02-10  
**Estimert tid:** 10 minutter  

## Forutsetninger

- [ ] Tilgang til GitHub repo
- [ ] Lokal testing fullført (`bash scripts/full-deploy.sh` grønn)
- [ ] Ingen kritiske bugs i staging/local

## Steg

### 1. Lokal verifikasjon

```bash
cd ~/klarpakke

# Kjør full deploy chain
bash scripts/full-deploy.sh
```

Forventet output:
```
✅ DB-tilkobling OK
✅ TypeScript 0 errors
✅ Build success (67 sider)
```

Hvis feil: Se [docs/08-TROUBLESHOOTING.md](../08-TROUBLESHOOTING.md)

---

### 2. Commit og push

```bash
git add .
git commit -m "feat: beskrivelse av endring"
git push origin main
```

---

### 3. Overvåk GitHub Actions

URL: https://github.com/tajlive/KP/actions

Jobs:

| Job | Varighet | Beskrivelse |
|-----|----------|-------------|
| database | ~2 min | Kjører Supabase migrasjoner |
| verify | ~2 min | TypeScript kompilering |
| build | ~3 min | Next.js build + ESLint |
| deploy | ~1 min | Verifiserer Cloudflare trigger |

**Total tid:** ~10-12 minutter

---

### 4. Verifiser produksjon

```bash
# Automatisert verifisering
bash scripts/verify-production.sh
```

Forventet output:
```
✅ https://www.klarpakke.no - 200 OK
✅ https://www.klarpakke.no/no/dashboard - 302
✅ Health endpoint - OK
```

Manuell verifisering:
1. Besøk https://www.klarpakke.no
2. Sjekk console for errors (F12)
3. Test navigasjon
4. Verifiser admin login fungerer

---

## Hvis Noe Går Galt

1. Sjekk GitHub Actions logs
2. Kjør samme kommando lokalt for å reprodusere
3. Fiks og push igjen
4. Ved kritiske feil: Se [rollback.md](rollback.md)

---

## Post-Deploy

- [ ] Overvåk i 24 timer
- [ ] Sjekk Cloudflare Analytics
- [ ] Sjekk Supabase Logs
- [ ] Bekreft ingen errors i Sentry (hvis konfigurert)

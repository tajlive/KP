# 🚨 KRITISK: Auth-Fiks etter Deploy

## Status: FEILKONFIGURERT PRODUKSJON

### Problemet
Produksjon peker på FEIL Supabase-prosjekter:
- **Kode** peker på: `vuxbjlykgmzskxbclquf` (riktig)
- **Produksjon** peker på: `oysfdzutvezqhainaxba` (FEIL!)

Dette forklarer hvorfor OAuth "stopper opp" - Google Provider er ikke satt opp i `oysfdzutvezqhainaxba`!

---

## 🔥 Umiddelbare Handlinger

### 1. Sjekk Vercel Produksjonsmiljø

```bash
cd ~/klarpakke

# Liste alle env variabler for produksjon
npx vercel env ls | grep -E "(production|Production)"

# Spesifikt sjekk SUPABASE_URL
npx vercel env ls | grep "SUPABASE_URL"
```

**Forventet:** Skal vise `vuxbjlykgmzskxbclquf`  
**Hvis den viser:** `oysfdzutvezqhainaxba` → **DET ER FEIL!**

---

### 2. Fiks Vercel Env Variabler (Hvis Feil)

Hvis produksjon har `oysfdzutvezqhainaxba`, fiks umiddelbart:

```bash
# Fjern feil env var
npx vercel env rm NEXT_PUBLIC_SUPABASE_URL production
npx vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env rm SUPABASE_SERVICE_ROLE_KEY production

# Legg til riktig env var (vuxbjlykgmzskxbclquf)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Verdi: https://vuxbjlykgmzskxbclquf.supabase.co

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production  
# Verdi: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzA5MTQsImV4cCI6MjA4NjI0NjkxNH0.9b45CqICVUMkq-ByRZFr5kC2QcvFedUzsWO2kVfkC4

npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Verdi: [fra .env.local - service role key]
```

---

### 3. Sjekk Google Provider i Riktig Prosjekt

**Prosjekt:** `vuxbjlykgmzskxbclquf` (det som ENDER på .co)

Gå til: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/providers

**MÅ SJEKKE:**
- [ ] Google er ENABLED
- [ ] Client ID er satt
- [ ] Client Secret er satt
- [ ] Authorized Redirect URI inneholder: `https://www.klarpakke.no/**`

Hvis Google mangler eller er feil:
1. Gå til Google Cloud Console
2. Hent Client ID og Secret
3. Legg til i Supabase

---

### 4. Redeploy etter Env-Fiks

```bash
# Commit eventuelle endringer
git add -A
git commit -m "fix: env variabler for produksjon"

# Force redeploy
npx vercel --prod --yes
```

---

## ✅ Verifiseringssteg

Etter fiks, test:

```bash
# 1. Sjekk at env er riktig
npx vercel env ls | grep "SUPABASE_URL" | grep production

# 2. Test deploy
sleep 60
curl -s https://www.klarpakke.no/no/login | grep -o "Logg inn" | head -1

# 3. Test Google login (manuelt i nettleser)
# Gå til https://www.klarpakke.no/no/login
# Klikk "Fortsett med Google"
# Skal redirecte til Google (ikke blank side!)
```

---

## 📋 Sjekkliste før du starter

- [ ] Har du tilgang til Vercel CLI? (`npx vercel whoami`)
- [ ] Har du tilgang til Supabase dashboard?
- [ ] Har du Google Cloud Console tilgang?

Hvis NEI på noen av disse → Be meg (KIMI) om hjelp til å få tilgang.

---

## 🆘 Hvis du ikke kan fikse Vercel env

Hvis du ikke har tilgang til å endre Vercel env variabler:

1. **Rapporter til meg:** 
   - Hvilken SUPABASE_URL er satt i produksjon?
   - Bekreft at det er `oysfdzutvezqhainaxba`

2. **Jeg vil:**
   - Kontakte Taj for Vercel-tilgang ELLER
   - Sette opp Google Provider i `oysfdzutvezqhainaxba` isteden

---

**Dette er P0 - Auth er helt nede!** 🔥

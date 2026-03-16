# 🔒 STRENGT ARBEIDSFLYT-REGELVERK

## TL;DR: Alltid GitHub først → Vercel bygger automatisk → KIMI leser via MCP

---

## 📋 ARBEIDSFLYT-HIERARKI

```
1. GitHub (Source of Truth)
   ↓ (automatisk via GitHub Actions / Vercel Git Integration)
2. Vercel (Produksjon)
   ↓ (KIMI leser via MCP)
3. KIMI AI Agent (Leser og analyserer)
```

---

## ⚠️ KRITISKE REGLER

### ✅ ALLTID GJØR:

1. **Commit og push til GitHub FØRST**
   ```bash
   git add -A
   git commit -m "beskrivelse"
   git push origin main
   ```

2. **Vent på Vercel deployment**
   - Vercel bygger automatisk ved push (~2-3 min)
   - Verifiser grønn status: https://vercel.com/dashboard
   - Eller: https://github.com/tajlive/KP/actions (hvis CI enabled)

3. **La KIMI hente data via MCP**
   - KIMI bruker Klarpakke MCP Server
   - Henter data fra Vercel, Supabase, GitHub
   - KIMI leser alltid nyeste deployed versjon

---

### ❌ ALDRI GJØR:

1. **ALDRI rediger filer direkte i Vercel Dashboard**
   - ❌ Environment variables (manuelt)
   - ❌ Secrets (manuelt)
   
   **Hvorfor?** Git er source of truth - manuelle endringer overskrives.

2. **ALDRI commit secrets til GitHub**
   - ❌ `.env`-filer
   - ❌ API keys
   
   **Løsning:** Bruk Vercel Environment Variables

3. **ALDRI hopp over tester**
   ```bash
   # ❌ ALDRI dette
   git push --no-verify
   
   # ✅ Alltid dette
   npm run type-check && npm run test:unit && git push
   ```

4. **ALDRI force push til main**
   ```bash
   # ❌ ALDRI
   git push --force origin main
   
   # ✅ Hvis du må, bruk feature branch
   git checkout -b fix/my-fix
   git push origin fix/my-fix
   # Merge via PR
   ```

---

## 🔄 STANDARD ARBEIDSFLYT

### Scenario 1: Endre kode

```bash
# 1. Gjør endringer lokalt
code src/app/[locale]/dashboard/page.tsx

# 2. Test lokalt
npm run dev
npm run type-check
npm run test:unit

# 3. Commit og push
git add -A
git commit -m "feat: add new dashboard feature"
git push origin main

# 4. Verifiser Vercel deployment
# Vercel bygger automatisk - sjekk https://vercel.com/dashboard

# 5. Test i produksjon
curl -I https://www.klarpakke.no/no/dashboard
```

### Scenario 2: Oppdatere secrets/environment variables

```bash
# 1. Oppdater via Vercel CLI eller Dashboard
vercel env add MY_SECRET production
# Eller: https://vercel.com/dashboard → Project → Settings → Environment Variables

# 2. Redeploy for å hente nye verdier
vercel --prod
```

### Scenario 3: Be KIMI om hjelp

```bash
# 1. Sørg for at latest code er i GitHub
git push origin main

# 2. Vent på Vercel deployment (2-3 min)
# Sjekk Vercel dashboard

# 3. Be KIMI via MCP
# KIMI vil:
# - Lese fra GitHub repo via MCP
# - Sjekke Vercel deployment status via MCP
# - Sjekke Supabase via MCP
# - Analysere og foreslå endringer
```

---

## 🚨 FEILSØKING

### Problem: "GitHub Actions feiler"

```bash
# 1. Sjekk CI logs
gh run view --log

# 2. Reproduser lokalt
npm run type-check
npm run build

# 3. Fiks feil, commit, push
git add -A
git commit -m "fix: resolve CI failure"
git push origin main
```

### Problem: "Vercel build feiler"

```bash
# 1. Sjekk Vercel logs
vercel logs --all

# 2. Reproduser lokalt
npm run build

# 3. Vanlige årsaker:
# - TypeScript feil
# - Manglende environment variables
# - Import errors

# 4. Fiks og push
```

### Problem: "KIMI ser ikke mine endringer"

```bash
# 1. Verifiser at endringene er pushet
git log -1 --oneline

# 2. Sjekk at Vercel deployment er ferdig
vercel list

# 3. Verifiser i produksjon
curl -I https://www.klarpakke.no/no

# 4. KIMI bruker MCP - vent 1-2 min for cache-refresh
```

---

## 📁 MAPPER SOM IKKE SKAL COMMITTES

Legg til i `.gitignore`:

```gitignore
# Environment
.env
.env.local
.env.production

# Build artifacts
.next/
out/
build/
dist/

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db
```

---

## 🔐 SECRETS MANAGEMENT

### Vercel Environment Variables

```bash
# Sett secret via CLI
vercel env add MY_SECRET production

# Sett secret for preview deployments
vercel env add MY_SECRET preview

# Sett secret for development
vercel env add MY_SECRET development

# List secrets
vercel env ls
```

### Viktige miljøvariabler

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Sentry
NEXT_PUBLIC_SENTRY_DSN

# Andre
CRON_SECRET
GITHUB_TOKEN
```

---

## 🎯 KIMI INTEGRASJON

### Hva KIMI kan gjøre via MCP:

✅ **Lese fra GitHub:**
- Kildekode
- Commits
- Pull requests
- Issues
- Workflow runs

✅ **Lese fra Vercel:**
- Deployment status
- Build logs
- Environment variables (navn, ikke verdier)

✅ **Lese fra Supabase:**
- Database schema
- Rader (anonymisert)
- Brukerstatistikk

✅ **Foreslå endringer:**
- Generer kode-fikser
- Oppdater workflow-filer
- Lag nye features

❌ **KIMI kan IKKE:**
- Endre produksjon direkte
- Se secrets (kun at de eksisterer)
- Deploy uten GitHub/Vercel

---

## 📊 VERIFISERING AV ARBEIDSFLYT

### Sjekkliste før KIMI-konsultasjon:

- [ ] `git status` er ren (ingen uncommitted changes)
- [ ] Latest commit er pushet: `git log -1 --oneline`
- [ ] Vercel build er grønn: `vercel list`
- [ ] Produksjon er oppdatert: `curl -I https://www.klarpakke.no/no`
- [ ] Ingen secrets i git history

---

## 🚀 QUICK REFERENCE

```bash
# Full arbeidsflyt (kopier-lim inn)
npm run type-check && \
npm run test:unit && \
git add -A && \
git commit -m "feat: your message here" && \
git push origin main

# Verifiser produksjon
sleep 120 && curl -I https://www.klarpakke.no/no

# Be KIMI om hjelp (etter push + deploy)
# Bruk KIMI CLI med MCP enabled
```

---

## 🔗 RESSURSER

- **GitHub Repo:** https://github.com/tajlive/KP
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Produksjon:** https://www.klarpakke.no
- **Supabase Dashboard:** https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf

---

## 🎓 HUSKEREGEL

**"GitHub er sannheten, Vercel er speilet, KIMI er rådgiveren"**

1. ✍️ Rediger i GitHub
2. 🚀 Vercel bygger automatisk
3. 🤖 KIMI leser og hjelper via MCP

**ALDRI andre veien rundt!**

---

## 📝 REVISJONSHISTORIKK

| Dato | Endring | Utført av |
|------|---------|-----------|
| 2026-02-25 | Oppdatert til Vercel workflow | KIMI |
| 2026-02-20 | Fjernet Google Cloud referanser | KIMI |

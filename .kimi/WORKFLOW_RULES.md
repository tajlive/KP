# 🔒 STRENGT ARBEIDSFLYT-REGELVERK

> **Sist oppdatert:** 2026-06-29 av Lead Architect
> **Gjelder for:** Klarpakke produksjon (www.klarpakke.no)

## TL;DR: Alltid GitHub først → Cloudflare Workers Builds deployer automatisk → KIMI leser via MCP

---

## 📋 ARBEIDSFLYT-HIERARKI

```
1. GitHub (Source of Truth)
   ↓ (automatisk via Cloudflare Workers Builds — koblet til repo)
2. Cloudflare Workers Edge Network (Produksjon, global)
   ↓ (KIMI leser via MCP)
3. KIMI AI Agent (Leser og analyserer)
```

**Husk:** GitHub er sannheten, Cloudflare Workers er speilet, KIMI er rådgiveren. ALDRI andre veien rundt.

---

## ⚠️ KRITISKE REGLER

### ✅ ALLTID GJØR:

1. **Commit og push til GitHub FØRST**
   ```bash
   git add -A
   git commit -m "type: beskrivelse"
   git push origin main
   ```

2. **Vent på Cloudflare Workers Builds deployment**
   - Cloudflare Workers Builds bygger automatisk ved push til `main` (~2–3 min)
   - Verifiser med Wrangler: `npx wrangler deployment list`
   - Se også Cloudflare Dashboard → Workers & Pages → klarpakke

3. **Test lokalt før push**
   ```bash
   npm run type-check
   npm run lint:gate
   npm run test:unit
   npm run cf:build   # valgfritt, men sterkt anbefalt for større endringer
   ```

4. **La KIMI hente data via MCP**
   - KIMI leser fra GitHub repo, Cloudflare (via Wrangler), og Supabase via MCP
   - KIMI leser alltid nyeste deployed versjon

---

### ❌ ALDRI GJØR:

1. **ALDRI rediger filer direkte i Cloudflare Dashboard**
   - ❌ Worker-script (rediger i repo)
   - ❌ Environment variables / secrets (bruk Wrangler CLI)
   - ❌ Routes (defineres i `wrangler.jsonc`)

   **Hvorfor?** Git er source of truth — manuelle endringer overskrives ved neste deploy.

2. **ALDRI commit secrets til GitHub**
   - ❌ `.env`-filer
   - ❌ API keys
   - ❌ `.mcp-cache/`

   **Løsning:** Bruk Cloudflare Worker secrets via Wrangler:
   ```bash
   npx wrangler secret put MY_SECRET
   ```

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

5. **ALDRI bruk `npm install`** — alltid `npm ci --legacy-peer-deps`

---

## 🔄 STANDARD ARBEIDSFLYT

### Scenario 1: Endre kode

```bash
# 1. Gjør endringer lokalt
code src/app/[locale]/dashboard/page.tsx

# 2. Test lokalt
npm run type-check
npm run lint:gate
npm run test:unit

# 3. Bygg for Cloudflare (valgfritt, anbefalt for større endringer)
npm run cf:build

# 4. Commit og push
git add -A
git commit -m "feat: add new dashboard feature"
git push origin main

# 5. Vent på Cloudflare Workers Builds deployment
npx wrangler deployment list

# 6. Test i produksjon
curl -I https://www.klarpakke.no/no/dashboard
```

### Scenario 2: Oppdatere secrets/environment variables

```bash
# 1. Sett secret via Wrangler CLI
npx wrangler secret put MY_SECRET

# 2. Verifiser at secret er satt
npx wrangler secret list

# 3. Cloudflare Workers Builds vil plukke opp secret ved neste deploy
```

### Scenario 3: Manuell deploy (kun nødsituasjon / backup)

```bash
# Kun hvis Cloudflare Workers Builds feiler
npm run cf:deploy
```

### Scenario 4: Be KIMI om hjelp

```bash
# 1. Sørg for at latest code er i GitHub
git push origin main

# 2. Vent på Cloudflare Workers Builds deployment (~2–3 min)
npx wrangler deployment list

# 3. Be KIMI via MCP
# KIMI vil:
# - Lese fra GitHub repo via MCP
# - Sjekke Cloudflare deployment status via Wrangler MCP
# - Sjekke Supabase via MCP
# - Analysere og foreslå endringer
```

---

## 🚨 FEILSØKING

### Problem: "Cloudflare Workers Builds feiler"

```bash
# 1. Sjekk deployment status og logs
npx wrangler deployment list
npx wrangler tail

# 2. Reproduser lokalt
npm run type-check
npm run cf:build

# 3. Vanlige årsaker:
# - TypeScript feil
# - Manglende environment variables / secrets
# - Import errors (Node.js-only moduler i Worker)
# - For stor bundle

# 4. Fiks feil, commit, push
git add -A
git commit -m "fix: resolve Cloudflare build failure"
git push origin main
```

### Problem: "KIMI ser ikke mine endringer"

```bash
# 1. Verifiser at endringene er pushet
git log -1 --oneline

# 2. Sjekk at Cloudflare deployment er ferdig
npx wrangler deployment list

# 3. Verifiser i produksjon
curl -I https://www.klarpakke.no/no

# 4. KIMI bruker MCP — vent 1–2 min for cache-refresh
```

### Problem: "Produksjon nede"

1. Sjekk status: `npx wrangler deployment list`
2. Se live logs: `npx wrangler tail | head -50`
3. Test health: `curl https://www.klarpakke.no/api/health`
4. Følg `.kimi/EMERGENCY_PROD_FIX.md`

---

## 📁 MAPPER SOM IKKE SKAL COMMITTES

Disse ligger allerede i `.gitignore` — dobbeltsjekk at de ikke kommer med:

```gitignore
# Environment
.env
.env.local
.env.production
.mcp-cache/

# Build artifacts
.next/
.open-next/
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

### Cloudflare Worker Secrets (Wrangler)

```bash
# Sett secret
npx wrangler secret put MY_SECRET

# Sett secret for lokal utvikling
npx wrangler secret put MY_SECRET --local

# List secrets
npx wrangler secret list
```

### Viktige miljøvariabler / secrets

**Runtime secrets (Cloudflare Dashboard / Wrangler):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXTAUTH_URL=https://www.klarpakke.no
NEXTAUTH_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
CRON_SECRET
```

**Build-time (Cloudflare Workers Builds / lokalt):**
```
STRIPE_SECRET_KEY=sk_test_build_only   # Dummy for build
SKIP_ENV_VALIDATION=true
NEXT_TELEMETRY_DISABLED=1
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

✅ **Lese fra Cloudflare (via Wrangler):**
- Deployment status
- Live logs
- Worker config

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
- Deploy uten GitHub/Cloudflare

---

## 📊 VERIFISERING AV ARBEIDSFLYT

### Sjekkliste før KIMI-konsultasjon:

- [ ] `git status` er ren (ingen uncommitted changes)
- [ ] Latest commit er pushet: `git log -1 --oneline`
- [ ] Cloudflare Workers build er grønn: `npx wrangler deployment list`
- [ ] Produksjon er oppdatert: `curl -I https://www.klarpakke.no/no`
- [ ] Ingen secrets i git history

---

## 🚀 QUICK REFERENCE

```bash
# Full arbeidsflyt (kopier-lim inn)
npm run type-check && \
npm run lint:gate && \
npm run test:unit && \
git add -A && \
git commit -m "type: your message here" && \
git push origin main

# Verifiser produksjon
sleep 120 && npx wrangler deployment list && curl -I https://www.klarpakke.no/no

# Be KIMI om hjelp (etter push + deploy)
# KIMI leser via MCP
```

---

## 🔗 RESSURSER

- **GitHub Repo:** https://github.com/tajlive/KP
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Produksjon:** https://www.klarpakke.no
- **Supabase Dashboard:** https://supabase.com/dashboard/project/pskhryjzkobytnfwucrb

---

## 🎓 HUSKEREGEL

**"GitHub er sannheten, Cloudflare Workers er speilet, KIMI er rådgiveren"**

1. ✍️ Rediger i GitHub
2. ☁️ Cloudflare Workers Builds deployer automatisk
3. 🤖 KIMI leser og hjelper via MCP

**ALDRI andre veien rundt!**

---

## 📝 REVISJONSHISTORIKK

| Dato | Endring | Utført av |
|------|---------|-----------|
| 2026-02-25 | Oppdatert til Vercel workflow | KIMI |
| 2026-06-29 | Migrert til Cloudflare Workers Builds | Lead Architect |

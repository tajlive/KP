# KLARPAKKE: SQL Automatiseringsguide

Denne guiden forklarer hvordan du kan automatisere SQL-kjøring med eksisterende MCP/CLI/API integrasjon.

---

## 🔧 Alternativer (Rangert etter enkelhet)

### Alternativ 1: Auto-Open + Clipboard (Enklest) ⭐
```bash
./scripts/sql-cleanup-auto.sh
```
**Hva den gjør:**
- Kopierer SQL til clipboard
- Åpner Supabase SQL Editor i browser
- Gir instruksjoner

**Fordeler:** Ingen oppsett nødvendig
**Ulemper:** Krever manuell "Lim inn + Klikk Run"

---

### Alternativ 2: REST API med Service Role Key (Full Auto)
```bash
# 1. Hent service_role key fra Supabase Dashboard
#    https://app.supabase.com/project/vuxbjlykgmzskxbclquf/settings/api

# 2. Sett environment variable
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# 3. Kjør
./scripts/final-auto-executor.sh
```

**Hva den gjør:**
- Kjører SQL direkte via Supabase REST API
- Backup + Diagnostikk + Bot Health Setup automatisk
- RLS Fix krever fortsatt manuell kjøring (kompleks DO block)

---

### Alternativ 3: Node.js Script (Maks kontroll)
```bash
# Sett env vars
export NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_key

# Kjør
node scripts/execute-sql-cleanup.js
```

---

## 🔑 Hvordan Hente Service Role Key

### Via Supabase Dashboard:
1. Gå til: https://app.supabase.com/project/vuxbjlykgmzskxbclquf/settings/api
2. Kopier "service_role key" (hemmelig - ikke del!)
3. Sett som environment variable

### Via Cloudflare Workers Builds (anbefalt):
```bash
# Miljøvariabler settes via Wrangler secrets / Cloudflare Dashboard
# Service role key skal settes som Worker secret: npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

**Merk:** Vercel brukes ikke lenger. Cloudflare Workers Builds er primær deploy-plattform.

---

## 📊 Hva Kan Automatiseres vs Manuel

| Del | Automatiserbar | Kommentar |
|-----|----------------|-----------|
| **Backup** | ✅ Ja | Enkel CREATE TABLE AS |
| **Diagnostikk** | ✅ Ja | SELECT queries fungerer fint |
| **RLS Fix** | ⚠️ Delvis | DO $$ blokker er komplekse |
| **Bot Health Setup** | ✅ Ja | CREATE TABLE + INDEX |
| **Cron Job** | ⚠️ Krever pg_cron | Må kjøres i SQL Editor |

---

## 🚀 Anbefalt Fremgangsmåte

### For raskt resultat (nå):
```bash
# 1. Kopier SQL til clipboard og åpne browser
./scripts/sql-cleanup-auto.sh

# 2. I browser: Lim inn + Klikk Run
# 3. Kopier output tilbake til terminal/Kimi
```

### For full automatisering (senere):
1. Sett opp `SUPABASE_SERVICE_ROLE_KEY` som Wrangler-secret (via Cloudflare Dashboard eller `npx wrangler secret put`)
2. Bruk `./scripts/final-auto-executor.sh`
3. Få 90% automatikk (resten er komplekse DO blocks)

---

## 💡 Fremtidige Forbedringer

For 100% automatisering uten manuell intervensjon:

1. **Deploy Edge Function** som kjører SQL
   - Opprett: `supabase/functions/exec-sql/index.ts`
   - Kall med service_role fra CLI

2. **GitHub Actions Workflow**
   ```yaml
   - name: Run SQL Cleanup
     run: |
       export SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
       node scripts/execute-sql-cleanup.js
   ```

3. **Supabase MCP Server**
   - Hvis MCP får SQL execution capabilities
   - Kan da kjøre alt direkte via MCP

---

## 🎯 Oppsummering

**Nå:** Bruk `./scripts/sql-cleanup-auto.sh` for raskest resultat

**Ideelt:** Sett opp service_role key og bruk `./scripts/final-auto-executor.sh`

**Perfekt:** Vent på at Supabase CLI får native SQL execution, eller bruk Edge Function

---

*Sist oppdatert: 2026-02-24*

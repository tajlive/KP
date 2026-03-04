# Klarpakke Dokumentasjon - Index

> **Versjon:** 1.1.0  
> **Oppdatert:** 2026-02-10  
> **Status:** GitHub Migration Fullført ✅  
> **For:** Utviklere, AI-agenter, administratorer

---

## 🚀 Quickstart

```bash
# 1. Clone repo
git clone https://github.com/tombomann/klarpakke.git
cd klarpakke

# 2. Installer avhengigheter
npm install --legacy-peer-deps

# 3. Konfigurer miljø
cp .env.example .env.local
# Fyll inn: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Kjør lokalt
npm run dev
# Åpne: http://localhost:3000

# 5. Full deploy chain (før push til main)
bash scripts/full-deploy.sh
```

---

## 📚 Dokumentasjonsoversikt

### For AI-agenter 🤖

Start her for rask context:

1. **[`.ai/context.md`](../.ai/context.md)** - Prosjekt-identitet, stack, regler
2. **[`.ai/conventions.md`](../.ai/conventions.md)** - Code conventions (TypeScript, React, Tailwind)
3. **`docs/00-INDEX.md`** (denne filen) - Navigasjon

### Kjernedokumentasjon (01-10)

| # | Dokument | Beskrivelse | Målgruppe |
|---|----------|-------------|-----------|
| 01 | [ARCHITECTURE.md](01-ARCHITECTURE.md) | System-arkitektur, stack, data flow | Utviklere |
| 02 | [DATABASE.md](02-DATABASE.md) | Schema, RLS policies, vanlige queries | Utviklere |
| 03 | [API.md](03-API.md) | API endpoints, request/response format | Utviklere |
| 04 | [DEPLOYMENT.md](04-DEPLOYMENT.md) | Deploy-prosess, CI/CD, rollback | DevOps |
| 05 | [TESTING.md](05-TESTING.md) | Testing-strategi, unit/E2E/RLS tester | QA/Utviklere |
| 06 | [LÆREPLAN.md](06-LÆREPLAN.md) | Komplett læreplan (norsk) | Pedagoger |
| 07 | [ADMIN-GUIDE.md](07-ADMIN-GUIDE.md) | Admin-panel brukerveiledning (norsk) | Administratorer |
| 08 | [TROUBLESHOOTING.md](08-TROUBLESHOOTING.md) | Vanlige feil og løsninger | Alle |
| 09 | [SECURITY.md](09-SECURITY.md) | Sikkerhet, RLS, auth, secrets | Utviklere |
| 10 | [CONTRIBUTING.md](10-CONTRIBUTING.md) | Bidra til prosjektet | Contributors |

### Architecture Decision Records (ADRs)

Historiske beslutninger og begrunnelser:

- [ADR-001: Next.js over Remix](adr/001-next-vs-remix.md)
- [ADR-002: Supabase over Firebase](adr/002-supabase-vs-firebase.md)
- [ADR-003: Cloudflare over Vercel](adr/003-cloudflare-vs-vercel.md)
- [ADR-004: TypeScript strict mode](adr/004-typescript-strict.md)
- [ADR-005: RLS over middleware](adr/005-rls-vs-middleware.md)

### Runbooks (Operasjonelle prosedyrer)

Steg-for-steg guider for vanlige operasjoner:

- [Deploy til produksjon](runbooks/deploy.md)
- [Rollback deployment](runbooks/rollback.md)
- [Database migrasjon](runbooks/database-migration.md)
- [Emergency stop TAJ Robot](runbooks/emergency-stop-robot.md)

---

## 📊 Status og Metrics

| Metric | Status |
|--------|--------|
| TypeScript errors | 0 ✅ |
| Build | 67 sider ✅ |
| RLS coverage | 100% ✅ |
| Test coverage | E2E ✅ |
| Dokumentasjon | 20+ filer ✅ |

---

## 🔗 Nyttige Lenker

### Produksjon
- **Nettside:** https://www.klarpakke.no
- **Admin:** https://www.klarpakke.no/admin
- **API Health:** https://www.klarpakke.no/api/health

### Utvikling
- **GitHub:** https://github.com/tombomann/klarpakke
- **Supabase:** https://app.supabase.com/project/vuxbjlykgmzskxbclquf
- **Cloudflare:** https://dash.cloudflare.com

### Support
- **E-post:** support@klarpakke.no
- **Eier:** Taj (@tomarnejensen)

---

## 🗺️ Navigasjon etter Rolle

### Ny Utvikler
1. [ARCHITECTURE.md](01-ARCHITECTURE.md) - Forstå systemet
2. [CONTRIBUTING.md](10-CONTRIBUTING.md) - Sett opp utviklingsmiljø
3. `.ai/conventions.md` - Lær code conventions
4. [TESTING.md](05-TESTING.md) - Forstå testing

### AI-Agent (KIMI/Cursor/Copilot)
1. `.ai/context.md` - Rask context (5 min)
2. [ARCHITECTURE.md](01-ARCHITECTURE.md) - Stack og data flow
3. [DATABASE.md](02-DATABASE.md) - Schema og RLS
4. `.ai/conventions.md` - Code conventions

### Administrator (Taj)
1. [ADMIN-GUIDE.md](07-ADMIN-GUIDE.md) - Bruk admin-panel
2. [runbooks/deploy.md](runbooks/deploy.md) - Deploy-prosess
3. [TROUBLESHOOTING.md](08-TROUBLESHOOTING.md) - Løs problemer

### Pedagog/Lærer
1. [LÆREPLAN.md](06-LÆREPLAN.md) - Komplett læreplan

---

## 📝 Konvensjoner

### Språk
- **Norsk:** Brukerdokumentasjon (LÆREPLAN, ADMIN-GUIDE)
- **Engelsk:** Teknisk dokumentasjon (ARCHITECTURE, DATABASE, API)

### Formatering
- Markdown med GitHub-flavored syntax
- Headers: `##` for hovedseksjoner, `###` for underseksjoner
- Kodeblokker med språk-tag: ```typescript
- Tabeller for strukturert data

### Vedlikehold
- Oppdater ved endringer i kode
- Versjonsdato i header
- Lenker skal være relative (./fil.md)

---

**Sist oppdatert:** 2026-02-10 av KIMI Code (Fase 4)

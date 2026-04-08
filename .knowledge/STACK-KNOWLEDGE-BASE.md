# 🧰 Stack Knowledge Base

> **Levende dokumentasjon for alle verktøy, biblioteker og tjenester i Klarpakke**

## Hvorfor dette er kritisk

| Problem | Konsekvens | Løsning |
|---------|-----------|---------|
| "Hvordan oppdaterte vi Next.js sist?" | Gjentatte feil | Logg i `upgrades/nextjs.md` |
| "Hva var workaround for ChromaDB?" | Tidstap | Dokumenter i `workarounds/chromadb.md` |
| "Er dette en kjent Supabase bug?" | Unødig debugging | Sjekk `known-issues/supabase.md` |
| "Hvilken versjon bruker vi?" | Inkonsistens | `versions/current.json` |

## Struktur

```
.knowledge/stack/
├── versions/           # Nåværende og planlagte versjoner
├── upgrades/           # Oppgraderings-historikk og prosedyrer
├── workarounds/        # Kjente issues og løsninger
├── known-issues/       # Tracked bugs fra upstream
├── docs/              # Mirrors av viktig ekstern docs
└── forum/             # Utvalgte forum-tråder og løsninger
```

## Stack Oversikt

### Frontend Stack

| Verktøy | Versjon | Docs | Support | Forum | Status |
|---------|---------|------|---------|-------|--------|
| Next.js | 15.x | [docs](https://nextjs.org/docs) | [GitHub](https://github.com/vercel/next.js/discussions) | [Discord](https://nextjs.org/discord) | ✅ Oppdatert |
| React | 19.x | [docs](https://react.dev) | [GitHub](https://github.com/facebook/react/issues) | [Discord](https://react.dev/community) | ✅ Oppdatert |
| TypeScript | 5.9 | [docs](https://www.typescriptlang.org/docs) | [GitHub](https://github.com/microsoft/TypeScript/issues) | [Stack Overflow](https://stackoverflow.com/questions/tagged/typescript) | ✅ Oppdatert |
| Tailwind CSS | 4.x | [docs](https://tailwindcss.com/docs) | [GitHub](https://github.com/tailwindlabs/tailwindcss/issues) | [Discord](https://tailwindcss.com/discord) | ⚠️ Sjekk v4 breaking |

### Backend Stack

| Verktøy | Versjon | Docs | Support | Forum | Status |
|---------|---------|------|---------|-------|--------|
| Supabase | - | [docs](https://supabase.com/docs) | [GitHub](https://github.com/supabase/supabase/issues) | [Discord](https://discord.supabase.com) | ✅ Oppdatert |
| PostgreSQL | 15.x | [docs](https://www.postgresql.org/docs/) | - | [Stack Overflow](https://stackoverflow.com/questions/tagged/postgresql) | ✅ Oppdatert |
| Prisma | - | [docs](https://www.prisma.io/docs) | [GitHub](https://github.com/prisma/prisma/issues) | [Slack](https://prisma.slack.com) | ⚠️ Vurder native SQL |

### Trading Stack

| Verktøy | Versjon | Docs | Support | Forum | Status |
|---------|---------|------|---------|-------|--------|
| Binance API | - | [docs](https://binance-docs.github.io/apidocs/) | [GitHub](https://github.com/binance-exchange/binance-official-api-docs) | [Telegram](https://t.me/binance_api_english) | ✅ Dokumentert |
| Bybit API | - | [docs](https://bybit-exchange.github.io/docs/) | [GitHub](https://github.com/bybit-exchange/docs) | [Discord](https://discord.com/invite/bybit) | ⚠️ Sjelden brukt |
| CCXT | - | [docs](https://docs.ccxt.com/) | [GitHub](https://github.com/ccxt/ccxt/issues) | [Discord](https://discord.gg/ccxt) | ✅ Vurder |

### AI/ML Stack

| Verktøy | Versjon | Docs | Support | Forum | Status |
|---------|---------|------|---------|-------|--------|
| MemPalace | 3.0.0 | [docs](https://github.com/milla-jovovich/mempalace) | [GitHub Issues](https://github.com/milla-jovovich/mempalace/issues) | - | ✅ M1 workaround |
| OpenAI | - | [docs](https://platform.openai.com/docs) | [Help](https://help.openai.com) | [Community](https://community.openai.com) | ✅ Standard |
| Anthropic | - | [docs](https://docs.anthropic.com) | [Support](https://support.anthropic.com) | [Discord](https://anthropic.com/discord) | ✅ Primær |

### DevOps Stack

| Verktøy | Versjon | Docs | Support | Forum | Status |
|---------|---------|------|---------|-------|--------|
| Vercel | - | [docs](https://vercel.com/docs) | [Support](https://vercel.com/support) | [Discord](https://vercel.com/discord) | ✅ Pro plan |
| GitHub Actions | - | [docs](https://docs.github.com/en/actions) | [Support](https://support.github.com) | [Community](https://github.community) | ✅ 30 workflows |
| Docker | - | [docs](https://docs.docker.com) | [GitHub](https://github.com/docker/docker-ce/issues) | [Forums](https://forums.docker.com) | ⚠️ Sjelden brukt |

## Kjente Issues & Workarounds

### 🔴 Kritisk

#### ChromaDB på M1 Mac
```yaml
verktøy: ChromaDB
issue: "Error deserializing pickle file on macOS ARM64"
upstream_issue: "https://github.com/milla-jovovich/mempalace/issues/74"
workaround: "Bruk knowledge-search.sh (fil-basert søk)"
status: Åpen
impact: Høy (påvirker MemPalace på M1)
dokumentert: 2026-04-08
```

### 🟡 Medium

#### Next.js 15 Turbopack
```yaml
verktøy: Next.js
issue: "Turbopack ikke stabil for produksjon"
upstream_issue: "https://github.com/vercel/next.js/issues/xxxx"
workaround: "Bruk webpack for prod: npm run build"
status: Under utvikling
impact: Medium
```

### 🟢 Lav

#### Supabase RLS med Realtime
```yaml
verktøy: Supabase
issue: "RLS policies kan forsinke realtime subscriptions"
upstream_issue: "https://github.com/supabase/supabase/issues/xxxx"
workaround: "Bruk row_level_security off for realtime-only tabeller"
status: Dokumentert
impact: Lav
```

## Oppgraderings-Logg

### Next.js 14 → 15
```markdown
## 2026-03-15: Next.js 15 Oppgradering

### Versjoner
- Fra: 14.2.x
- Til: 15.1.x

### Breaking Changes
- [x] Async request APIs (fixed)
- [x] Turbopack dev mode (adopted)
- [x] React 19 compat (verified)

### Dokumentasjon
- Offisiell guide: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
- Vår erfaring: .knowledge/upgrades/nextjs-15.md

### Issues møtt
1. `cookies()` er nå async - fixed i middleware
2. Turbopack krasjet - bruker webpack for build

### Neste steg
- Vurder Turbopack for build når stabilt
```

## Versjons-Tracking

```json
{
  "generated": "2026-04-08",
  "stack": {
    "critical": {
      "nextjs": "15.1.x",
      "react": "19.0.x",
      "typescript": "5.9.x"
    },
    "backend": {
      "supabase": "latest",
      "postgres": "15.x"
    },
    "trading": {
      "ccxt": "4.x"
    },
    "ai": {
      "mempalace": "3.0.0",
      "anthropic": "latest"
    }
  },
  "planned_upgrades": [
    {
      "tool": "tailwindcss",
      "from": "3.x",
      "to": "4.x",
      "timeline": "2026-Q2",
      "risk": "Breaking changes i config"
    }
  ]
}
```

## Forum-Overvåkning

### Høyverdige Tråder

#### MemPalace
- [Issue #74: macOS ARM64 segfault](https://github.com/milla-jovovich/mempalace/issues/74) - Påvirker oss
- [Issue #100: ChromaDB version pinning](https://github.com/milla-jovovich/mempalace/issues/100) - Relevant

#### Supabase
- [Realtime RLS best practices](https://github.com/orgs/supabase/discussions/xxxx) - Brukt i prosjektet
- [Connection pooling](https://github.com/orgs/supabase/discussions/yyyy) - Vurder for skalering

#### Next.js
- [App Router migration guide](https://github.com/vercel/next.js/discussions/xxxx) - Fullført
- [Turbopack production readiness](https://github.com/vercel/next.js/discussions/yyyy) - Venter på

## Vedlikehold

### Ukentlig (Automatisk)
- [ ] Sjekk nye versjoner av kritisk stack
- [ ] Scan for nye issues i upstream
- [ ] Oppdater forum-lenker

### Månedlig (Manuelt)
- [ ] Review planned upgrades
- [ ] Dokumenter nye workarounds
- [ ] Oppdater versjons-fil

### Ved Oppgradering
- [ ] Logg i `upgrades/<verktøy>-<versjon>.md`
- [ ] Oppdater `versions/current.json`
- [ ] Test med swarm
- [ ] Dokumenter issues møtt

## Kommandoer

```bash
# Sjekk stack-status
npm run stack:status

# Sjekk for oppdateringer
npm run stack:check-updates

# Dokumenter ny workaround
npm run stack:log-workaround <tool> <issue>

# Vis kjente issues
npm run stack:known-issues
```

---

**Sist oppdatert:** 2026-04-08  
**Ansvarlig:** Knowledge Keeper Agent  
**Neste review:** 2026-04-15

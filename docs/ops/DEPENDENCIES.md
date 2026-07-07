# Klarpakke — Avhengigheter & Oppdateringer

> Sist oppdatert: 2026-07-07 av Hermes Lead Architect

---

## Nåværende status

| Pakke | Versjon | Siste | Notat |
|-------|---------|-------|-------|
| `@opennextjs/cloudflare` | 1.20.1 | 1.20.1 | ✅ Oppdatert |
| `wrangler` | 4.108.0 | 4.108.0 | ✅ Oppdatert |
| `@coinbase/cds-web` | 9.6.1 | 9.6.1 | ✅ Oppdatert |
| `@next/bundle-analyzer` | 16.2.10 | 16.2.10 | ✅ Oppdatert |
| `supabase` CLI | 2.109.1 | 2.109.1 | ✅ Oppdatert |
| `stripe` | 22.2.3 | Current | ✅ OK |
| `resend` | 6.12.2 | Current | ✅ OK |
| `@ai-sdk/openai` | 3.0.74 | 7.0.16 | ⚠️ Hold — breaking change |
| `@ai-sdk/perplexity` | 3.0.36 | — | ⚠️ Hold — følger ai-sdk |
| `@ai-sdk/react` | 3.0.211 | 7.0.16 | ⚠️ Hold — breaking change |
| `@eslint/js` | 9.39.4 | 10.0.1 | ⚠️ Hold — breaking config |

---

## AI SDK v3 → v7 migrering (venter)

Vercel AI SDK har hoppet 4 major versjoner. **Bør gjøres som egen PR/issue.**

**Nøkkel-endringer:**
- `useChat` / `useCompletion` API endret i v4
- Provider-konfigurasjon endret (`createOpenAI` → nytt format)
- Verktøy/assistenter flyttet til `@ai-sdk/...`
- Streaming API endret

**Dokumentasjon:**
- https://sdk.vercel.ai/docs (nyeste)
- https://github.com/vercel/ai/releases

---

## ESLint 9 → 10 migrering

ESLint 10 er ute. Flat config er nå eneste format.

**Dokumentasjon:**
- https://eslint.org/docs/latest/use/configure/migration-guide

---

## Node-versjon

- **Bruk:** 22.23.1 (Node 22 LTS)
- `.nvmrc`: Synkronisert → 22.23.1
- **CI/CD:** Bruk `node-version-file: .nvmrc` i workflows

---

## Supabase

- **CLI:** 2.109.1 ✅
- **Edge Functions:** 48 aktive funksjoner
- **Database:** PostgreSQL 15 med RLS
- **pg_cron:** 14 jobs aktive

---

## Cloudflare

- **Wrangler:** 4.108.0 ✅
- **OpenNext:** 1.20.1 ✅
- **Deploy:** Cloudflare Workers Builds + Fallback GitHub Action

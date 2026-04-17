# Klarpakke Sanity Agent — KIMI Specialization

> **Trigger:** Når brukeren spør om Sanity CMS, studio, GROQ-queries, schema-endringer, design tokens, landing page-innhold, eller webhooks i Klarpakke.

## 🎯 Mandat
Du er den dedikerte Sanity-eksperten for Klarpakke. Alle endringer i `src/sanity/`, `src/lib/sanity/`, `src/app/studio/`, `src/app/api/webhooks/sanity/`, eller `.env*` som påvirker Sanity skal gjennom deg.

## 🚨 Ufravikelige Regler

1. **ALLTID bruk `safeFetch()`** fra `@/lib/sanity/client` når du henter data i app-kode
2. **FORBUDT å hardkode** `projectId` eller `dataset` utenfor `src/sanity/env.ts` og `sanity.cli.ts`
3. **Studio skal ALDRI deployes med `npx sanity deploy`** — det er embedded i Next.js på `/studio`
4. **ALLTID legg til fallback-data** når du henter Sanity-innhold (se `safeFetch` pattern)
5. **Design tokens** skal ha `DEFAULT_TOKENS_CSS` fallback i `src/lib/sanity/tokens.ts`
6. **Webhooks** skal validere `sanity-webhook-signature` med `SANITY_WEBHOOK_SECRET`
7. **Never commit secrets** — bruk env-vars

## 🔧 Verktøy & Scripts

| Kommando | Hva den gjør |
|----------|--------------|
| `npm run dev` | Starter Next.js + embedded Sanity Studio på `localhost:3000/studio` |
| `npm run type-check` | Sjekker TypeScript for Sanity-filer |
| `npx sanity@latest schema extract` | Ekstraherer schema til JSON |
| `npx sanity@latest typegen generate` | Genererer TypeScript-typer fra schema |

## 📁 Kritisk Kontekst (ALLTID les før endring)

```
src/sanity.config.ts                  # Studio-konfig (basePath: /studio)
src/sanity/env.ts                     # Env-variabler for studio
src/sanity/schemaTypes/index.ts       # Schema registration
src/sanity/schemaTypes/page.ts        # Page schema
src/sanity/schemaTypes/faq.ts         # FAQ schema
src/sanity/schemaTypes/testimonial.ts # Testimonial schema
src/sanity/schemaTypes/strategy.ts    # Strategy schema
src/sanity/schemaTypes/trade-explanation.ts # Trade explanation schema
src/sanity/schemaTypes/design-tokens.ts     # Design tokens schema
src/sanity/schemaTypes/landing-content.ts   # Landing content schema
src/sanity/structure.ts               # Desk structure
src/lib/sanity/client.ts              # Next.js client + safeFetch helper
src/lib/sanity/queries.ts             # GROQ queries
src/lib/sanity/tokens.ts              # Server-side design tokens fetcher
src/lib/sanity/image.ts               # Sanity image URL builder
src/app/studio/[[...tool]]/page.tsx   # Studio route (auth-protected)
src/app/studio/[[...tool]]/Studio.tsx # Studio component
src/app/api/webhooks/sanity/route.ts  # Revalidate webhook
src/app/api/v1/design-tokens/route.ts # Design tokens API
sanity.cli.ts                         # CLI config (projectId: 63qn23si)
```

## 🧠 MemPalace

Før du gjør endringer, søk alltid:
- `mempalace_search(query="Sanity CMS")`
- `mempalace_search(query="design tokens")`
- `mempalace_search(query="GROQ")`

Etter endringer, dokumenter:
- `mempalace_add_drawer(content="<hva som ble endret>", wing="klarpakke", room="sanity_cms")`

## 🔄 Standard Arbeidsflyt

1. **Forstå behovet** → les MemPalace + relevante filer
2. **Sjekk eksisterende schema** → finn riktig type eller lag ny
3. **Implementer endring** → minimal endring, følg patterns
4. **Kjør `npm run type-check`** → verifiser
5. **Test lokalt** → `npm run dev`, gå til `/studio`
6. **Dokumenter i MemPalace**
7. **Gi bruker copy-paste config** hvis webhooks eller CORS må oppdateres

## 📝 Copy-Paste Config (alltid oppdatert)

**Sanity Manage** → APIs → CORS Origins
```
https://www.klarpakke.no
https://klarpakke.no
http://localhost:3000
```

**Sanity Manage** → Webhooks
```
URL: https://www.klarpakke.no/api/webhooks/sanity
Trigger: Create, Update, Delete
Projection: {_type, _id}
Secret: <SANITY_WEBHOOK_SECRET>
```

**Studio URL (embedded)**
```
Lokal:  http://localhost:3000/studio
Prod:   https://www.klarpakke.no/studio
```

## 🎨 Design Tokens Quick Reference

Hvis du endrer design tokens, oppdater ALLTID:
1. `src/sanity/schemaTypes/design-tokens.ts` (schema)
2. `src/lib/sanity/tokens.ts` (server CSS + fallback)
3. `src/app/api/v1/design-tokens/route.ts` (API fallback)
4. `src/styles/kp-tokens-sanity.css` (statisk fallback)

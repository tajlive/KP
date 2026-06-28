---
name: cloudflare
description: >
  Cloudflare-utvikling for Klarpakke: Workers, Wrangler, R2/D1/DO-bindings,
  OpenNext.js-cache, og deploy. Bruk når du skriver eller reviewer
  Cloudflare-konfigurasjon, edge-kode, wrangler.jsonc, bindings,
  ISR/cache-oppsett, eller deploy-script.

  Stack: Next.js 16 App Router, OpenNext.js på Cloudflare Workers,
  Wrangler v4, TypeScript 5.9, Supabase, Domeneshop.
license: Tilpasset fra Cloudflare skills (github.com/cloudflare/skills)
---

# Cloudflare for Klarpakke

Din kunnskap om Cloudflare-API-er, grenser og prising kan være utdatert. **Foretrekk å hente fersk informasjon fremfor å stole på trening.** Dette gjelder spesielt API-signaturer, binding-typer, compatibility dates/flags, og Wrangler-konfigurasjon.

## Hent nyeste informasjon først

| Kilde | Hvordan | Bruk til |
|-------|---------|----------|
| Cloudflare docs | `WebSearch` / `FetchURL` på `https://developers.cloudflare.com/` | Grenser, prising, API-referanse, compatibility dates/flags |
| Workers types | `npm pack @cloudflare/workers-types` eller sjekk `node_modules/@cloudflare/workers-types` | Type-signaturer, binding-shapes, handler-typer |
| Wrangler config schema | `node_modules/wrangler/config-schema.json` | Config-felt, binding-shapes, tillatte verdier |
| OpenNext.js Cloudflare | Søk på `@opennextjs/cloudflare` docs + GitHub | ISR, R2/D1/DO-cache, overrides |

Når en referanse og docs er i konflikt, **stol på docs**.

## Klarpakke-spesifikt oppsett

- **App-hosting:** Cloudflare Workers via OpenNext.js + Wrangler
- **Worker-navn:** `klarpakke`
- **Deploy:** `npm run cf:deploy` (manuelt) eller Cloudflare Workers Builds (auto fra `main`)
- **Domene:** Domeneshop → Cloudflare DNS/proxy → Cloudflare Workers
- **Database/Auth:** Supabase (ikke D1 for app-data)
- **Cache:** R2 incremental + D1 tag cache + DO queue er forberedt men aktiveres via `OPENNEXT_ENABLE_R2_CACHE=true`
- **Miljø:** Les alltid secrets fra env/Wrangler secrets — aldri hardkod

## Viktige regler

### Konfigurasjon

- **Bruk `wrangler.jsonc`** (ikke TOML). Nye funksjoner er JSON-only.
- **Sett `compatibility_date`** til en ny dato (innen 30 dager).
- **Aktiver `nodejs_compat`** — mange Next.js-avhengigheter trenger Node.js built-ins.
- **Kjør `wrangler types`** etter config-endringer for å regenerere `Env`.
- **Ikke skriv `Env`-interface for hånd** — det driftes bort fra wrangler-config.

### Request/response og arkitektur

- **Stream store/ubestemte payloads** — ikke `await response.text()` på ubegrenset data.
- **Bruk `ctx.waitUntil()`** for arbeid etter respons; ikke destrukturer `ctx`.
- **Foretrekk bindings fremfor REST API** fra innsiden av en Worker.
- **Bruk service bindings** for Worker-til-Worker-kall, ikke offentlig HTTP.
- **Ingen request-scoped state i modul-nivå-variabler** — det gir cross-request-lekkasjer.
- **Alle promises må awaites, returneres, voides, eller sendes til `waitUntil()`**.

### Sikkerhet

- **Bruk Web Crypto** (`crypto.randomUUID()`, `crypto.getRandomValues()`) — aldri `Math.random()` for sikkerhet.
- **Ingen hardkodede secrets** i kildekode, config eller commits.
- **Bruk `wrangler secret put`** interaktivt, eller `wrangler secret bulk` fra fil i CI.
- **Timing-safe sammenligning** av secrets med `crypto.subtle.timingSafeEqual`.

### Observability

- **Aktiver `observability`** i `wrangler.jsonc` med `head_sampling_rate`.
- **Bruk strukturert JSON-logging**.
- **Tail logs:** `wrangler tail` eller `wrangler tail klarpakke`.

## OpenNext.js cache-oppsett

Når `OPENNEXT_ENABLE_R2_CACHE=true`:

```ts
// open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

const enableR2Cache = process.env.OPENNEXT_ENABLE_R2_CACHE === "true";

export default defineCloudflareConfig(
  enableR2Cache
    ? {
        incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
        tagCache: d1NextTagCache,
        queue: doQueue,
      }
    : {}
);
```

Binding-navnene kommer fra `@opennextjs/cloudflare` — ikke endre dem med mindre docs sier noe annet.

Påkrevde `wrangler.jsonc`-bindings for full ISR-cache:

```jsonc
{
  "r2_buckets": [
    { "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "klarpakke-incremental-cache" }
  ],
  "d1_databases": [
    { "binding": "NEXT_TAG_CACHE_D1", "database_name": "klarpakke-tag-cache", "database_id": "<id>" }
  ],
  "services": [
    { "binding": "WORKER_SELF_REFERENCE", "service": "klarpakke" }
  ],
  "durable_objects": {
    "bindings": [
      { "name": "NEXT_CACHE_DO_QUEUE", "class_name": "DOQueueHandler" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["DOQueueHandler"] }
  ]
}
```

> `DOQueueHandler` eksporteres fra `.open-next/worker.js`. Du trenger ikke lage klassen selv, men bindingen og migrasjonen må være på plass.

## Kjappe kommandoer

| Oppgave | Kommando |
|---------|----------|
| Lokal dev | `npm run dev` |
| Bygg til Workers | `npm run cf:build` |
| Deploy manuelt | `npm run cf:deploy` |
| Dry-run | `wrangler deploy --dry-run` |
| Generer typer | `wrangler types` |
| Tail logs | `wrangler tail` |
| Sjekk oppstart | `wrangler check startup` |
| Sett secret | `wrangler secret put NAVN` |

## Vanlige feil

| Feil | Årsak | Løsning |
|------|-------|---------|
| `Binding undefined` | Navn i kode matcher ikke `wrangler.jsonc` | Sjekk at binding-navn er identiske |
| Typefeil på `env.X` | `wrangler types` ikke kjørt | Kjør `wrangler types` |
| `Illegal invocation` på `waitUntil` | `ctx` destrukturert | Bruk `ctx.waitUntil(...)` direkte |
| `connection terminated unexpectedly` i Worker | Bruker `pg` mot Supabase i Workers-runtime | Bruk `@supabase/supabase-js` (fetch-basert) |
| Deploy feiler etter config-endring | Manglende `compatibility_flags` eller gammel dato | Oppdater `compatibility_date` og `nodejs_compat` |
| ISR/revalidering virker ikke | Manglende DO queue eller D1 tag cache | Sjekk at både `queue` og `tagCache` er konfigurert |

## Hva du aldri skal gjøre

- Hardkode secrets i `wrangler.jsonc`, `.env*.local` som committes, eller kildekode.
- Bruke `pg` direkte i Cloudflare Workers — det fungerer ikke pålitelig i `workerd`.
- Bruke `@supabase/supabase-js` REST API fra Vercel Serverless (bruk Postgres pooler der).
- Stole på gammel `open-next.config.ts`-syntax med string-baserte overrides.
- Destrukturere `ctx` i handlers eller Durable Objects.

# Supabase REST API Timeout from Vercel Serverless

**Dato:** 2026-05-12  
**Alvorlighet:** 🔴 KRITISK (production health check down)  
**Påvirket:** `/api/health`, alle Vercel Serverless Functions som kaller Supabase REST API  
**Rotårsak:** Vercel↔Supabase PostgREST routing + IPv6 + cold starts

## Symptomer

- `/api/health` returnerer **504 FUNCTION_INVOCATION_TIMEOUT** fra Vercel
- `@supabase/supabase-js` query tar **2-7 sekunder**
- Direkte `fetch()` til Supabase REST API tar **10-20 sekunder**
- Andre API-ruter (som bruker samme client) responderer på **~0.4s** — fordi de caches eller treffer varm PostgREST-instans
- Problem vedvarer på tvers av deploys (11+ timer)

## Rotårsak

### 1. PostgREST cold starts
Supabase sin REST API (PostgREST) spinnes ned når den er inaktiv. Første request etter idle triggerer cold start som tar **5-20 sekunder**.

### 2. IPv6/nettverksruting
Vercel Serverless Functions (Node.js 18+) default til IPv6 for DNS-oppslag. Supabase sin `*.supabase.co` domene resolver til IPv6 for direkte tilkoblinger. Vercel↔Supabase IPv6-ruting har kjente problemer:

> "The Vercel Functions does not support IPv6 connections to other hosts." — Vercel Community  
> "Vercel edge function = 1-6s, Client side = 200ms, CF worker = ~80ms" — GitHub Discussion #5532

### 3. Service-role key throttling
Gjentatte health check-kall med service role key fra samme Vercel IP kan utløse rate limiting/throttling hos Supabase.

## Løsning

### Varig fix: Bruk Postgres Pooler (Supavisor) istedenfor REST API

Endre `/api/health` (og andre serverless health checks) til å bruke **`pg`** (node-postgres) med **`POSTGRES_URL`** som peker til Supavisor pooler:

```typescript
import { Client } from "pg";
import { setDefaultResultOrder } from "dns";

// Force IPv4 — Node.js 18+ default er IPv6
setDefaultResultOrder("ipv4first");

const client = new Client({ connectionString: process.env.POSTGRES_URL });
await client.connect();
const result = await client.query("SELECT 1");
await client.end();
```

**Hvorfor dette fungerer:**
- Pooleren (`aws-0-[region].pooler.supabase.com:6543`) bruker **IPv4**
- TCP/PostgreSQL wire-protokoll har **ingen cold starts**
- Latency: **<100ms** typisk
- Allerede konfigurert i prosjektet via `POSTGRES_URL`

### Hva du ALDRI skal gjøre fra Vercel Serverless

❌ Bruke `@supabase/supabase-js` med `*.supabase.co` REST API for health checks  
❌ Bruke `fetch()` direkte mot `https://[project].supabase.co/rest/v1/...` fra serverless  
❌ Bruke `db.[project].supabase.co:5432` direkte (IPv6, ingen pooler)

### Redis-caching av health resultater

For å redusere pooler-belastning, cache health-resultat i Redis/Vercel KV med 30s TTL:

```typescript
await redis.set("health:latest", JSON.stringify(health), { ex: 30 });
```

## Miljøvariabler

| Variabel | Verdi | Bruk |
|----------|-------|------|
| `POSTGRES_URL` | `postgres://...pooler.supabase.com:6543/...` | **Anbefalt** — Supavisor pooler, IPv4 |
| `DATABASE_URL` | `postgres://...pooler.supabase.com:6543/...` | Samme som over |
| `POSTGRES_URL_NON_POOLING` | `postgres://...pooler.supabase.com:5432/...` | Session mode — bruk kun for migrasjoner |
| `SUPABASE_URL` | `https://...supabase.co` | OK for browser/edge, **IKKE** for serverless health |

## Referanser

- [Supabase IPv4 Deprecation + Pooler Migration](https://github.com/orgs/supabase/discussions/17817)
- [GitHub Discussion #5532 — Vercel↔Supabase latency](https://github.com/orgs/supabase/discussions/5532)
- [Vercel Community — Database connection from Vercel to Supabase](https://community.vercel.com/t/database-connection-from-vercel-to-supabase/25034)
- [Vercel Blog — Serverless connection pooling](https://vercel.com/blog/the-real-serverless-compute-to-database-connection-problem-solved)

## Status

- [x] Identifisert rotårsak (PostgREST cold start + IPv6)
- [x] Implementert fix: `/api/health` bruker nå `pg` + Supavisor pooler
- [x] IPv4-first DNS aktivert
- [x] Redis-caching aktivert
- [x] Dokumentert i `.knowledge/errors/`

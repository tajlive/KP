# Failure

System: Next.js 16 API-ruter på Cloudflare Workers (edge-runtime)
Dato: 2026-08-09 → 2026-08-10

Symptom: ALLE `runtime:"edge"` API-ruter døde i prod (500). Fungerte i dev, krasjet i prod.

Rotårsak: `@supabase/supabase-js` krever `process.version` — finnes ikke i V8 isolates
(Cloudflare Workers) → krasjer ved import. `Buffer` mangler også i edge-runtime.

Fix: API-ruter med supabase-js = `runtime:"nodejs"`. `encrypt-api-keys.ts` gjort Buffer-fri.
max-aggressive/kill-switch/sentry-webhook gikk 500 → 401 etter edge→nodejs.

Permanent regel: Enhver API-rute som importerer supabase-js MÅ ha `runtime:"nodejs"` —
aldri edge.

Arvet av: alle prod-ruter; verifisert 2026-08-10.

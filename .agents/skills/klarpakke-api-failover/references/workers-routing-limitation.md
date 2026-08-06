# Workers routing limitation (2026-07-28)

## Problem

When deploying with OpenNext on Cloudflare Workers, sub-paths under existing
API routes fail with 522 Connection Timed Out. The Worker never even starts
processing the request — Cloudflare times out before connecting.

## Example

| Path | Result |
|------|--------|
| `/api/health` | 200 OK |
| `/api/health/metrics` | 522 timeout |
| `/api/health/sonar` | 522 timeout |
| `/api/health/oauth` | 522 timeout |
| `/api/metrics` | ✅ (works if created as top-level route) |

## Root Cause

OpenNext Workers generates route handlers using exact path matching.
Wildcard/sub-path routing is not supported for API routes.
The `/api/health` handler does NOT match `/api/health/*`.

## Workaround

Always put API routes at the top level:
- ❌ `/api/health/metrics/route.ts`
- ✅ `/api/metrics/route.ts`

## Code evidence

Built route handler at `.open-next/server-functions/default/.next/server/app/api/health/metrics/route.js`
exists (540 bytes), correctly references Supabase chunks, but is never invoked
by the Worker routing layer.

## Attempted fixes (all failed)

1. `runtime = "nodejs"` — no effect
2. `runtime = "edge"` — no effect
3. Supabase vs no Supabase — irrelevant; route never reached
4. Inline everything (no imports) — still 522

The only fix that works: move the file to a top-level route.

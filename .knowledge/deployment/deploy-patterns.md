# Deployment Knowledge

## Cloudflare Workers Deploy Flow
1. `git push origin main` → GitHub Actions (`.github/workflows/deploy.yml`) → Cloudflare Workers deploy (~2-5 min)
2. GitHub Actions runs `npm run build` followed by `npm run cf:build`
3. Wrangler deploys the OpenNext.js Worker bundle: `npx wrangler deploy --minify --var APP_VERSION:${GITHUB_SHA}`
4. Cloudflare DNS points `klarpakke.no` / `www.klarpakke.no` to the Cloudflare Workers route

## Pre-commit Gates (i rekkefølge)
1. **Secrets scan** — sjekker at ingen API-nøkler er staged
2. **AST verify** (ts-morph) — kun hvis kritiske paths endret (src/lib/ai/, src/lib/supabase/)
3. **TypeScript check** (`tsc --noEmit`)
4. **Supabase Column Guard** — sjekker at DB-kolonnereferanser er gyldige

## Viktige Deploys
| Dato | Commit | Hva |
|------|--------|-----|
| 2026-05-12 | — | Migrated from Vercel to Fly.io |
| 2026-06-21 | — | Migrated from Fly.io/Cloudflare Pages to Cloudflare Workers (OpenNext.js + Wrangler) |

## Rollback
- `npx wrangler rollback --name <worker-name>` — rollback til forrige Workers deployment
- `scripts/rollback-deployment.sh` — legacy Vercel/Fly.io rollback (arkivert)

## DNS (Cloudflare)
| Record | Type | Target | Proxy |
|--------|------|--------|-------|
| `www.klarpakke.no` | CNAME | `<Cloudflare Workers target>` | ✅ |
| `klarpakke.no` | CNAME | `<Cloudflare Workers target>` | ✅ |

## Cron
- **Source of truth:** Supabase (IKKE Vercel cron)
- Se `docs/CRON-SOURCE-OF-TRUTH.md`

# Deployment Knowledge

## Fly.io Deploy Flow
1. `git push origin main` → GitHub Actions → Fly.io deploy (~3-5 min)
2. Fly.io bygger Docker image remote (ikke lokalt)
3. Cloudflare DNS peker til `klarpakke.fly.dev`

## Pre-commit Gates (i rekkefølge)
1. **Secrets scan** — sjekker at ingen API-nøkler er staged
2. **AST verify** (ts-morph) — kun hvis kritiske paths endret (src/lib/ai/, src/lib/supabase/)
3. **TypeScript check** (`tsc --noEmit`)
4. **Supabase Column Guard** — sjekker at DB-kolonnereferanser er gyldige

## Viktige Deploys
| Dato | Commit | Hva |
|------|--------|-----|
| 2026-05-12 | — | Migrated from Vercel to Fly.io |

## Rollback
- `flyctl deploy --image <previous-image>` — rollback til forrige image
- `scripts/rollback-deployment.sh` — legacy Vercel rollback (arkivert)

## DNS (Cloudflare)
| Record | Type | Target | Proxy |
|--------|------|--------|-------|
| `www.klarpakke.no` | CNAME | `klarpakke.fly.dev` | ✅ |
| `klarpakke.no` | CNAME | `klarpakke.fly.dev` | ✅ |

## Cron
- **Source of truth:** Supabase (IKKE Vercel cron)
- Se `docs/CRON-SOURCE-OF-TRUTH.md`

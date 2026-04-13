# Deployment Knowledge

## Vercel Deploy Flow
1. `git push origin main` → Vercel auto-deploy (~2-3 min)
2. Pre-commit hooks: Secrets → AST verify → tsc → Supabase Column Guard
3. Vercel kjører `npm run build` → Next.js 15 produksjonsbygg

## Pre-commit Gates (i rekkefølge)
1. **Secrets scan** — sjekker at ingen API-nøkler er staged
2. **AST verify** (ts-morph) — kun hvis kritiske paths endret (src/lib/ai/, src/lib/supabase/)
3. **TypeScript check** (`tsc --noEmit`)
4. **Supabase Column Guard** — sjekker at DB-kolonnereferanser er gyldige

## Viktige Deploys
| Dato | Commit | Hva |
|------|--------|-----|
| 2026-04-13 | `7aea451` | Sonar caching + TopAIInsightsRow |
| 2026-04-13 | `89b474a` | paperBot i18n + unique constraint fix |
| 2026-04-13 | `3bb4034` | Auth SSR-migrering + Frankenstein-UI fix |

## Rollback
- `scripts/rollback-deployment.sh` — rollback siste Vercel deploy
- `scripts/rollback.sh` — full rollback-prosedyre

## Cron
- **Source of truth:** Supabase (IKKE Vercel cron)
- Se `docs/CRON-SOURCE-OF-TRUTH.md`

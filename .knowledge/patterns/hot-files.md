# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 58 | next.config.mjs |
| 42 | src/app/api/cron/tick/route.ts |
| 37 | src/middleware.ts |
| 27 | src/features/dashboard/DashboardPro.tsx |
| 27 | src/app/[locale]/page.tsx |
| 27 | src/app/[locale]/layout.tsx |
| 21 | src/app/[locale]/(user)/dashboard/portfolio/page.tsx |
| 19 | src/lib/trading/core/execute-trade-safe.ts |
| 18 | src/app/[locale]/auth/callback/route.ts |
| 16 | src/types/database.types.ts |
| 16 | src/features/dashboard/DashboardContent.tsx |
| 15 | src/features/dashboard/PortfolioDashboard.tsx |
| 15 | src/app/[locale]/(user)/dashboard/page.tsx |
| 14 | src/lib/supabase/client.ts |
| 13 | src/middleware/auth.ts |
| 13 | src/lib/trading/risk/risk-state-store.ts |
| 13 | src/lib/supabase/paper-trading.ts |
| 13 | src/app/api/health/route.ts |
| 13 | src/app/[locale]/(auth)/callback/page.tsx |
| 12 | src/middleware/i18n.ts |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

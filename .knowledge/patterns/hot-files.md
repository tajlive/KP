# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 58 | next.config.mjs |
| 46 | src/app/api/cron/tick/route.ts |
| 36 | src/middleware.ts |
| 29 | src/features/dashboard/DashboardPro.tsx |
| 28 | src/app/[locale]/layout.tsx |
| 26 | src/app/[locale]/page.tsx |
| 25 | src/app/[locale]/(user)/dashboard/portfolio/page.tsx |
| 20 | src/lib/trading/core/execute-trade-safe.ts |
| 18 | src/app/[locale]/auth/callback/route.ts |
| 17 | src/types/database.types.ts |
| 17 | src/features/dashboard/DashboardContent.tsx |
| 15 | src/features/dashboard/PortfolioDashboard.tsx |
| 15 | src/app/[locale]/(user)/dashboard/page.tsx |
| 14 | src/middleware/auth.ts |
| 14 | src/lib/supabase/paper-trading.ts |
| 14 | src/lib/supabase/client.ts |
| 13 | src/lib/trading/risk/risk-state-store.ts |
| 13 | src/app/[locale]/(auth)/login/page.tsx |
| 13 | src/app/[locale]/(auth)/callback/page.tsx |
| 12 | src/middleware/i18n.ts |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

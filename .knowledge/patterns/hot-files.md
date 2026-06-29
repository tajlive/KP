# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 62 | next.config.mjs |
| 48 | src/app/api/cron/tick/route.ts |
| 34 | src/middleware.ts |
| 33 | src/features/dashboard/DashboardPro.tsx |
| 32 | src/app/[locale]/layout.tsx |
| 29 | src/app/[locale]/(user)/dashboard/portfolio/page.tsx |
| 28 | src/app/[locale]/page.tsx |
| 20 | src/lib/trading/core/execute-trade-safe.ts |
| 19 | src/types/database.types.ts |
| 19 | src/features/dashboard/DashboardContent.tsx |
| 18 | src/app/[locale]/auth/callback/route.ts |
| 16 | src/app/[locale]/(user)/dashboard/page.tsx |
| 15 | src/middleware/i18n.ts |
| 15 | src/middleware/auth.ts |
| 15 | src/features/landing/SanityHeroSection.tsx |
| 15 | src/features/dashboard/PortfolioDashboard.tsx |
| 14 | src/lib/trading/core/execute-trade.ts |
| 14 | src/lib/supabase/paper-trading.ts |
| 14 | src/lib/supabase/client.ts |
| 14 | src/features/trading/UnifiedTradingDashboard.tsx |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

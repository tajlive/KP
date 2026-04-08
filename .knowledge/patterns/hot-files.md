# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 56 | next.config.mjs |
| 52 | src/middleware.ts |
| 38 | src/app/[locale]/layout.tsx |
| 37 | src/app/[locale]/dashboard/page.tsx |
| 31 | src/app/[locale]/page.tsx |
| 30 | src/components/trading/UnifiedTradingDashboard.tsx |
| 26 | src/components/dashboard/DashboardSidebar.tsx |
| 25 | src/app/[locale]/paper-trading/page.tsx |
| 23 | src/types/supabase-generated.ts |
| 21 | src/app/api/webhooks/stripe/route.ts |
| 19 | src/components/trading/BotStatusDashboard.tsx |
| 19 | src/app/[locale]/(auth)/innlogging/InnloggingClient.tsx |
| 18 | src/lib/supabase/server.ts |
| 18 | src/components/landing/HeroSection.tsx |
| 18 | src/app/[locale]/dashboard/auto-trade/ClientAutoTradeDashboard.tsx |
| 17 | src/lib/auto-trading/binance-executor.ts |
| 17 | src/components/copy-trading/CreatorProfileClient.tsx |
| 17 | src/app/api/tax-report/route.ts |
| 17 | playwright.config.ts |
| 16 | src/lib/supabase/client.ts |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

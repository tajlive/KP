# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 76 | next.config.mjs |
| 70 | src/middleware.ts |
| 45 | src/app/[locale]/layout.tsx |
| 37 | src/app/[locale]/dashboard/page.tsx |
| 32 | src/app/[locale]/page.tsx |
| 30 | src/components/trading/UnifiedTradingDashboard.tsx |
| 27 | src/app/[locale]/paper-trading/page.tsx |
| 27 | src/app/[locale]/auth/callback/route.ts |
| 26 | src/components/dashboard/DashboardSidebar.tsx |
| 24 | src/types/supabase-generated.ts |
| 24 | src/app/api/webhooks/stripe/route.ts |
| 20 | src/lib/auto-trading/binance-executor.ts |
| 19 | src/lib/supabase/server.ts |
| 19 | src/components/trading/BotStatusDashboard.tsx |
| 19 | src/app/[locale]/(auth)/innlogging/InnloggingClient.tsx |
| 18 | src/components/landing/HeroSection.tsx |
| 18 | src/app/api/cron/tick/route.ts |
| 18 | src/app/[locale]/dashboard/auto-trade/ClientAutoTradeDashboard.tsx |
| 18 | playwright.config.ts |
| 17 | src/lib/trading-api.ts |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

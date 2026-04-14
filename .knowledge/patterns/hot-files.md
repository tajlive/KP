# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 75 | next.config.mjs |
| 68 | src/middleware.ts |
| 43 | src/app/[locale]/layout.tsx |
| 37 | src/app/[locale]/dashboard/page.tsx |
| 31 | src/app/[locale]/page.tsx |
| 30 | src/components/trading/UnifiedTradingDashboard.tsx |
| 27 | src/app/[locale]/paper-trading/page.tsx |
| 27 | src/app/[locale]/auth/callback/route.ts |
| 26 | src/components/dashboard/DashboardSidebar.tsx |
| 24 | src/app/api/webhooks/stripe/route.ts |
| 23 | src/types/supabase-generated.ts |
| 20 | src/lib/auto-trading/binance-executor.ts |
| 19 | src/lib/supabase/server.ts |
| 19 | src/components/trading/BotStatusDashboard.tsx |
| 19 | src/app/[locale]/(auth)/innlogging/InnloggingClient.tsx |
| 18 | src/components/landing/HeroSection.tsx |
| 18 | src/app/[locale]/dashboard/auto-trade/ClientAutoTradeDashboard.tsx |
| 18 | playwright.config.ts |
| 17 | src/lib/supabase/client.ts |
| 17 | src/components/copy-trading/CreatorProfileClient.tsx |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

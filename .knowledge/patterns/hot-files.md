# Hot Files - Mest endrede siste 3 måneder
# Disse filene endres ofte = viktige for prosjektet

| Endringer | Fil |
|-----------|-----|
| 82 | next.config.mjs |
| 79 | src/middleware.ts |
| 49 | src/app/[locale]/layout.tsx |
| 37 | src/app/[locale]/dashboard/page.tsx |
| 33 | src/app/[locale]/page.tsx |
| 30 | src/components/trading/UnifiedTradingDashboard.tsx |
| 27 | src/app/api/webhooks/stripe/route.ts |
| 27 | src/app/api/cron/tick/route.ts |
| 27 | src/app/[locale]/paper-trading/page.tsx |
| 27 | src/app/[locale]/auth/callback/route.ts |
| 26 | src/types/supabase-generated.ts |
| 26 | src/lib/supabase/client.ts |
| 26 | src/components/dashboard/DashboardSidebar.tsx |
| 22 | src/lib/supabase/server.ts |
| 21 | src/lib/supabase/paper-trading.ts |
| 20 | src/lib/auto-trading/binance-executor.ts |
| 20 | src/features/dashboard/DashboardPro.tsx |
| 19 | src/lib/trading-api.ts |
| 19 | src/components/trading/BotStatusDashboard.tsx |
| 19 | src/app/[locale]/(auth)/innlogging/InnloggingClient.tsx |

## Implikasjoner
- Disse filene er "smell-punkter" i arkitekturen
- Vurder å refaktorere høy-endrings-filer
- God kandidater for tester (mye endring = høy risiko)

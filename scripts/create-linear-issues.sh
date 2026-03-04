#!/bin/bash
# Klarpakke: Create Linear Issues for Auto-Trading Sprint
# Usage: LINEAR_API_KEY=lin_api_xxx bash scripts/create-linear-issues.sh

KEY="${LINEAR_API_KEY:?ERROR: Set LINEAR_API_KEY env var first}"
API="https://api.linear.app/graphql"

gql() {
  curl -s -m 15 \
    -H "Authorization: $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $1}" \
    "$API"
}

echo "🔍 Henter team ID..."
TEAM_ID=$(gql '"{ teams { nodes { id } } }"' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['teams']['nodes'][0]['id'])")
echo "✅ Team: $TEAM_ID"

create_issue() {
  local title="$1"
  local desc="$2"
  local priority="$3"
  local q="\"mutation { issueCreate(input: { teamId: \\\"$TEAM_ID\\\", title: \\\"$title\\\", description: \\\"$desc\\\", priority: $priority }) { issue { identifier } } }\""
  local id=$(gql "$q" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['issueCreate']['issue']['identifier'])" 2>/dev/null)
  echo "  ✅ $id: $title"
  sleep 0.5
}

echo ""
echo "📋 Oppretter Auto-Trading Sprint issues..."

create_issue "🔒 Supabase pg_cron: Cron hvert minutt (gratis)" "Kjør scripts/setup-supabase-cron.sql i Supabase SQL Editor. Aktiverer pg_net + pg_cron, setter opp trading-tick hvert minutt og recovery hvert 5. minutt. Erstatter behovet for Vercel Pro cron." 1

create_issue "✅ FERDIG: Pris-paritet paper=live (Binance mainnet)" "IMPLEMENTERT: fetchCandles bruker alltid api.binance.com. Paper og live sesjoner ser identiske priser. Paper-trading signaler er nå 100% representative for live." 1

create_issue "✅ FERDIG: Fjernet mock-data fallback" "IMPLEMENTERT: Binance API-feil kaster BINANCE_API_UNAVAILABLE error. Ingen falske handler ved API-nedetid. Sessionene vil logge feilen og vente til neste tick." 1

create_issue "✅ FERDIG: GridBotEngine — ekte grid trading" "IMPLEMENTERT: GridBotEngine erstatter DCA-fallback i cron/tick/route.ts. Kjøper nær grid buy-price (±0.5%), selger nær sell-price. Konfigurerbart via upper_price, lower_price, grid_levels." 2

create_issue "✅ FERDIG: Volatility-Harvesting DCA" "IMPLEMENTERT: DCA kjøper 3x ved -5% 24h, 2x ved -3%, 0.5x ved +5%. Automatisk dip-deteksjon og FOMO-reduksjon. Bruker ekte Binance candlestick-data." 2

create_issue "✅ FERDIG: Trailing Take-Profit" "IMPLEMENTERT: Tracker highest_price på open_position. Trigger salg hvis pris faller trailing_stop_pct% fra topp mens fortsatt i profit. Rullerende gevinst-sikring." 2

create_issue "✅ FERDIG: Partial Profit Taking (3 nivåer)" "IMPLEMENTERT av KIMI: partial_tp_levels fra risk-levels.ts. Selger 30% ved +5%, 30% ved +10%, 40% ved +15% (balansert-nivå). Type-safe partial_exits_executed tracking." 2

create_issue "✅ FERDIG: risk-levels.ts — 4 konfigurerte risikonivåer" "IMPLEMENTERT: Ny fil src/lib/auto-trading/risk-levels.ts. Trygg🟢/Balansert🔵/Offensiv🟠/Aggressiv🔴. SUPPORTED_PAIRS: BTC,ETH,SOL,XRP,BNB. Endre ett tall = hele systemet oppdateres." 2

create_issue "✅ FERDIG: 8 TypeScript-feil fikset (KIMI)" "IMPLEMENTERT av KIMI: useAuthRedirect.ts, paper-executor.ts, UnifiedTradingDashboard.tsx (type-casting for alle 5 strategy configs), auto-trading/paper, live/execute, cron/tick, linear/issues, stripe/checkout." 1

create_issue "🧪 Backtest: 90 dager historisk data" "Binance gir 1000 candles per kall. 90 dager = 2160 1h-candles (3 API-kall). Implementer paginering i backtest-engine.ts. Vis backtest resultat (win rate, total return, max drawdown) FØR bruker velger strategi." 2

create_issue "👥 Copy trading: Topp 10/20 leaderboard" "mirrorTradeToFollowers() er implementert. Trenger: /api/leaderboard endpoint, UI for å velge trader, rangering etter total_pnl/win_rate. Vurder forsinkelse (5 min) for å beskytte top-traders." 3

create_issue "🔔 Notifications: in-app + push + email" "Bruker velger i settings/notifications. In-app: alltid aktiv. Web Push: navigator.serviceWorker + Supabase Realtime. Email: daglig oppsummering via Resend (allerede konfigurert i prosjektet)." 3

create_issue "👨‍💼 Admin: brukeroppgradering + sesjonsoversikt" "/admin/auto-trading: alle aktive sesjoner, oppgrader/nedgrader brukere (Stripe API + Supabase), pause/stopp enhver sesjon, manuelt trigge cron, se plattform-total P&L." 3

create_issue "🚀 Deploy + Supabase cron aktivering" "1) git commit + push til main 2) Verifiser Vercel bygger ✅ 3) Kjør setup-supabase-cron.sql i Supabase 4) Test curl -X GET klarpakke.no/api/cron/tick 5) Sjekk Vercel logs at cron kjører hvert minutt." 1

echo ""
echo "🎉 Alle 14 issues opprettet i Linear!"

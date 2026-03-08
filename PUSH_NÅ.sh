#!/usr/bin/env bash
# ═══════════════════════════════════════════
#  KLARPAKKE — PUSH + DEPLOY
#  Kjør: bash ~/klarpakke/PUSH_NÅ.sh
# ═══════════════════════════════════════════
set -e
cd ~/klarpakke

echo "📦 Legger til alle endringer..."
git add -A

echo ""
echo "📋 Endringer som commites:"
git diff --cached --name-only

echo ""
git commit -m "fix: referral-system, Binance RLS, redirect-loop, backtest

CRITICAL FIXES:
- referral_tracking: INSERT+UPDATE RLS policies (POST /api/referral var 500)
- user_binance_keys: RLS aktivert (var helt åpen for alle brukere!)
- binance_connections: RLS aktivert
- auth/callback: leser kp_ref-cookie, kobler referred_user til referral
- GoldenTicket URL: /{locale}/innlogging?ref= (var /login?ref= → 404)
- login/page.tsx: videresender ?ref= param
- InnloggingClient: lagrer ?ref i cookie (SameSite=Lax, overlever OAuth)
- SignUpCredentials: støtter referralCode-felt
- DB trigger: on_auth_user_referral (+10 KLT bonus ved referral signup)
- DB funksjon: complete_referral_reward (+50 KLT til referrer)

BACKTEST:
- BacktestDemoWidget: reelle CoinGecko-priser (BTC/ETH/SOL/BNB)
- HODL/DCA/Grid-strategier med ekte simulering

OTHER:
- bot-store: unified_trading_sessions
- copy-store: copy_trade_queue
- SW: self-unregister
- src/app/en: fjernet (routing-konflikt → /en/en loop)" || echo "Ingenting nytt å committe"

echo ""
echo "🚀 Pusher til GitHub..."
git push origin main

echo ""
echo "✅ PUSH FERDIG!"
echo "   Vercel auto-deployer innen 2 min"
echo "   Sjekk: https://vercel.com/klarpakke/klarpakke"
echo ""
echo "   Referral-link format:"
echo "   https://klarpakke.no/no/innlogging?ref=GOLD-XXXX-XXXX"

#!/bin/bash
# Dogfood QA — sjekk alle innloggede sider for feil
# Kjører etter at bruker er logget inn

PAGES=(
  "/no/dashboard"
  "/no/dashboard/portfolio"
  "/no/trade"
  "/no/dashboard/historikk"
  "/no/dashboard/resultater"
  "/no/dashboard/analysis"
  "/no/dashboard/settings"
  "/no/dashboard/referral"
  "/no/leaderboard"
  "/no/admin"
  "/no/admin/users"
)

for page in "${PAGES[@]}"; do
  echo "=== $page ==="
  browse open --remote "https://www.klarpakke.no$page" 2>&1 | grep -E '"url"|"title"' || echo "NAVIGATION FAILED"
  sleep 2
  
  # Sjekk for feil
  browse eval "(() => {
    const text = document.body.innerText;
    const i18n = text.match(/\b(dashboard|trading|common|portfolio|admin|auth|settings|nav)\.[a-zA-Z]+\.[a-zA-Z]+\b/g) || [];
    const errors = ['Noe gikk galt','Something went wrong','Error','Feil','undefined','NaN'].filter(p => text.includes(p));
    const empty = ['Ingen data','No data','Tom','Empty'].filter(p => text.includes(p));
    const buttons = document.querySelectorAll('button:not([disabled])').length;
    const disabledButtons = document.querySelectorAll('button[disabled]').length;
    return JSON.stringify({i18n:i18n.slice(0,3), errors, empty, buttons, disabledButtons});
  })()" 2>&1 | tail -3
  
  echo ""
done

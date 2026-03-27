#!/bin/bash
set -e
cd /Users/taj/klarpakke

echo "=== 1. Kjører fix ==="
python3 scripts/fix-market-regime.py

echo ""
echo "=== 2. TypeScript-sjekk ==="
npx tsc --noEmit
echo "tsc: OK"

echo ""
echo "=== 3. Git commit og push ==="
git add src/lib/auto-trading/market-regime.ts
git commit -m "fix(types): SupabaseLike -> flat UnTypedSupabaseClient interface

market_data-tabellen er ikke i supabase-generated.ts.
ReturnType<...[\"from\"]> kollapser til never for ukjente tabeller.
Løsning: flat MarketDataBuilder + UnTypedSupabaseClient interface
uten Database-generics, ingen any, ingen migrasjoner."
git push origin main
echo "=== DONE — Vercel bygger nå ==="

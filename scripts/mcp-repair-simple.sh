#!/bin/bash
# Reparer unike migrasjoner
cd /Users/taj/klarpakke

echo "🔧 Reparerer migrasjoner..."

# Unike migrasjoner som må repareres
npx supabase migration repair 20250213 --status reverted
npx supabase migration repair 20240214 --status applied
npx supabase migration repair 20250214 --status applied  
npx supabase migration repair 20260213 --status applied
npx supabase migration repair 20260215000000 --status applied
npx supabase migration repair 20260215000005 --status applied

echo ""
echo "🚀 Pusher..."
npx supabase db push

echo "✅ Ferdig!"

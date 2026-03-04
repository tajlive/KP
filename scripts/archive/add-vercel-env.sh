#!/bin/bash
# Legg til Supabase Service Role Key i Vercel

echo "=========================================="
echo "LEGG TIL SUPABASE SERVICE ROLE KEY"
echo "=========================================="
echo ""
echo "1. Gå til https://supabase.com/dashboard"
echo "2. Project Settings → API"
echo "3. Kopier 'service_role' key"
echo ""
echo "Lim inn key-en her og trykk Enter:"
read -s SERVICE_KEY

echo ""
echo "Legger til i Vercel..."

vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SERVICE_KEY"

echo ""
echo "✅ Ferdig! Nå må du re-deploye:"
echo "   vercel --prod"

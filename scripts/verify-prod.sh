#!/bin/bash
# Verifiser produksjon etter rotasjon

echo "🔍 Verifiserer produksjon..."
echo ""

# Health check
echo "1. Health endpoint:"
curl -s https://www.klarpakke.no/api/health | jq . || curl -s https://www.klarpakke.no/api/health
echo ""

# Sjekk hovedsiden
echo "2. Hovedside status:"
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/
echo " (skal være 200)"
echo ""

# Sjekk dashboard (forventer 302 redirect til login)
echo "3. Dashboard auth protection:"
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/no/dashboard
echo " (skal være 302/307 - redirect til login)"
echo ""

echo "✅ Verifisering fullført!"
echo ""
echo "Hvis du får 200 på alle, er rotasjonen vellykket."
echo "Hvis du får 500/502, sjekk Vercel-logs: vercel logs --prod"

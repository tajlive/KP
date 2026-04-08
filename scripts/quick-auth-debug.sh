#!/bin/bash
# Quick Auth Debug - sjekker headers og cookies

echo "🔐 Quick Auth Debug"
echo "=================="
echo ""

# Sjekk Vercel logs
if command -v vercel &> /dev/null; then
    echo "📊 Henter Vercel logs (siste 5 min)..."
    vercel logs klarpakke --since=5m 2>/dev/null | grep -E "(auth|session|cookie)" | head -20 || echo "Ingen auth-relaterte logs funnet"
fi

echo ""
echo "🌐 Sjekker auth callback headers..."
curl -sI "https://www.klarpakke.no/no/auth/callback" 2>/dev/null | grep -E "(Set-Cookie|Location|cache)" || echo "curl ikke tilgjengelig eller feil"

echo ""
echo "🍪 Anbefaling:"
echo "1. Bruk Chrome DevTools Network tab"
echo "2. Se etter:"
echo "   - Set-Cookie headers fra /auth/callback"
echo "   - Domain på cookies (.klarpakke.no vs www.klarpakke.no)"
echo "   - SameSite og Secure attributter"
echo "3. Sjekk localStorage for 'sb-*' keys"

echo ""
echo "💡 For automatisk testing:"
echo "   npm run debug:auth (kjører Playwright script)"

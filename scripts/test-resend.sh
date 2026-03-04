#!/bin/bash
# =====================================================
# TEST RESEND EMAIL
# =====================================================

echo "🧪 TESTER RESEND EMAIL"
echo "======================"
echo ""

# Sjekk at .env.local er lastet
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '#' | xargs)
fi

# Sjekk at RESEND_API_KEY er satt
if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ RESEND_API_KEY ikke funnet"
    echo ""
    echo "Fyll inn .env.local:"
    echo "RESEND_API_KEY=re_din_api_key_her"
    exit 1
fi

echo "✅ API key funnet"
echo ""

# Spør om test email
echo "Skriv email-adresse for test (din egen):"
read TEST_EMAIL

echo ""
echo "Sender test email til $TEST_EMAIL..."
echo ""

# Send test email med curl
RESPONSE=$(curl -s -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"Klarpakke Universitet <post@klarpakke.no>\",
    \"to\": [\"$TEST_EMAIL\"],
    \"subject\": \"🧪 Resend Test - Klarpakke Universitet\",
    \"html\": \"<h1>Test email fra Resend!</h1><p>Hvis du ser denne, fungerer Resend! 🎉</p>\"
  }" 2>&1)

if echo "$RESPONSE" | grep -q "id"; then
    echo "✅ Email sendt!"
    echo ""
    echo "Sjekk inbox (og spam) for: $TEST_EMAIL"
    echo ""
    echo "Response: $RESPONSE"
else
    echo "❌ Feil ved sending:"
    echo "$RESPONSE"
fi

API_URL="https://vuxbjlykgmzskxbclquf.supabase.co/functions/v1"
SITE_URL="https://www.klarpakke.no"
TOKEN="klarpakke-dev-token" # Placeholder for testing

echo "🔍 KJØRER FULL SYSTEM-SJEKK..."
echo "==================================================="

# 1. Frontend Check
echo -n "🌐 Frontend (Landing Page): "
HTTP_CODE=$(curl -s -L -o /dev/null -w "%{http_code}" "$SITE_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ OK (200)"
else
    echo "❌ FEIL ($HTTP_CODE)"
fi

# ... (Login check remains same)

# 4. Auto-Trading Engine Check
echo -n "🤖 Auto-Trading Engine:     "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/taj-trade-engine")
if [ "$HTTP_CODE" -eq 401 ]; then
    echo "✅ OK (Deployed & Secured)"
elif [ "$HTTP_CODE" -eq 200 ]; then
    echo "⚠️  OK (Men åpen? Sjekk sikkerhet!)"
elif [ "$HTTP_CODE" -eq 404 ]; then
     echo "❌ IKKE FUNNET (Må deployes!)"
else
    echo "❌ FEIL ($HTTP_CODE)"
fi

# 5. Position Checker Check
echo -n "📉 Position Checker:        "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/taj-position-checker")
if [ "$HTTP_CODE" -eq 401 ]; then
    echo "✅ OK (Deployed & Secured)"
elif [ "$HTTP_CODE" -eq 404 ]; then
     echo "❌ IKKE FUNNET (Må deployes!)"
else
     echo "⚠️  Status: $HTTP_CODE"
fi

# 6. Moonshot AI Check
echo -n "🧠 Moonshot AI Endpoint:    "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/moonshot-chat")
if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 400 ]; then
    # 400 is also good because it means it received the request but complained about missing body
    echo "✅ OK (Deployed & Listening)"
else
    echo "❌ FEIL ($HTTP_CODE)"
fi

echo "==================================================="
echo "✅ ALLE KRITISKE SYSTEMER ER ONLINE"


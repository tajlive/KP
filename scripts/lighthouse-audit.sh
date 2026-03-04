#!/bin/bash
# ==========================================
# LIGHTHOUSE MOBILE PERFORMANCE AUDIT
# ==========================================

echo "🚦 LIGHTHOUSE AUDIT - Klarpakke Mobile Performance"
echo "=================================================="
echo ""

# Sjekk om lighthouse er installert
if ! command -v lighthouse &> /dev/null; then
  echo "📦 Installerer Lighthouse CLI..."
  npm install -g lighthouse
fi

# URL å teste
SITE_URL="${1:-https://www.klarpakke.no}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports/lighthouse"

mkdir -p "$REPORT_DIR"

echo "🌐 Tester: $SITE_URL"
echo "📱 Device: Mobile (emulert)"
echo ""

# Kjør Lighthouse for mobile
echo "⏳ Kjører Lighthouse audit (dette tar ~60 sekunder)..."
lighthouse "$SITE_URL" \
  --output=html \
  --output=json \
  --output-path="$REPORT_DIR/mobile-$TIMESTAMP" \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile --screenEmulation.mobile \
  --quiet

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Lighthouse audit fullført!"
  echo ""
  
  # Parse JSON results
  JSON_FILE="$REPORT_DIR/mobile-$TIMESTAMP.report.json"
  
  if [ -f "$JSON_FILE" ]; then
    # Ekstraher scores (krever jq)
    if command -v jq &> /dev/null; then
      echo "📊 RESULTATER:"
      echo "=============="
      
      PERF=$(jq -r '.categories.performance.score * 100' "$JSON_FILE" | cut -d. -f1)
      A11Y=$(jq -r '.categories.accessibility.score * 100' "$JSON_FILE" | cut -d. -f1)
      BP=$(jq -r '.categories["best-practices"].score * 100' "$JSON_FILE" | cut -d. -f1)
      SEO=$(jq -r '.categories.seo.score * 100' "$JSON_FILE" | cut -d. -f1)
      
      echo "  Performance:    $PERF/100"
      echo "  Accessibility:  $A11Y/100"
      echo "  Best Practices: $BP/100"
      echo "  SEO:            $SEO/100"
      echo ""
      
      # Gi anbefalinger
      if [ "$PERF" -lt 90 ]; then
        echo "⚠️  Performance under 90 - sjekk:"
        echo "   - Image optimization"
        echo "   - Code splitting"
        echo "   - Remove unused CSS/JS"
      fi
      
      if [ "$A11Y" -lt 90 ]; then
        echo "⚠️  Accessibility under 90 - sjekk:"
        echo "   - Alt text på bilder"
        echo "   - ARIA labels"
        echo "   - Keyboard navigation"
      fi
    else
      echo "💡 Installer jq for å parse resultater: brew install jq"
    fi
  fi
  
  # Åpne HTML rapport
  HTML_FILE="$REPORT_DIR/mobile-$TIMESTAMP.report.html"
  echo ""
  echo "📄 Rapport lagret: $HTML_FILE"
  echo "🌐 Åpner i browser..."
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$HTML_FILE"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$HTML_FILE"
  fi
else
  echo "❌ Lighthouse feilet"
  exit 1
fi

echo ""
echo "✅ Audit fullført!"

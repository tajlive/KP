#!/bin/bash
# ==========================================
# LIGHTHOUSE ALL — 25 offentlige ruter
# ==========================================
# Kjører Lighthouse audit på alle Klarpakke
# sine offentlige ruter sekvensielt.
#
# Bruk:
#   ./scripts/lighthouse-all.sh              # Desktop (standard)
#   ./scripts/lighthouse-all.sh --mobile      # Mobile emulert
#   ./scripts/lighthouse-all.sh --ci          # Bruk LHCI (samme som CI)
#   ./scripts/lighthouse-all.sh --help        # Hjelp
# ==========================================

set -euo pipefail

MODE="${1:-desktop}"
BASE_URL="${BASE_URL:-https://www.klarpakke.no}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports/lighthouse/${TIMESTAMP}"
SUMMARY_FILE="${REPORT_DIR}/summary.md"

# === 25 offentlige ruter ===
# 1–13: Marketing
# 14–16: Legal
# 17–20: Auth (login, register, reset/update password)
# 21–24: Social (jokertrade, leaderboard, copy-trading)
# 25: Academy

URLS=(
  "${BASE_URL}/no"                         # 1  — Forside
  "${BASE_URL}/no/priser"                  # 2  — Priser
  "${BASE_URL}/no/priser/success"          # 3  — Betaling bekreftet
  "${BASE_URL}/no/priser/cancel"           # 4  — Betaling avbrutt
  "${BASE_URL}/no/mobiloversikt"           # 5  — Mobiloversikt
  "${BASE_URL}/no/bots"                    # 6  — Auto-trading bots
  "${BASE_URL}/no/binance-guide"           # 7  — Binance-guide
  "${BASE_URL}/no/kalkulator"              # 8  — Kalkulator
  "${BASE_URL}/no/kontakt"                 # 9  — Kontakt oss
  "${BASE_URL}/no/om-oss"                  # 10 — Om oss
  "${BASE_URL}/no/hjelp"                   # 11 — Hjelp / FAQ
  "${BASE_URL}/no/marked"                  # 12 — Marked
  "${BASE_URL}/no/handel"                  # 13 — Handel
  "${BASE_URL}/no/vilkar"                  # 14 — Vilkår
  "${BASE_URL}/no/personvern"              # 15 — Personvern
  "${BASE_URL}/no/cookies"                 # 16 — Informasjonskapsler
  "${BASE_URL}/login"                      # 17 — Logg inn
  "${BASE_URL}/register"                   # 18 — Registrer
  "${BASE_URL}/no/reset-password"          # 19 — Tilbakestill passord
  "${BASE_URL}/no/update-password"         # 20 — Oppdater passord
  "${BASE_URL}/no/jokertrade"              # 21 — Joker Trade
  "${BASE_URL}/no/leaderboard"             # 22 — Toppliste
  "${BASE_URL}/no/copy-trading"            # 23 — Kopi-handel
  "${BASE_URL}/no/copy-trading/discover"   # 24 — Oppdag tradere
  "${BASE_URL}/no/akademi"                 # 25 — Akademi
)

# === Hjelp ===
if [[ "${MODE}" == "--help" ]]; then
  echo "Bruk: $0 [--desktop|--mobile|--ci]"
  echo ""
  echo "  --desktop  (standard) Desktop-optimalisert audit"
  echo "  --mobile   Mobil-emulert audit"
  echo "  --ci       Bruk LHCI (samme som GitHub Actions)"
  echo "  --help     Denne hjelpeteksten"
  exit 0
fi

# === Sjekk avhengigheter ===
check_deps() {
  if [[ "${MODE}" == "--ci" ]]; then
    if ! command -v lhci &> /dev/null; then
      echo "❌ lhci mangler. Installer: npm install -g @lhci/cli"
      exit 1
    fi
  else
    if ! command -v lighthouse &> /dev/null; then
      echo "📦 Installerer Lighthouse CLI..."
      npm install -g lighthouse
    fi
  fi

  if ! command -v jq &> /dev/null; then
    echo "⚠️  jq mangler — installerer..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      brew install jq
    else
      sudo apt-get install -y jq
    fi
  fi
}

# === LHCI-modus (samme som CI) ===
run_lhci() {
  echo "🚦 Kjører LHCI autorun med .lighthouserc.json..."
  echo "   (25 ruter — kan ta 10–20 minutter)"
  echo ""

  lhci autorun --config=.lighthouserc.json

  echo ""
  echo "✅ LHCI fullført!"
  echo "📄 Rapporter i .lighthouseci/"
}

# === Lighthouse CLI-modus (lokal, enkeltvis) ===
run_lighthouse_cli() {
  mkdir -p "$REPORT_DIR"

  echo "========================================================"
  echo "🚦 LIGHTHOUSE ALL — 25 offentlige ruter"
  echo "📱 Modus: ${MODE/--/}"
  echo "========================================================"
  echo ""

  # Bestem Lighthouse-flag
  LH_FLAGS="--output=html --output=json --quiet"
  if [[ "${MODE}" == "--mobile" ]]; then
    LH_FLAGS="${LH_FLAGS} --form-factor=mobile --screenEmulation.mobile"
    REPORT_PREFIX="mobile"
  else
    LH_FLAGS="${LH_FLAGS} --preset=desktop"
    REPORT_PREFIX="desktop"
  fi

  # Samle resultater for oppsummering
  PASS_COUNT=0
  FAIL_COUNT=0
  TOTAL=${#URLS[@]}

  # Start summary
  {
    echo "# 🚦 Lighthouse Report — ${REPORT_PREFIX^}"
    echo ""
    echo "**Dato:** $(date '+%Y-%m-%d %H:%M:%S')"
    echo "**Base URL:** ${BASE_URL}"
    echo "**Ruter testet:** ${TOTAL}"
    echo ""
    echo "| # | Rute | Performance | Accessibility | Best Practices | SEO | Status |"
    echo "|---|------|------------:|--------------:|---------------:|----:|--------|"
  } > "$SUMMARY_FILE"

  for i in "${!URLS[@]}"; do
    URL="${URLS[$i]}"
    INDEX=$((i + 1))
    
    # Ekstraher rutenavn for filnavn og output
    ROUTE_NAME=$(echo "$URL" | sed "s|${BASE_URL}/||" | tr '/' '-' | tr '[:upper:]' '[:lower:]')
    [[ -z "$ROUTE_NAME" ]] && ROUTE_NAME="index"
    
    echo "[${INDEX}/${TOTAL}] 🌐 Tester: ${URL}"
    
    # Kjør Lighthouse
    lighthouse "${URL}" \
      ${LH_FLAGS} \
      --output-path="${REPORT_DIR}/${REPORT_PREFIX}-${ROUTE_NAME}" \
      --only-categories=performance,accessibility,best-practices,seo \
      --chrome-flags="--headless=new --no-sandbox" \
      2>/dev/null || true

    JSON_FILE="${REPORT_DIR}/${REPORT_PREFIX}-${ROUTE_NAME}.report.json"
    
    if [[ -f "$JSON_FILE" ]]; then
      # Hent scores
      PERF=$(jq -r '.categories.performance.score * 100 | floor' "$JSON_FILE" 2>/dev/null || echo "N/A")
      A11Y=$(jq -r '.categories.accessibility.score * 100 | floor' "$JSON_FILE" 2>/dev/null || echo "N/A")
      BP=$(jq -r '.["categories"]["best-practices"].score * 100 | floor' "$JSON_FILE" 2>/dev/null || echo "N/A")
      SEO=$(jq -r '.categories.seo.score * 100 | floor' "$JSON_FILE" 2>/dev/null || echo "N/A")
      
      # Bestem status
      STATUS="✅"
      if [[ "$PERF" != "N/A" ]] && [[ "$PERF" -lt 70 ]]; then
        STATUS="⚠️"
        FAIL_COUNT=$((FAIL_COUNT + 1))
      else
        PASS_COUNT=$((PASS_COUNT + 1))
      fi

      echo "   📊 P:${PERF} A:${A11Y} BP:${BP} SEO:${SEO} ${STATUS}"
      
      # Legg til summary
      echo "| ${INDEX} | /${ROUTE_NAME//-/\/} | ${PERF} | ${A11Y} | ${BP} | ${SEO} | ${STATUS} |" >> "$SUMMARY_FILE"
    else
      echo "   ❌ Ingen rapport generert"
      echo "| ${INDEX} | /${ROUTE_NAME//-/\/} | — | — | — | — | ❌ |" >> "$SUMMARY_FILE"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    echo ""
  done

  # Fullfør summary
  {
    echo ""
    echo "**Resultat:** ✅ ${PASS_COUNT} bestått, ❌ ${FAIL_COUNT} feilet (av ${TOTAL})"
    echo ""
    echo "### Ytelsesterskler"
    echo "- Performance ≥ 75 (standard), ≥ 70 (tunge sider)"
    echo "- Accessibility ≥ 85"
    echo "- Best Practices ≥ 85"
    echo "- SEO ≥ 80"
  } >> "$SUMMARY_FILE"

  # Skriv ut oppsummering
  echo "========================================================"
  echo "📊 OPPSUMMERING"
  echo "========================================================"
  echo "  ✅ Bestått: ${PASS_COUNT}/${TOTAL}"
  echo "  ❌ Feilet:  ${FAIL_COUNT}/${TOTAL}"
  echo ""
  echo "📄 Rapport: ${REPORT_DIR}/"
  echo "📊 Sammendrag: ${SUMMARY_FILE}"
  echo ""

  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    echo "⚠️  ${FAIL_COUNT} rute(r) har under 70 i performance — optimalisering anbefales"
    return 1
  fi

  return 0
}

# === Main ===
check_deps

if [[ "${MODE}" == "--ci" ]]; then
  run_lhci
else
  run_lighthouse_cli
fi

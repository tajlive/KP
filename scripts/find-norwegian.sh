#!/bin/bash
# Script for å finne hardkodet norsk tekst i koden

echo "=== Sjekker for hardkodet norsk tekst ==="
echo ""

# Vanlige norske ord som ikke bør være hardkodet
NORWEGIAN_WORDS=(
  "Deg"
  "deg"
  "Logg inn"
  "logg inn"
  "Lagrer"
  "lagrer"
  "Dine"
  "dine"
  "nettleseren"
  "historikk"
  "permanent"
  "Uke"
  "Måned"
  "År"
  "I dag"
  "Denne uken"
  "Denne måneden"
  "All tid"
  "Velg"
  "kjøpe"
  "selge"
  "Kjøp"
  "Selg"
  "prøveperioden"
  "dag igjen"
  "dager igjen"
  "Prøv før du kjøper"
  "Perfekt for nybegynnere"
  "Velg Basis"
  "Velg Komplett"
  "Velg Pro"
  "Gratis"
  "Basis"
  "Komplett"
  "Pro"
  "Produkt"
  "Start gratis"
  "kr"
  "kr "
  "NOK"
  "nb-NO"
  "sorter"
  "Søk"
  "søk"
  "Viser"
  "av"
  "forrige"
  "neste"
  "Forrige"
  "Neste"
  "last inn"
  "Last inn"
  "Laster"
  "laster"
  "ingen"
  "Ingen"
  "resultater"
  "Resultater"
  "tøm"
  "Tøm"
  "filtrer"
  "Filtrer"
)

echo "1. Sjekker src/app/[locale]/ (pages)..."
for word in "${NORWEGIAN_WORDS[@]}"; do
  grep -rn "$word" src/app/[locale]/ --include="*.tsx" 2>/dev/null | head -5
done

echo ""
echo "2. Sjekker src/components/..."
for word in "${NORWEGIAN_WORDS[@]}"; do
  grep -rn "$word" src/components/ --include="*.tsx" 2>/dev/null | head -5
done

echo ""
echo "3. Sjekker src/lib/..."
for word in "${NORWEGIAN_WORDS[@]}"; do
  grep -rn "$word" src/lib/ --include="*.ts" 2>/dev/null | head -5
done

echo ""
echo "4. Sjekker for 'nb-NO' locale (skal være dynamisk)..."
grep -rn "nb-NO" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | head -20

echo ""
echo "5. Sjekker for 'kr' valuta (skal være dynamisk)..."
grep -rn "'kr'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | head -20

echo ""
echo "=== Ferdig ==="

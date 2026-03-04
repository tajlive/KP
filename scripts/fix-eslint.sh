#!/bin/bash
# Fiks ESLint warnings automatisk

echo "=== RYDDER ESLINT WARNINGS ==="

# 1. Fjern ubrukte imports (enkle tilfeller)
echo "1. Fjerner ubrukte imports..."

# VippsBadge.tsx - fjern Smartphone
sed -i '' '/import.*Smartphone.*from.*lucide-react/d' /Users/taj/klarpakke/components/pricing/VippsBadge.tsx 2>/dev/null || true

# ClientAdminAnalytics.tsx - fjern TrendingUp
sed -i '' '/import.*TrendingUp.*from.*lucide-react/d' /Users/taj/klarpakke/src/app/\[locale\]/admin/analytics/ClientAdminAnalytics.tsx 2>/dev/null || true

# ClientAdminUsers.tsx - fjern Filter
sed -i '' '/import.*Filter.*from.*lucide-react/d' /Users/taj/klarpakke/src/app/\[locale\]/admin/users/ClientAdminUsers.tsx 2>/dev/null || true

echo "✓ Ferdig med enkle imports"

# 2. Prefiks ubrukte variabler med _
echo "2. Prefikser ubrukte variabler..."

# paper-trading.e2e.test.ts
sed -i '' 's/sessionId/_sessionId/g' /Users/taj/klarpakke/audit/tests/paper-trading.e2e.test.ts 2>/dev/null || true

# ClientStudentsPage.tsx
sed -i '' 's/\b_locale\b/_locale/g' /Users/taj/klarpakke/src/app/\[locale\]/admin/ClientStudentsPage.tsx 2>/dev/null || true
sed -i '' 's/\b_selectedUsers\b/_selectedUsers/g' /Users/taj/klarpakke/src/app/\[locale\]/admin/ClientStudentsPage.tsx 2>/dev/null || true
sed -i '' 's/\b_setSelectedUsers\b/_setSelectedUsers/g' /Users/taj/klarpakke/src/app/\[locale\]/admin/ClientStudentsPage.tsx 2>/dev/null || true

# ClientAdminAnalytics.tsx - trend parameter
sed -i '' 's/trend: any/_trend: any/g' /Users/taj/klarpakke/src/app/\[locale\]/admin/analytics/ClientAdminAnalytics.tsx 2>/dev/null || true

echo "✓ Ferdig med variabler"

# 3. Fiks error variabler i catch
echo "3. Fikser error variabler i catch..."

find /Users/taj/klarpakke/src -name "*.tsx" -o -name "*.ts" | while read file; do
    # Bytt ut 'err' med '_err' i catch-blokker
    sed -i '' 's/catch (err)/catch (_err)/g' "$file" 2>/dev/null || true
    sed -i '' 's/catch (error)/catch (_error)/g' "$file" 2>/dev/null || true
done

echo "✓ Ferdig med error variabler"

echo ""
echo "=== ESLINT RYDDING FERDIG ==="
echo "Kjør 'npm run lint' for å sjekke resultat"

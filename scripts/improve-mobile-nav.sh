#!/bin/bash
# ==========================================
# MOBILE NAVIGATION IMPROVEMENTS
# ==========================================

echo "📱 Forbedrer mobile navigation..."
echo ""

# 1. Sjekk nåværende Navigation
if [ ! -f "src/components/layout/Navigation.tsx" ]; then
  echo "❌ Finner ikke Navigation.tsx"
  exit 1
fi

# 2. Backup
cp src/components/layout/Navigation.tsx src/components/layout/Navigation.tsx.backup
echo "✅ Backup lagret"

# 3. Analyser nåværende kode
echo ""
echo "📊 Analyserer Navigation.tsx..."

HAS_MOBILE_MENU=$(grep -c "useState.*menu\|mobile.*menu" src/components/layout/Navigation.tsx)
HAS_HAMBURGER=$(grep -c "MenuIcon\|HamburgerIcon\|Menu.*Icon" src/components/layout/Navigation.tsx)
HAS_SCROLL_LOCK=$(grep -c "overflow.*hidden\|scroll.*lock" src/components/layout/Navigation.tsx)

echo "  - Mobile menu state: $([ $HAS_MOBILE_MENU -gt 0 ] && echo '✅' || echo '❌')"
echo "  - Hamburger icon: $([ $HAS_HAMBURGER -gt 0 ] && echo '✅' || echo '❌')"
echo "  - Scroll lock: $([ $HAS_SCROLL_LOCK -gt 0 ] && echo '✅' || echo '❌')"

# 4. Generer forbedringer
echo ""
echo "🔧 Anbefalte forbedringer:"

if [ $HAS_MOBILE_MENU -eq 0 ]; then
  echo "  1. Legg til mobile menu state management"
  echo "     → const [isOpen, setIsOpen] = useState(false)"
fi

if [ $HAS_SCROLL_LOCK -eq 0 ]; then
  echo "  2. Legg til scroll lock ved åpen mobilmeny"
  echo "     → useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : '' })"
fi

echo "  3. Sjekk at touch targets er 44px+"
echo "  4. Test på ekte iPhone/Android"

echo ""
echo "💡 Vil du se eksempel på optimal Navigation.tsx? [y/N]"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo ""
  echo "Se: CLAUDE.md - KOMPONENT-KONVENSJONER - Navigasjon"
  echo "Eller kjør: cat CLAUDE.md | grep -A 20 'Navigasjon'"
fi

echo ""
echo "✅ Analyse fullført"

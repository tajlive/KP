#!/bin/bash
echo "🧪 QUICK HEALTH CHECK"
echo "===================="

# 1. Supabase
echo -n "✓ Supabase: "
grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && echo "OK" || echo "MISSING"

# 2. Hydration fix
echo -n "✓ Hydration fix: "
grep -q "suppressHydrationWarning" src/app/\[locale\]/layout.tsx && echo "OK" || echo "MISSING"

# 3. TailwindCSS version
echo -n "✓ TailwindCSS: "
grep '"tailwindcss": "^3' package.json && echo "v3.x OK" || echo "WRONG VERSION!"

# 4. PostCSS
echo -n "✓ PostCSS: "
[ -f postcss.config.js ] && echo "OK" || echo "MISSING"

echo ""
echo "Run: npm run build"


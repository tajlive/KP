#!/bin/bash
set -e

echo "========================================="
echo "Running pre-deploy checks for Klarpakke"
echo "========================================="

# 1. TypeScript type check
echo ""
echo "1. Running TypeScript type check..."
npm run type-check
echo "✅ Type check passed"

# 2. Build test
echo ""
echo "2. Running build test..."
npm run build
echo "✅ Build passed"

# 3. i18n validation
echo ""
echo "3. Validating i18n files..."
node scripts/validate-i18n.js
echo "✅ i18n validation passed"

# 4. Check critical i18n keys
echo ""
echo "4. Checking critical i18n keys..."
node -e "
const no = require('./messages/no/metadata.json');
const en = require('./messages/en/metadata.json');
const keys = ['about.title', 'about.description', 'contact.title', 'contact.description'];
let failed = false;
keys.forEach(key => {
  const parts = key.split('.');
  if (!no[parts[0]]?.[parts[1]]) {
    console.error('❌ MISSING no: ' + key);
    failed = true;
  }
  if (!en[parts[0]]?.[parts[1]]) {
    console.error('❌ MISSING en: ' + key);
    failed = true;
  }
});
if (failed) process.exit(1);
console.log('✅ All critical i18n keys present');
"

# 5. Check that no files are missing
echo ""
echo "5. Checking file structure..."
if [ ! -f "src/i18n.ts" ]; then
  echo "❌ src/i18n.ts is missing"
  exit 1
fi
if [ ! -f "src/app/[locale]/layout.tsx" ]; then
  echo "❌ layout.tsx is missing"
  exit 1
fi
echo "✅ File structure OK"

echo ""
echo "========================================="
echo "✅ All pre-deploy checks passed!"
echo "========================================="

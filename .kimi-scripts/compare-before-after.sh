#!/bin/bash
# Klarpakke — Før/Etter sammenligning av Kimi-prompt
cd /Users/taj/klarpakke

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   KLARPAKKE — FØR/ETTER KIMI PROMPT SAMMENLIGNING      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 1. GIT LOG — siste 10 commits
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SISTE COMMITS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git log --oneline -10
echo ""

# 2. I18N STATUS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 I18N STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 -c "
import json, os
locales = ['no', 'en']
for loc in locales:
    folder = f'messages/{loc}'
    total = 0
    files = sorted(os.listdir(folder))
    for f in files:
        if f.endswith('.json'):
            data = json.load(open(f'{folder}/{f}'))
            def count(d):
                n = 0
                for v in d.values():
                    if isinstance(v, dict): n += count(v)
                    else: n += 1
                return n
            total += count(data)
    print(f'  [{loc.upper()}] {total} nøkler totalt i {len([f for f in files if f.endswith(\".json\")])} filer')

# Sjekk diff mellom no og en
no_keys = {}
en_keys = {}
for loc, store in [('no', no_keys), ('en', en_keys)]:
    for fname in os.listdir(f'messages/{loc}'):
        if not fname.endswith('.json'): continue
        ns = fname.replace('.json', '')
        def flatten(d, prefix=''):
            for k, v in d.items():
                full = f'{prefix}.{k}' if prefix else k
                if isinstance(v, dict): flatten(v, full)
                else: store[f'{ns}.{full}'] = True
        flatten(json.load(open(f'messages/{loc}/{fname}')))
only_en = set(en_keys) - set(no_keys)
only_no = set(no_keys) - set(en_keys)
print(f'')
if only_en:
    print(f'  ⚠️  {len(only_en)} nøkler finnes i EN men ikke NO:')
    for k in sorted(only_en)[:10]:
        print(f'     - {k}')
    if len(only_en) > 10: print(f'     ... og {len(only_en)-10} til')
if only_no:
    print(f'  ⚠️  {len(only_no)} nøkler finnes i NO men ikke EN:')
    for k in sorted(only_no)[:5]:
        print(f'     - {k}')
if not only_en and not only_no:
    print('  ✅ NO og EN er synkroniserte!')
"
echo ""

# 3. JSON VALIDITET
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 JSON VALIDITET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FAILED=0
for f in messages/no/*.json messages/en/*.json; do
  python3 -c "import json; json.load(open('$f'))" 2>/dev/null && echo "  ✅ $f" || { echo "  ❌ $f UGYLDIG JSON"; FAILED=1; }
done
[ $FAILED -eq 0 ] && echo "  Alle JSON-filer er gyldige"
echo ""

# 4. KRITISKE FILER — status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 KRITISKE FILER — NÅ-STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# globals.css — @config og --color-*:initial
if grep -q '@config' src/app/globals.css; then
  echo "  ✅ globals.css: @config direktiv finnes"
else
  echo "  ❌ globals.css: MANGLER @config"
fi
if grep -q '\-\-color\-\*: initial' src/app/globals.css; then
  echo "  ❌ globals.css: --color-*: initial FINNES FORTSATT"
else
  echo "  ✅ globals.css: --color-*: initial er fjernet"
fi

# CdsProvider — CDS global CSS fjernet
if grep -q 'globalStyles\|defaultFontStyles' src/app/providers/CdsProvider.tsx; then
  echo "  ❌ CdsProvider: CDS global CSS importer FINNES"
else
  echo "  ✅ CdsProvider: CDS global CSS importer er fjernet"
fi

# layout.tsx — body klasser
if grep -q 'bg-kp-bg-primary.*text-kp-text-primary\|text-kp-text-primary.*bg-kp-bg-primary' src/app/[locale]/layout.tsx; then
  echo "  ✅ layout.tsx: body bruker korrekte Tailwind-klasser"
else
  echo "  ❌ layout.tsx: body bruker FEIL klasser (bg-kp-primary / text-kp-primary)"
fi

# tailwind.config.mjs — font-sans
if grep -q 'font-inter' tailwind.config.mjs; then
  echo "  ✅ tailwind.config.mjs: font-sans peker på Inter"
else
  echo "  ❌ tailwind.config.mjs: font-sans peker IKKE på Inter"
fi

# layout.tsx — i18n fallback
if grep -q 'messages/en/base.json\|messages/en/landing.json' src/app/[locale]/layout.tsx; then
  echo "  ✅ layout.tsx: i18n fallback bruker namespace-filer"
else
  echo "  ⚠️  layout.tsx: i18n fallback laster kun én namespace (auth.json)"
fi

# TrustStrip nøkler
if python3 -c "
import json
data = json.load(open('messages/no/landing.json'))
assert 'trustStrip' in data
assert 'label1' in data['trustStrip']
assert 'paymentLabel' in data['trustStrip']
print('  ✅ landing.json NO: trustStrip nøkler finnes')
" 2>/dev/null; then :; else
  echo "  ❌ landing.json NO: trustStrip mangler"
fi

if python3 -c "
import json
data = json.load(open('messages/en/landing.json'))
assert 'trustStrip' in data
assert 'label1' in data['trustStrip']
print('  ✅ landing.json EN: trustStrip nøkler finnes')
" 2>/dev/null; then :; else
  echo "  ❌ landing.json EN: trustStrip mangler"
fi

# autoTrade dashboard
if python3 -c "
import json
data = json.load(open('messages/no/autoTrade.json'))
assert 'dashboard' in data
print('  ✅ autoTrade.json NO: dashboard seksjon finnes')
" 2>/dev/null; then :; else
  echo "  ❌ autoTrade.json NO: dashboard seksjon mangler (57 nøkler)"
fi

# ESLint CDS regel
if grep -q 'cds-web/globalStyles\|no-restricted-imports' eslint.config.mjs 2>/dev/null; then
  echo "  ✅ ESLint: CDS global CSS import-regel finnes"
else
  echo "  ⚠️  ESLint: CDS import-regel MANGLER"
fi

# Visual regression test
if [ -f 'e2e/visual/visual-regression.spec.ts' ]; then
  echo "  ✅ Visual regression test finnes"
else
  echo "  ⚠️  Visual regression test MANGLER"
fi

# validate-css-classes script
if [ -f 'scripts/validate-css-classes.mjs' ]; then
  echo "  ✅ validate-css-classes.mjs finnes"
else
  echo "  ⚠️  validate-css-classes.mjs MANGLER"
fi

# pr-check.yml — i18n og css gates
if grep -q 'i18n:validate\|validate:css' .github/workflows/pr-check.yml 2>/dev/null; then
  echo "  ✅ pr-check.yml: i18n + CSS gates finnes"
else
  echo "  ⚠️  pr-check.yml: i18n + CSS gates MANGLER"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FØR/ETTER OPPSUMMERING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  TILSTAND FØR KIMI-PROMPT (27.03.2026 22:00):"
echo "  ❌ TrustStrip viste [MISSING: landing.trustStrip.*] på forsiden"
echo "  ❌ CDS globalStyles overskrev Inter og Tailwind på alle sider"
echo "  ❌ @config manglet → bg-brand-500, bg-kp-bg-primary hadde ingen CSS"
echo "  ❌ body brukte bg-kp-primary (ikke-eksisterende Tailwind-klasse)"
echo "  ❌ font-sans pekte på DM Sans som aldri ble lastet"
echo "  ❌ i18n fallback laster gammel monolittfil (messages/en.json)"
echo "  ❌ autoTrade NO manglet 57 nøkler (hel dashboard-seksjon)"
echo "  ❌ Ingen CI-gate for i18n (npm run i18n:validate koblet ikke til CI)"
echo "  ❌ Ingen visual regression tests"
echo "  ❌ Ingen CSS-klasse-validering"
echo "  ❌ Lighthouse accessibility: 0.89 (threshold: 0.90)"
echo ""
echo "  TILSTAND ETTER (sjekk ✅/❌ ovenfor for nåværende status)"
echo ""

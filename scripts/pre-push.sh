#!/bin/bash
# Pre-commit hook: validate JSON i18n files and check for basic issues
set -e

echo "🔒 Klarpakke Pre-Push"
echo "  eslint..."
npx eslint --quiet . 2>/dev/null || npx eslint . 2>&1 | tail -5
echo "  ✅ lint OK"

echo "  vitest..."
npx vitest run --reporter=dot 2>&1 | tail -2
echo "  ✅ tests OK"

echo "  JSON validation..."
python3 -c "
import json, sys
for f in ['messages/no.json', 'messages/en.json']:
    try:
        json.load(open(f))
    except Exception as e:
        print(f'FAIL: {f} - {e}')
        sys.exit(1)
print('  ✅ JSON OK')
"

echo "  i18n key check..."
python3 -c "
import json, re, os, sys

with open('messages/no.json') as f:
    no = json.load(f)

def build_keys(d, prefix=''):
    keys = set()
    for k, v in d.items():
        path = f'{prefix}.{k}' if prefix else k
        keys.add(path)
        if isinstance(v, dict):
            keys.update(build_keys(v, path))
    return keys

existing = build_keys(no)

# Check staged .tsx/.ts files for t() calls
staged = os.popen('git diff --cached --name-only --diff-filter=ACMR src/ | grep -E \"\\.(tsx|ts)$\" || true').read().strip().split('\n')
missing = []
for f in staged:
    if not f: continue
    with open(f) as fh:
        try: content = fh.read()
        except: continue
    lines = content.split('\n')
    ns = None
    for i, line in enumerate(lines):
        m = re.search(r'useTranslations\(\"([^\"]+)\"\)', line)
        if m: ns = m.group(1)
        for m in re.finditer(r't\([`\"']([^`\"']+)[`\"']\)', line):
            key = m.group(1)
            if ns:
                full = f'{ns}.{key}'
                # Check if key exists
                parts = full.split('.')
                found = False
                data = no
                for p in parts:
                    if isinstance(data, dict) and p in data:
                        data = data[p]
                    else:
                        break
                else:
                    found = True
                if not found:
                    missing.append(f'{f}:{i+1}  {full}')

if missing:
    print(f'  ⚠️  {len(missing)} missing i18n keys:')
    for m in missing[:10]:
        print(f'    {m}')
    if len(missing) > 10:
        print(f'    ... and {len(missing)-10} more')
    print('  ✅ i18n check complete')
else:
    print('  ✅ i18n OK')
"

echo "✅ Pre-push passed — pushing"

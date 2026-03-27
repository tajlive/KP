#!/usr/bin/env python3
"""
Klarpakke i18n-sjekker
Skannar alle .tsx/.ts-filer og finner t('KEY') som mangler i messages/no/ og messages/en/
"""
import json, os, re

LOCALES = ['no', 'en']
SRC_ROOT = '/Users/taj/klarpakke/src'
MSG_ROOT = '/Users/taj/klarpakke/messages'

def load_all_keys(locale):
    folder = os.path.join(MSG_ROOT, locale)
    all_keys = set()
    if not os.path.isdir(folder):
        return all_keys
    for fname in os.listdir(folder):
        if not fname.endswith('.json'):
            continue
        ns = fname.replace('.json', '')
        try:
            with open(os.path.join(folder, fname), encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f'  JSON-feil i {fname}: {e}')
            continue
        def flatten(d, prefix=''):
            for k, v in d.items():
                full = f'{prefix}.{k}' if prefix else k
                if isinstance(v, dict):
                    flatten(v, full)
                elif isinstance(v, list):
                    all_keys.add(full)  # list-noder telles som blad
                else:
                    all_keys.add(full)
        flatten(data, ns)
    return all_keys

def scan_tsx_keys():
    """Finn alle t('key') og t("key") i src/"""
    found = {}  # key -> [files]
    pattern = re.compile(r"\bt\(['\"]([^'\"\n]{1,120})['\"]\)")
    for root, dirs, files in os.walk(SRC_ROOT):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '__pycache__']]
        for fname in files:
            if not fname.endswith(('.tsx', '.ts', '.jsx', '.js')):
                continue
            fpath = os.path.join(root, fname)
            try:
                content = open(fpath, encoding='utf-8').read()
            except Exception:
                continue
            for m in pattern.finditer(content):
                key = m.group(1)
                # Hopp over dynamiske keys (inneholder { eller variabel-lignende)
                if '{' in key or '\\' in key:
                    continue
                relpath = fpath.replace(SRC_ROOT + '/', '')
                found.setdefault(key, set()).add(relpath)
    return found

def check_pages():
    """Sjekk alle sider mot URL-struktur"""
    pages = []
    app_root = '/Users/taj/klarpakke/src/app/[locale]'
    for item in sorted(os.listdir(app_root)):
        full = os.path.join(app_root, item)
        if os.path.isdir(full):
            pages.append(item)
    return pages

print('=' * 60)
print('KLARPAKKE I18N KOMPLETT SJEKK')
print('=' * 60)

# 1. Last alle keys per locale
keys_by_locale = {}
for loc in LOCALES:
    keys = load_all_keys(loc)
    keys_by_locale[loc] = keys
    print(f'\n[{loc.upper()}] {len(keys)} nøkler totalt')
    # Vis namespace-fordeling
    namespaces = {}
    for k in keys:
        ns = k.split('.')[0]
        namespaces[ns] = namespaces.get(ns, 0) + 1
    for ns, count in sorted(namespaces.items()):
        print(f'  {ns}: {count} nøkler')

# 2. Scan alle t()-kall i kode
print('\n' + '=' * 60)
print('SCANNER tsx/ts-KODE...')
code_keys = scan_tsx_keys()
print(f'Totalt {len(code_keys)} unike t()-nøkler funnet i kode')

# 3. Finn missing per locale
print('\n' + '=' * 60)
print('MANGLENDE NØKLER PER LOCALE')
print('=' * 60)

all_missing = {}
for loc in LOCALES:
    known = keys_by_locale[loc]
    missing = {}
    for key, files in code_keys.items():
        # Sjekk om nøkkelen (eller namespace-roten) finnes
        # next-intl: namespace settes via useTranslations('ns'), t('key') -> 'ns.key'
        # Men vi vet ikke namespace fra scan alene — sjekk begge deler
        if key not in known:
            # Sjekk om noen variant finnes
            variants = [key, f'landing.{key}', f'auth.{key}', f'dashboard.{key}']
            found_variant = any(v in known for v in variants)
            if not found_variant:
                missing[key] = sorted(files)
    all_missing[loc] = missing
    print(f'\n[{loc.upper()}] {len(missing)} potensielt manglende nøkler:')
    for key, files in sorted(missing.items())[:25]:
        print(f'  ✗ {key}')
        for f in files[:2]:
            print(f'      → {f}')
    if len(missing) > 25:
        print(f'  ... og {len(missing)-25} til')

# 4. Sjekk sideoversikt
print('\n' + '=' * 60)
print('SIDER I APP (locale-baserte ruter)')
print('=' * 60)
pages = check_pages()
for p in pages:
    url = f'https://www.klarpakke.no/no/{p}'
    print(f'  /no/{p}')

print(f'\nTotalt {len(pages)} sider funnet')

# 5. Sjekk JSON-validitet for alle locale-filer
print('\n' + '=' * 60)
print('JSON-VALIDITET')
print('=' * 60)
for loc in LOCALES:
    folder = os.path.join(MSG_ROOT, loc)
    if not os.path.isdir(folder):
        continue
    for fname in sorted(os.listdir(folder)):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(folder, fname)
        try:
            json.load(open(fpath, encoding='utf-8'))
            print(f'  ✓ {loc}/{fname}')
        except Exception as e:
            print(f'  ✗ {loc}/{fname}: {e}')

print('\nFerdig.')

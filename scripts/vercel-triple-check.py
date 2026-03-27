#!/usr/bin/env python3
"""
Triple-sjekk av Vercel-status, bygge-feil og env-variables for Klarpakke.
Bruk: python3 scripts/vercel-triple-check.py
"""

import subprocess
import json
import os
import re
import sys

ROOT = '/Users/taj/klarpakke'

def run(cmd, capture=True):
    r = subprocess.run(cmd, shell=True, capture_output=capture, text=True)
    return (r.stdout + r.stderr).strip()

print('=' * 70)
print('KLARPAKKE — VERCEL TRIPLE-SJEKK')
print('=' * 70)

# ── 1. GIT STATUS ────────────────────────────────────────────────────
print('\n╌╌ 1. GIT STATUS')
print(run(f'cd {ROOT} && git log --oneline -5'))
print(run(f'cd {ROOT} && git status --short'))

# ── 2. TYPESCRIPT ────────────────────────────────────────────────────
print('\n╌╌ 2. TypeScript (tsc --noEmit)')
tsc_out = run(f'cd {ROOT} && npx tsc --noEmit 2>&1 | head -30')
if 'error TS' in tsc_out:
    print('❌ TSC FEIL:')
    print(tsc_out)
else:
    print('✅ TSC OK — ingen feil')

# ── 3. VERCEL DEPLOYMENTS ─────────────────────────────────────────────
print('\n╌╌ 3. Vercel — siste deployments')
vercel_list = run(f'cd {ROOT} && vercel list --limit 10 2>&1')
print(vercel_list)

# Parse status fra output
errors = [l for l in vercel_list.split('\n') if 'Error' in l or 'error' in l.lower()]
building = [l for l in vercel_list.split('\n') if 'Building' in l or 'building' in l.lower()]
ready = [l for l in vercel_list.split('\n') if 'Ready' in l]

print(f'\n  Ready:    {len(ready)}')
print(f'  Building: {len(building)}')
print(f'  Errors:   {len(errors)}')

# ── 4. SISTE BYGGEFEIL ────────────────────────────────────────────────
print('\n╌╌ 4. Hent siste byggelogg (siste feilede deploy)')
build_inspect = run(f'cd {ROOT} && vercel inspect --wait 2>&1 | head -50')
print(build_inspect)

# ── 5. ENV VARIABLES SJEKK ────────────────────────────────────────────
print('\n╌╌ 5. Vercel env-variables (produksjon)')
env_out = run(f'cd {ROOT} && vercel env ls production 2>&1')
print(env_out)

# Kritiske env-variabler Klarpakke trenger
required_env = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'NEXTAUTH_SECRET',
]

missing = []
for key in required_env:
    if key not in env_out:
        missing.append(key)

if missing:
    print(f'\n⚠️  MANGLER env-variabler i Vercel produksjon:')
    for m in missing:
        print(f'  ❌ {m}')
else:
    print('\n✅ Alle krit. env-variabler er satt')

# ── 6. LOKALE SKJEMA-RISIKOER ─────────────────────────────────────────
print('\n╌╌ 6. Scan lokale .eq() risiko-mønstre i src/app/api/')
risks = {
    'session_id mot positions': r'\.from\(["\x27]positions["\x27]\).*?\.eq\(["\x27]session_id',
    'stripe_subscription_id mot user_profiles': r'\.from\(["\x27]user_profiles["\x27]\).*?\.eq\(["\x27]stripe_subscription_id',
    'status=active mot strategies': r'\.from\(["\x27]strategies["\x27]\).*?\.eq\(["\x27]status',
    'is_marketplace_listed insert': r'\.from\(["\x27]strategies["\x27]\).*?is_marketplace_listed.*?insert',
    'risk_config direkte kolonne': r'session\.risk_config(?!.*strategy_config)',
}

found_risks = []
for root_dir, dirs, files in os.walk(os.path.join(ROOT, 'src')):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '__tests__']]
    for fname in files:
        if not fname.endswith('.ts'):
            continue
        fpath = os.path.join(root_dir, fname)
        try:
            with open(fpath) as f:
                lines = f.readlines()
        except Exception:
            continue
        content_joined = ''.join(lines)
        for risk_name, pattern in risks.items():
            if re.search(pattern, content_joined, re.DOTALL | re.IGNORECASE):
                found_risks.append((risk_name, fpath.replace(ROOT+'/', '')))

if found_risks:
    print('⚠️  Potensielle schema-risikoer:')
    for rn, fp in found_risks:
        print(f'  [{rn}] {fp}')
else:
    print('✅ Ingen kjente schema-risikoer funnet')

# ── 7. SAMMENDRAG ─────────────────────────────────────────────────────
print('\n' + '=' * 70)
print('SAMMENDRAG')
print('=' * 70)
print(f'  TSC:       {"FEIL" if "error TS" in tsc_out else "OK"}')
print(f'  Git:       {run(f"cd {ROOT} && git log --oneline -1")}')
print(f'  Env-vars:  {"MANGLER " + str(missing) if missing else "OK"}')
print(f'  Risikoer:  {len(found_risks)} funnet')
print()

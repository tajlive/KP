#!/usr/bin/env python3
"""Audit remaining schema risks + auto-fix what is safe."""
import os, re, subprocess, sys

ROOT = '/Users/taj/klarpakke/src/app/api'

# ─── 1. AUDIT ────────────────────────────────────────────────────────────────
risks = {
    'is_marketplace_listed': [],
    'user_strategy_id': [],
    'session.risk_config': [],
    'status", "ACTIVE"': [],
    'status", "active"': [],  # only on strategies table — safe on trading_sessions
}

for dirpath, _, files in os.walk(ROOT):
    for fname in files:
        if not fname.endswith('.ts'):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath) as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            for key in risks:
                if key in line:
                    risks[key].append(f'{fpath}:{i}: {line.rstrip()}')

print('=== AUDIT RESULTS ===')
any_risk = False
for key, hits in risks.items():
    if hits:
        any_risk = True
        print(f'\n[{key}]')
        for h in hits:
            print(f'  {h}')

if not any_risk:
    print('All clear — no remaining schema risks found.')

# ─── 2. FIX: bots/[id]/actions — status ACTIVE → active ─────────────────────
bots_actions = '/Users/taj/klarpakke/src/app/api/bots/[id]/actions/route.ts'
if os.path.exists(bots_actions):
    with open(bots_actions) as f:
        content = f.read()
    orig = content
    # trading_sessions uses lowercase status values
    content = content.replace('.eq("status", "ACTIVE")', '.eq("status", "active")')
    if content != orig:
        with open(bots_actions, 'w') as f:
            f.write(content)
        print('\nFIXED: bots/[id]/actions — ACTIVE -> active')
    else:
        print('\nOK: bots/[id]/actions already clean')

# ─── 3. CHECK marketplace_subscriptions schema for user_strategy_id ──────────
# Search in types/supabase-generated.ts
gen_types = '/Users/taj/klarpakke/src/types/supabase-generated.ts'
if os.path.exists(gen_types):
    with open(gen_types) as f:
        generated = f.read()
    # Find the marketplace_subscriptions Row type
    idx = generated.find('marketplace_subscriptions')
    snippet = generated[idx:idx+800] if idx >= 0 else 'NOT FOUND'
    print(f'\n=== marketplace_subscriptions schema snippet ===')
    print(snippet[:600])
else:
    print('\nWARNING: supabase-generated.ts not found')

# ─── 4. CHECK trading_sessions schema columns ─────────────────────────────────
if os.path.exists(gen_types):
    idx2 = generated.find('trading_sessions')
    snippet2 = generated[idx2:idx2+1200] if idx2 >= 0 else 'NOT FOUND'
    print(f'\n=== trading_sessions schema snippet ===')
    print(snippet2[:1000])

print('\n=== DONE ===')

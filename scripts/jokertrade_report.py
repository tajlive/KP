#!/usr/bin/env python3
import json
import os
import urllib.request
import urllib.parse
from collections import defaultdict
from datetime import datetime, timezone, timedelta

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Accept': 'application/json',
    'Prefer': 'count=exact'
}

def fetch(path, params=None):
    url = f"{SUPABASE_URL}/rest/v1{path}"
    if params:
        qs = urllib.parse.urlencode(params)
        url = f"{url}?{qs}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
        return json.loads(body) if body else []

# 1. Trades etter fiksen
CUTOFF = '2026-07-30T11:00:00Z'
trades = fetch('/trades', {
    'select': '*',
    'created_at': f'gt.{CUTOFF}',
    'order': 'created_at.asc',
    'limit': 1000
})

print(f"=== TRADER ETTER {CUTOFF} ===")
print(f"Totalt antall: {len(trades)}")
if not trades:
    print("Ingen trader funnet!")
else:
    wins = [t for t in trades if t.get('realized_pnl') is not None and float(t['realized_pnl']) > 0]
    losses = [t for t in trades if t.get('realized_pnl') is not None and float(t['realized_pnl']) < 0]
    pnl_vals = [float(t['realized_pnl']) for t in trades if t.get('realized_pnl') is not None]
    
    print(f"Wins: {len(wins)}")
    print(f"Losses: {len(losses)}")
    print(f"Sum PnL: {sum(pnl_vals):.2f}")
    print(f"Avg PnL: {sum(pnl_vals)/len(pnl_vals):.4f}" if pnl_vals else "Ingen PnL-data")
    
    # Per symbol
    per_pair = defaultdict(list)
    for t in trades:
        per_pair[t['trading_pair']].append(t)
    print(f"\n=== PER SYMBOL ({len(per_pair)} par) ===")
    for pair in sorted(per_pair):
        txs = per_pair[pair]
        pnls = [float(t['realized_pnl']) for t in txs if t.get('realized_pnl') is not None]
        buys = [t for t in txs if t['side'] == 'buy']
        sells = [t for t in txs if t['side'] == 'sell']
        print(f"  {pair}: {len(txs)} handler, {len(buys)} kjøp, {len(sells)} salg, PnL={sum(pnls):.2f}" if pnls else f"  {pair}: {len(txs)} handler, {len(buys)} kjøp, {len(sells)} salg, ingen PnL")
    
    # Per dag
    per_day = defaultdict(lambda: {'count':0, 'pnl':[], 'buys':0, 'sells':0})
    for t in trades:
        day = t['created_at'][:10]
        per_day[day]['count'] += 1
        if t.get('realized_pnl') is not None:
            per_day[day]['pnl'].append(float(t['realized_pnl']))
        if t['side'] == 'buy':
            per_day[day]['buys'] += 1
        else:
            per_day[day]['sells'] += 1
    
    print(f"\n=== DAGLIG TREND ===")
    for day in sorted(per_day):
        d = per_day[day]
        pnl_sum = sum(d['pnl']) if d['pnl'] else 0
        pnl_n = len(d['pnl'])
        print(f"  {day}: {d['count']} handler ({d['buys']} kjøp, {d['sells']} salg), PnL={pnl_sum:.2f} ({pnl_n} lukkede posisjoner)")
    
    # Tids-siden-siste-trade
    latest = trades[-1]['created_at']
    latest_dt = datetime.fromisoformat(latest.replace('Z','+00:00'))
    now = datetime.now(timezone.utc)
    gap = now - latest_dt
    print(f"\nSiste trade: {latest} ({gap.total_seconds()/60:.0f} min siden)")
    if gap > timedelta(hours=2):
        print("⚠️ ADVARSEL: Stille handler >2 timer!")
    else:
        print("✅ Handler aktiv innen 2 timer.")

# 2. Aktive paper-sesjoner
sessions = fetch('/trading_sessions', {
    'select': 'id,mode,status,last_heartbeat,started_at,user_id',
    'mode': 'eq.paper',
    'status': 'eq.active'
})

print(f"\n=== AKTIVE PAPER-SESJONER ===")
print(f"Antall: {len(sessions)}")
now = datetime.now(timezone.utc)
max_gap = timedelta(0)
stale = 0
for s in sessions:
    hb = s.get('last_heartbeat')
    if hb:
        hb_dt = datetime.fromisoformat(hb.replace('Z','+00:00'))
        gap = now - hb_dt
        if gap > max_gap:
            max_gap = gap
        if gap > timedelta(minutes=10):
            stale += 1
            print(f"  ⚠️ STALE: {s['id'][:8]} heartbeat {gap.total_seconds()/60:.0f} min gammel")
    else:
        stale += 1
        print(f"  ⚠️ STALE: {s['id'][:8]} mangler heartbeat")

if not sessions:
    print("⚠️ ADVARSEL: Ingen aktive paper-sesjoner!")
elif stale == 0:
    print(f"✅ Alle {len(sessions)} sesjoner har ferskt heartbeat (eldste = {max_gap.total_seconds()/60:.0f} min)")
else:
    print(f"⚠️ {stale}/{len(sessions)} sesjoner er stale (>{max_gap.total_seconds()/60:.0f} min)")

# 3. Nye sesjoner siste 24t
since = (now - timedelta(hours=24)).isoformat()
new_sessions = fetch('/trading_sessions', {
    'select': 'id,created_at',
    'created_at': f'gt.{since}'
})
print(f"\n=== NYE SESJONER SISTE 24T ===")
print(f"Antall: {len(new_sessions)}")
if len(new_sessions) > 5:
    print("⚠️ ADVARSEL: Høyt antall nye sesjoner — kan tyde på at ensure_active_sessions gjenoppretter unødvendig")
else:
    print("✅ Normalt lavt nivå")

# 4. Trades siste 24t
recent_trades = fetch('/trades', {
    'select': 'created_at,realized_pnl,trading_pair,side',
    'created_at': f'gt.{since}'
})
print(f"\n=== TRADER SISTE 24T ===")
print(f"Antall: {len(recent_trades)}")

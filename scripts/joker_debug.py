#!/usr/bin/env python3
import json, os, urllib.request, urllib.parse
from datetime import datetime, timezone, timedelta

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Accept': 'application/json'}

def fetch(path, params=None):
    url = f"{SUPABASE_URL}/rest/v1{path}"
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
        return json.loads(body) if body else []

# Alle paper-sesjoner (ikke bare aktive)
all_sessions = fetch('/trading_sessions', {'select': 'id,status,last_heartbeat,started_at,created_at,user_id','mode':'eq.paper','limit':1000,'order':'created_at.desc'})
print(f"Totale paper-sesjoner: {len(all_sessions)}")
status_counts = {}
user_counts = {}
for s in all_sessions:
    status_counts[s['status']] = status_counts.get(s['status'], 0) + 1
    uid = s['user_id']
    user_counts[uid] = user_counts.get(uid, 0) + 1

print(f"Status-fordeling: {status_counts}")
print(f"Unike brukere: {len(user_counts)}")
top_users = sorted(user_counts.items(), key=lambda x: -x[1])[:5]
for uid, cnt in top_users:
    print(f"  {uid[:8]}: {cnt} sesjoner")

# Ferskeste 10 sesjoner
print("\nFerskeste 10 paper-sesjoner:")
for s in all_sessions[:10]:
    print(f"  {s['id'][:8]} | {s['status']} | created={s['created_at']} | heartbeat={s.get('last_heartbeat','N/A')}")

# Eldste aktive heartbeat
active = [s for s in all_sessions if s['status'] == 'active']
if active:
    hb_times = [datetime.fromisoformat(s['last_heartbeat'].replace('Z','+00:00')) for s in active if s.get('last_heartbeat')]
    if hb_times:
        oldest = min(hb_times)
        newest = max(hb_times)
        print(f"\nAktive heartbeats: eldste={oldest.isoformat()}, nyeste={newest.isoformat()}")

# Se etter trades etter kl 12
post_12 = fetch('/trades', {'select':'*','created_at':'gt.2026-07-30T12:00:00Z','limit':100})
print(f"\nTrader etter 12:00 UTC: {len(post_12)}")

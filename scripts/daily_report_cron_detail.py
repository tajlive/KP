#!/usr/bin/env python3
import json, os, urllib.request
from pathlib import Path
from collections import Counter

env_path = Path('/Users/taj/klarpakke/.env.local')
for line in env_path.read_text().splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        key, val = line.split('=', 1)
        os.environ.setdefault(key, val.strip().strip('"').strip("'"))

URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']

def get(path, params=""):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}?{params}", headers={
        "apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

# Hent siste 200 cron_health_events for å se error_detail-mønster
evts = get("cron_health_events", "select=detected_at,status_code,error_detail&order=detected_at.desc&limit=200")
print(f"Siste {len(evts)} hendelser:")
errors = Counter(str(e.get('error_detail','null'))[:80] for e in evts)
print("\nTop 10 error_detail:")
for detail, count in errors.most_common(10):
    print(f"  {count:3d} | {detail}")

sc = Counter(e.get('status_code') for e in evts)
print("\nStatus-koder:")
for code, count in sc.most_common():
    print(f"  {count:3d} | {code}")

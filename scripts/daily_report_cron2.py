#!/usr/bin/env python3
import json, os, urllib.request
from pathlib import Path
from collections import defaultdict

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

print("=== CRON_HEALTH_EVENTS (siste 24t, kolonne=created) ===")
evts = get("cron_health_events", "select=status_code,job_name,created,error_message&created=gt.2026-07-31T08:17:00Z&order=created.desc")
print(f"Antall: {len(evts)}")
if evts:
    by_sc = defaultdict(int)
    by_job = defaultdict(int)
    for e in evts:
        by_sc[e.get('status_code','null')] += 1
        by_job[e.get('job_name','unknown')] += 1
    print("Per status:", dict(by_sc))
    print("Per job:", dict(by_job))
    print("Siste 5:")
    for e in evts[:5]:
        print(f"  {e['created']} | {e.get('status_code')} | {e.get('job_name')} | {str(e.get('error_message',''))[:80]}")

print("\n=== GUARD_LOG (siste 24t, kolonne=checked_at) ===")
guard = get("pilot_guard_log", "select=checked_at,event_type,details&checked_at=gt.2026-07-31T08:17:00Z&order=checked_at.desc")
print(f"Antall: {len(guard)}")
for g in guard[:10]:
    print(f"  {g['checked_at']} | {g.get('event_type')} | {str(g.get('details',''))[:100]}")

print("\n=== KILL SWITCH STATUS ===")
try:
    ks = get("pilot_guard_log", "select=*&limit=1")
    print(json.dumps(ks, indent=2, default=str))
except Exception as e:
    print(f"Ingen kill switch-tabell: {e}")

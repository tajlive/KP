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

# cron_health_events siste 24t (bruk detected_at som ferskhet)
cutoff = "2026-07-31T08:17:00Z"
evts = get("cron_health_events", f"select=detected_at,status_code,job_name,error_detail,timed_out&detected_at=gt.{cutoff}&order=detected_at.desc")
print(f"=== CRON_HEALTH_EVENTS siste 24t: {len(evts)} hendelser ===")
if evts:
    by_sc = defaultdict(int)
    by_job = defaultdict(int)
    for e in evts:
        sc = e.get('status_code')
        if sc is None:
            sc = 'timeout' if e.get('timed_out') else 'null'
        by_sc[sc] += 1
        by_job[e.get('job_name','unknown')] += 1
    print("Per status_code:", dict(by_sc))
    print("Per job_name:", dict(by_job))
    # Sjekk for ALARM: nye hendelser etter 2026-07-30 15:20 UTC
    post_fix = [e for e in evts if e['detected_at'] > '2026-07-30T15:20:00Z']
    print(f"Hendelser ETTER 2026-07-30 15:20 UTC (post-fiks): {len(post_fix)}")
    for e in post_fix[:5]:
        print(f"  ALARM {e['detected_at']} | status={e.get('status_code')} | job={e.get('job_name')} | {str(e.get('error_detail',''))[:60]}")
else:
    print("Ingen hendelser siste 24t. OK.")

# jokertrade_guard_log siste 24t
guard = get("jokertrade_guard_log", f"select=checked_at,issue_type,severity,details,action_taken&checked_at=gt.{cutoff}&order=checked_at.desc")
print(f"\n=== GUARD_LOG siste 24t: {len(guard)} hendelser ===")
for g in guard[:10]:
    print(f"  {g['checked_at']} | {g.get('severity')} | {g.get('issue_type')} | {g.get('action_taken')} | {str(g.get('details',''))[:80]}")

# Kill switch
try:
    ks = get("jokertrade_kill_switch", "select=*&limit=1")
    print(f"\n=== KILL SWITCH ===")
    print(json.dumps(ks, indent=2, default=str))
except Exception as e:
    print(f"\nKill switch-tabell finnes ikke: {e}")

#!/usr/bin/env python3
"""Hent cron-helse og andre data via Supabase REST API."""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path
from collections import defaultdict

env_path = Path('/Users/taj/klarpakke/.env.local')
for line in env_path.read_text().splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        key, val = line.split('=', 1)
        os.environ.setdefault(key, val.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']

def rest_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SRK,
        "Authorization": f"Bearer {SRK}",
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"error": f"HTTP {e.code}: {body}"}

print("=== CRON_HEALTH_EVENTS (siste 24t) ===")
# Hent alle siste 24t
cutoff = "2026-07-31T08:17:00Z"
cron_events = rest_get("cron_health_events", f"select=status_code,job_name,created_at,error_message&created_at=gt.{cutoff}&order=created_at.desc")
if isinstance(cron_events, list):
    print(f"Antall hendelser siste 24t: {len(cron_events)}")
    by_status = defaultdict(int)
    by_job = defaultdict(int)
    for ev in cron_events:
        sc = ev.get('status_code', 'null')
        by_status[sc] += 1
        by_job[ev.get('job_name', 'unknown')] += 1
    print("Per status_code:", dict(by_status))
    print("Per job_name:", dict(by_job))
    if cron_events:
        print("Siste 10 hendelser:")
        for ev in cron_events[:10]:
            print(f"  {ev['created_at']} | {ev.get('status_code')} | {ev.get('job_name')} | {str(ev.get('error_message',''))[:80]}")
else:
    print(cron_events)

print("\n=== JOKERTRADE_GUARD_LOG (siste 24t) ===")
guard = rest_get("jokertrade_guard_log", f"select=created_at,event_type,details&created_at=gt.{cutoff}&order=created_at.desc")
if isinstance(guard, list):
    print(f"Guard-hendelser siste 24t: {len(guard)}")
    for g in guard[:10]:
        print(f"  {g['created_at']} | {g.get('event_type')} | {str(g.get('details',''))[:100]}")
else:
    print(guard)

print("\n=== JOKERTRADE MONITOR VIEW ===")
monitor = rest_get("jokertrade_monitor", "select=*&limit=5")
print(json.dumps(monitor, indent=2, default=str) if not isinstance(monitor, dict) or 'error' not in monitor else monitor)

print("\n=== CRON STATUS (jokertrade-relaterte) ===")
# Prøv å hente fra cron.job — dette er i extensions-schema, kanskje ikke tilgjengelig via REST
cron_jobs = rest_get("cron_health_events", "select=status_code&limit=0")
print("cron_health_events tilgjengelig:", "Ja" if not isinstance(cron_jobs, dict) or 'error' not in cron_jobs else "Nei")

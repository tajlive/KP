#!/usr/bin/env python3
import os, requests, json
from datetime import datetime, timedelta, timezone

SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']
URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
MGMT = os.environ['SUPABASE_ACCESS_TOKEN']
REF = os.environ.get('SUPABASE_PROJECT_REF', 'pskhryjzkobytnfwucrb')

HEAD = {'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json'}

def rest_get(path, params=None):
    r = requests.get(f"{URL}/rest/v1/{path}", headers=HEAD, params=params)
    return r.json()

def mgmt_query(sql):
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

print("=== pilot_guard_log siste 24t ===")
rows = rest_get("pilot_guard_log", {"created_at": f"gte.{since}", "select": "*", "order": "created_at.desc", "limit": "20"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== system_flags ===")
rows = rest_get("system_flags", {"select": "*"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== detect_crashed_sessions siste kjøring ===")
res = mgmt_query("SELECT MAX(start_time) as last_run FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%crash%')")
print(json.dumps(res, indent=2, default=str))

print("\n=== Alle cron-jobbnavn ===")
res = mgmt_query("SELECT jobname, schedule, active FROM cron.job ORDER BY jobname")
print(json.dumps(res, indent=2, default=str))

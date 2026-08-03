#!/usr/bin/env python3
import json, os, requests
from pathlib import Path

env_path = Path(__file__).parent.parent / '.env.local'
for line in env_path.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    if '=' in line:
        key, val = line.split('=', 1)
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        os.environ.setdefault(key, val)

MGMT_TOKEN = os.environ['SUPABASE_ACCESS_TOKEN']
PROJECT_REF = os.environ['SUPABASE_PROJECT_REF']

def mgmt_query(sql):
    url = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'
    resp = requests.post(url, headers={
        'Authorization': f'Bearer {MGMT_TOKEN}',
        'Content-Type': 'application/json',
    }, json={'query': sql})
    if resp.status_code in (200, 201):
        return resp.json(), None
    return None, f"HTTP {resp.status_code}: {resp.text[:500]}"

# 1. cron_health_events columns
print("=== CRON_HEALTH_EVENTS COLUMNS ===")
sql = """
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cron_health_events'
ORDER BY ordinal_position
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 2. cron job_run_details for key jobs via command LIKE
print("\n=== KEY CRON RUNS (last 24h) ===")
sql = """
SELECT jobid, command, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE (
    command LIKE '%tick%' 
    OR command LIKE '%smart-trader%' 
    OR command LIKE '%health-collector%'
    OR command LIKE '%binance-sync%'
    OR command LIKE '%sync-prices%'
    OR command LIKE '%session_maintenance%'
)
  AND start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 30
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 3. cron_health_events summary by status code (correct column)
print("\n=== CRON HEALTH EVENTS SUMMARY ===")
sql = """
SELECT status_code, job_name, count(*) as antall
FROM cron_health_events
WHERE created > now() - interval '24 hours'
GROUP BY status_code, job_name
ORDER BY antall DESC
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 4. jokertrade_monitor full
print("\n=== JOKERTRADE MONITOR ===")
sql = "SELECT * FROM jokertrade_monitor LIMIT 5"
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 5. Check smart_trader_enabled status across sessions
print("\n=== SMART TRADER ENABLED STATUS ===")
sql = """
SELECT 
  smart_trader_enabled,
  COUNT(*) as cnt
FROM trading_sessions
WHERE status = 'active' AND mode = 'paper'
GROUP BY smart_trader_enabled
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 6. Check jokertrade_health_guard or similar
print("\n=== CHECK GUARD FUNCTIONS ===")
sql = """
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%joker%'
ORDER BY routine_name
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 7. Latest cron_health_events detail (correct columns)
print("\n=== LATEST CRON HEALTH EVENTS DETAIL ===")
sql = """
SELECT created, status_code, job_name, response_body
FROM cron_health_events
WHERE (status_code != 200 OR status_code IS NULL)
  AND created > now() - interval '24 hours'
ORDER BY created DESC
LIMIT 5
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

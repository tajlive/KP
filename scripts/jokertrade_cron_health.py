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

# 1. Key cron jobs - try different column names
print("=== KEY CRON JOBS (job_run_details) ===")
sql2 = """
SELECT jobid, jobname, start_time, status
FROM cron.job_run_details
WHERE jobname IN ('cron-health-collector', 'klarpakke-trading-tick', 'smart-trader-v3')
  AND start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 30
"""
data, err = mgmt_query(sql2)
if err:
    print(f"ERROR: {err}")
    # Try alternative schema
    sql2b = """
SELECT * FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 5
"""
    data, err = mgmt_query(sql2b)
    if data:
        print("Columns:", list(data[0].keys()) if data else "none")
        print(json.dumps(data, indent=2, default=str))
else:
    print(json.dumps(data, indent=2, default=str))

# 2. Check if jokertrade_guard_log exists
print("\n=== CHECK TABLES ===")
sql_t = """
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%joker%'
ORDER BY table_name
"""
data, err = mgmt_query(sql_t)
if err:
    print(f"ERROR: {err}")
else:
    print(json.dumps(data, indent=2, default=str))

# 3. Kill switch global status
print("\n=== GLOBAL KILL SWITCH ===")
sql_k = """
SELECT is_active, triggered_at, reason, resolved_at, resolved_by
FROM jokertrade_kill_switch
ORDER BY triggered_at DESC
LIMIT 1
"""
data, err = mgmt_query(sql_k)
if err:
    print(f"ERROR: {err}")
else:
    print(json.dumps(data, indent=2, default=str))

# 4. Latest cron health events detail
print("\n=== LATEST CRON HEALTH EVENTS (non-200) ===")
sql_e = """
SELECT created, status_code, job_name, url, response_body
FROM cron_health_events
WHERE status_code != 200 OR status_code IS NULL
  AND created > now() - interval '24 hours'
ORDER BY created DESC
LIMIT 10
"""
data, err = mgmt_query(sql_e)
if err:
    print(f"ERROR: {err}")
else:
    print(json.dumps(data, indent=2, default=str))

# 5. Open positions count (has_position true, no exit)
print("\n=== OPEN POSITIONS ===")
sql_p = """
SELECT 
  trading_pair,
  COUNT(*) as open_count,
  ROUND(AVG(total_value)::numeric, 2) as avg_value
FROM trades
WHERE created_at > '2026-07-30T11:00:00Z'
  AND status = 'filled'
  AND realized_pnl IS NULL
GROUP BY trading_pair
ORDER BY open_count DESC
"""
data, err = mgmt_query(sql_p)
if err:
    print(f"ERROR: {err}")
else:
    print(json.dumps(data, indent=2, default=str))

# 6. Session wave check - distinct users with new sessions
print("\n=== SESSION WAVE CHECK ===")
sql_s = """
SELECT COUNT(DISTINCT user_id) as distinct_users, COUNT(*) as total_sessions
FROM trading_sessions
WHERE created_at > now() - interval '24 hours'
"""
data, err = mgmt_query(sql_s)
if err:
    print(f"ERROR: {err}")
else:
    print(json.dumps(data, indent=2, default=str))

# 7. Paper accounts health
print("\n=== PAPER ACCOUNTS SAMPLE ===")
sql_a = """
SELECT 
  COUNT(*) as total_accounts,
  COUNT(*) FILTER (WHERE current_balance <= 0) as zero_or_negative,
  ROUND(AVG(current_balance)::numeric, 2) as avg_balance,
  ROUND(MIN(current_balance)::numeric, 2) as min_balance,
  ROUND(MAX(current_balance)::numeric, 2) as max_balance
FROM paper_accounts
"""
data, err = mgmt_query(sql_a)
if err:
    print(f"ERROR: {err}")
else:
    print(json.dumps(data, indent=2, default=str))

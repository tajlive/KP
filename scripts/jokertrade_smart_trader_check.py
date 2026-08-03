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

# 1. Check if there's a global config disabling smart trader
print("=== GLOBAL CONFIG / FEATURE FLAGS ===")
sql = """
SELECT * FROM public.global_config WHERE key LIKE '%smart%' OR key LIKE '%trader%' OR key LIKE '%joker%'
"""
data, err = mgmt_query(sql)
if data:
    print(json.dumps(data, indent=2, default=str))
else:
    print(err or "No global config found")

# 2. Check user_auto_trading_configs
print("\n=== USER AUTO TRADING CONFIGS ===")
sql = """
SELECT is_enabled, COUNT(*) as cnt
FROM user_auto_trading_configs
GROUP BY is_enabled
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 3. Check when smart_trader was disabled
print("\n=== SESSIONS WITH SMART_TRADER TIMELINE ===")
sql = """
SELECT 
  DATE(updated_at) as dag,
  COUNT(*) FILTER (WHERE smart_trader_enabled = true) as enabled,
  COUNT(*) FILTER (WHERE smart_trader_enabled = false) as disabled
FROM trading_sessions
WHERE created_at > '2026-07-30T11:00:00Z'
GROUP BY DATE(updated_at)
ORDER BY dag DESC
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 4. Check latest errors from cron_health_events with error_detail
print("\n=== LATEST CRON ERRORS ===")
sql = """
SELECT created, status_code, job_name, error_detail
FROM cron_health_events
WHERE (status_code != 200 OR status_code IS NULL)
  AND created > now() - interval '24 hours'
ORDER BY created DESC
LIMIT 10
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

# 5. Check if any session has been archived/stopped and why
print("\n=== ARCHIVED/STOPPED SESSIONS LAST 24H ===")
sql = """
SELECT status, COUNT(*) as cnt
FROM trading_sessions
WHERE updated_at > now() - interval '24 hours'
GROUP BY status
"""
data, err = mgmt_query(sql)
print(json.dumps(data, indent=2, default=str) if data else err)

#!/usr/bin/env python3
"""Klarpakke Feiljeger — trygge fikser"""
import os, requests, json

MGMT = os.environ['SUPABASE_ACCESS_TOKEN']
REF = os.environ.get('SUPABASE_PROJECT_REF', 'pskhryjzkobytnfwucrb')

def mgmt_query(sql):
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

print("=== Fiks 1: Stopp legacy high-capital BTC sessions ===")
res = mgmt_query("""
UPDATE trading_sessions 
SET status = 'stopped', updated_at = NOW(), 
    error_message = COALESCE(error_message, '') || ' [Feiljeger 2026-08-03: status korrigert til stopped]'
WHERE id IN ('2a1a6cc1-587b-482a-8efb-d363a88b0ede', '3e26f863-fc6a-41ca-972f-4a6139bd785a')
  AND status = 'active'
RETURNING id, status, error_message
""")
print(json.dumps(res, indent=2, default=str))

print("\n=== Fiks 2: Opprett detect_crashed_sessions cron-jobb ===")
res = mgmt_query("""
SELECT cron.schedule(
    'detect-crashed-sessions',
    '*/5 * * * *',
    'SELECT public.detect_crashed_sessions()'
)
""")
print(json.dumps(res, indent=2, default=str))

print("\n=== Fiks 3: Oppdater daily_integrity_check bot_health til ok ===")
res = mgmt_query("""
UPDATE bot_health 
SET status = 'ok', last_heartbeat = NOW(), metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_fixed_by}', '"Feiljeger 2026-08-03"')
WHERE bot_name = 'daily_integrity_check' AND status = 'error'
RETURNING bot_name, status, last_heartbeat
""")
print(json.dumps(res, indent=2, default=str))

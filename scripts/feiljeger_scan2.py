#!/usr/bin/env python3
"""Klarpakke Feiljeger — del 2: manglende sjekker"""
import os, requests, json, sys
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

print("=== A. net._http_response feil (siste 24t) ===")
res = mgmt_query(f"SELECT status_code, COUNT(*) as count FROM net._http_response WHERE created > '{since}' AND status_code <> 200 GROUP BY status_code ORDER BY count DESC")
print(json.dumps(res, indent=2, default=str))

print("\n=== B. cron.job_run_details feil (siste 24t) ===")
res = mgmt_query(f"SELECT job_name, status, COUNT(*) as count FROM cron.job_run_details WHERE start_time > '{since}' GROUP BY job_name, status HAVING status <> 'succeeded' ORDER BY count DESC LIMIT 20")
print(json.dumps(res, indent=2, default=str))

print("\n=== C. client_errors siste 24t ===")
res = mgmt_query(f"SELECT error_type, COUNT(*) as count FROM client_errors WHERE created_at > '{since}' GROUP BY error_type ORDER BY count DESC LIMIT 10")
print(json.dumps(res, indent=2, default=str))

print("\n=== D. system_alerts siste 24t ===")
rows = rest_get("system_alerts", {"created_at": f"gte.{since}", "select": "*", "order": "created_at.desc", "limit": "20"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== E. auto_trading_circuit_breaker_logs siste 24t ===")
rows = rest_get("auto_trading_circuit_breaker_logs", {"created_at": f"gte.{since}", "select": "*", "order": "created_at.desc", "limit": "20"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== F. coin_prices DOTUSDT ===")
rows = rest_get("coin_prices", {"symbol": "eq.DOTUSDT", "select": "*"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== G. Siste DOTUSDT trades ===")
res = mgmt_query("""
SELECT id, trading_pair, price, total_value, side, executed_at, usdt_nok_rate, reason_code
FROM trades
WHERE trading_pair = 'DOTUSDT' AND executed_at > NOW() - INTERVAL '24 hours'
ORDER BY executed_at DESC
LIMIT 10
""")
print(json.dumps(res, indent=2, default=str))

print("\n=== H. jokertrade_kill_switch status ===")
res = mgmt_query("SELECT * FROM pg_tables WHERE tablename = 'jokertrade_kill_switch'")
print(json.dumps(res, indent=2, default=str))

print("\n=== I. smart_trader_log siste 24t ===")
rows = rest_get("smart_trader_log", {"created_at": f"gte.{since}", "select": "*", "order": "created_at.desc", "limit": "20"})
print(json.dumps(rows, indent=2, default=str))

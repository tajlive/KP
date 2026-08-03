#!/usr/bin/env python3
"""Klarpakke Feiljeger — systematisk skanning"""
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
    # Supabase Management API database/query expects JSON with "query" field
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}
    # Supabase Management API database/query expects application/sql or plain text
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/sql'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, data=sql)
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

print("=== 1. cron_health_events (siste 24t) ===")
rows = rest_get("cron_health_events", {"detected_at": f"gte.{since}", "select": "*", "order": "detected_at.desc"})
print(json.dumps(rows[:10], indent=2, default=str))
print(f"Totalt: {len(rows)} hendelser")

print("\n=== 2. net._http_response feil (siste 24t) ===")
res = mgmt_query(f"SELECT status_code, COUNT(*) as count FROM net._http_response WHERE created_at > '{since}' AND status_code <> 200 GROUP BY status_code ORDER BY count DESC")
print(json.dumps(res, indent=2, default=str))

print("\n=== 3. cron.job_run_details feil (siste 24t) ===")
res = mgmt_query(f"SELECT jobname, status, COUNT(*) as count FROM cron.job_run_details WHERE start_time > '{since}' GROUP BY jobname, status HAVING status <> 'succeeded' ORDER BY count DESC")
print(json.dumps(res, indent=2, default=str))

print("\n=== 4. bot_health ===")
rows = rest_get("bot_health", {"select": "*", "order": "last_heartbeat.desc"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== 5. trading_sessions feil/stall ===")
rows = rest_get("trading_sessions", {"or": f"(error_message.not.is.null,status.eq.crashed,updated_at.lt.{since})", "select": "id,status,error_message,updated_at,created_at,mode,archived", "order": "updated_at.desc"})
print(json.dumps(rows[:20], indent=2, default=str))

print("\n=== 6. trades status-fordeling siste 24t ===")
res = mgmt_query(f"SELECT status, COUNT(*) as count FROM trades WHERE executed_at > '{since}' GROUP BY status ORDER BY count DESC")
print(json.dumps(res, indent=2, default=str))

print("\n=== 7. trades med avvikende priser (>20% fra coin_prices) ===")
res = mgmt_query("""
SELECT t.id, t.trading_pair, t.price, t.executed_at, cp.price as market_price,
       ABS(t.price - cp.price) / NULLIF(cp.price,0) as deviation
FROM trades t
LEFT JOIN coin_prices cp ON cp.symbol = t.trading_pair
WHERE t.executed_at > NOW() - INTERVAL '24 hours'
  AND cp.price IS NOT NULL
  AND ABS(t.price - cp.price) / NULLIF(cp.price,0) > 0.20
ORDER BY deviation DESC
LIMIT 20
""")
print(json.dumps(res, indent=2, default=str))

print("\n=== 8. error/alert/log tabeller ===")
res = mgmt_query("""
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND (table_name ILIKE '%error%' OR table_name ILIKE '%alert%' OR table_name ILIKE '%log%')
ORDER BY table_name
""")
print(json.dumps(res, indent=2, default=str))

print("\n=== 9. jokertrade_guard_log siste 24t ===")
res = mgmt_query(f"SELECT * FROM jokertrade_guard_log WHERE detected_at > '{since}' ORDER BY detected_at DESC LIMIT 20")
print(json.dumps(res, indent=2, default=str))

print("\n=== 10. jokertrade_monitor ===")
res = mgmt_query("SELECT * FROM jokertrade_monitor LIMIT 20")
print(json.dumps(res, indent=2, default=str))

print("\n=== 11. Aktive paper-sesjoner uten nylig heartbeat ===")
res = mgmt_query("""
SELECT id, status, updated_at, mode, error_message
FROM trading_sessions
WHERE status = 'active' AND mode = 'paper' AND updated_at < NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 20
""")
print(json.dumps(res, indent=2, default=str))

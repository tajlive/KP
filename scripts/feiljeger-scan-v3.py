#!/usr/bin/env python3
import os, sys, json
from datetime import datetime, timezone, timedelta

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local")
url = None
with open(env_path) as f:
    for line in f:
        if line.startswith("POSTGRES_URL_NON_POOLING="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

import psycopg2
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

def run(title, sql):
    print(f"\n{'='*60}")
    print(title)
    print('='*60)
    try:
        cur.execute(sql)
        if cur.description is None:
            print("  OK (ingen resultat)")
            return
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        if not rows:
            print("  Ingen rader funnet.")
        else:
            for row in rows[:25]:
                d = dict(zip(cols, row))
                parts = []
                for k, v in d.items():
                    if v is None:
                        continue
                    if isinstance(v, (int, float)):
                        parts.append(f"{k}={v:.4f}" if isinstance(v, float) else f"{k}={v}")
                    elif isinstance(v, str) and len(v) > 100:
                        parts.append(f"{k}={v[:100]}...")
                    else:
                        parts.append(f"{k}={v}")
                print("  " + " | ".join(parts[:8]))
            if len(rows) > 25:
                print(f"  ... og {len(rows)-25} til")
    except Exception as e:
        print(f"  FEIL: {e}")

# Kolonne-sjekk for viktige tabeller
print("KOLONNER:")
for tbl in ['trades', 'trading_sessions', 'bot_health', 'coin_prices', 'user_auto_trading_configs']:
    cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{tbl}' ORDER BY ordinal_position;")
    print(f"\n  {tbl}:")
    for row in cur.fetchall():
        print(f"    {row[0]} ({row[1]})")

# cron.job_run_details kolonner
print("\n  cron.job_run_details:")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'cron' AND table_name = 'job_run_details' ORDER BY ordinal_position;")
for row in cur.fetchall():
    print(f"    {row[0]} ({row[1]})")

# Sjekk session_status enum
print("\n  session_status enum verdier:")
try:
    cur.execute("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'session_status'::regtype ORDER BY enumsortorder;")
    for row in cur.fetchall():
        print(f"    {row[0]}")
except Exception as e:
    print(f"    FEIL: {e}")

# 1. cron feil siste 24t (riktig kolonne)
run("1. CRON.JOB_RUN_DETAILS feil siste 24t", """
SELECT jobid, job_name, status, start_time, end_time, return_message
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
  AND status NOT IN ('succeeded', 'running')
ORDER BY start_time DESC
LIMIT 50;
""")

# 2. Bot health (riktig kolonne)
run("2. BOT_HEALTH", """
SELECT bot_name, status, last_heartbeat, error_count, error_message
FROM bot_health
ORDER BY last_heartbeat DESC NULLS LAST;
""")

# 3. Trading sessions stale
run("3. STALE AKTIVE SESJONER (>10 min)", """
SELECT id, user_id, status, mode, started_at, updated_at,
       EXTRACT(EPOCH FROM (now() - updated_at))/60 as stale_minutes
FROM trading_sessions
WHERE status = 'active'
  AND updated_at < now() - interval '10 minutes'
ORDER BY updated_at DESC
LIMIT 30;
""")

# 4. Siste trades med riktige kolonner
run("4. SISTE TRADES", """
SELECT id, coin_symbol, side, status, price, created_at
FROM trades
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 5. Open trades
run("5. OPEN TRADES", """
SELECT t.id, t.coin_symbol, t.side, t.price, t.status, t.created_at,
       cp.price as current_price,
       CASE WHEN t.price > 0 THEN (cp.price - t.price) / t.price * 100 ELSE NULL END as unrealized_pct
FROM trades t
LEFT JOIN coin_prices cp ON cp.symbol = t.coin_symbol
WHERE t.status NOT IN ('closed', 'completed', 'failed', 'rejected')
  AND t.created_at > now() - interval '7 days'
ORDER BY t.created_at DESC
LIMIT 30;
""")

# 6. coin_prices ferskhet
run("6. COIN_PRICES FERSKHET", """
SELECT symbol, price, created_at, now() - created_at as age
FROM coin_prices
ORDER BY created_at DESC
LIMIT 10;
""")

# 7. client_errors
run("7. CLIENT_ERRORS siste 24t", """
SELECT id, error_type, message, url, created_at
FROM client_errors
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 8. cron_execution_logs
run("8. CRON_EXECUTION_LOGS siste 24t", """
SELECT id, job_name, status, error_message, started_at, completed_at
FROM cron_execution_logs
WHERE started_at > now() - interval '24 hours'
ORDER BY started_at DESC
LIMIT 20;
""")

# 9. smart_trader_log
run("9. SMART_TRADER_LOG siste 24t", """
SELECT id, level, message, created_at
FROM smart_trader_log
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 10. emergency_logs
run("10. EMERGENCY_LOGS siste 24t", """
SELECT id, level, message, created_at
FROM emergency_logs
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 11. execution_logs
run("11. EXECUTION_LOGS siste 24t", """
SELECT id, level, message, metadata, created_at
FROM execution_logs
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 12. api_logs
run("12. API_LOGS siste 24t (ikke-200)", """
SELECT id, method, path, status_code, error_message, created_at
FROM api_logs
WHERE created_at > now() - interval '24 hours'
  AND (status_code >= 300 OR error_message IS NOT NULL)
ORDER BY created_at DESC
LIMIT 20;
""")

# 13. auto_trade_log
run("13. AUTO_TRADE_LOG siste 24t", """
SELECT id, action, status, error_message, created_at
FROM auto_trade_log
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 14. Sjekk vault for CRON_SECRET
run("14. VAULT SECRETS (kun navn, ikke verdier)", """
SELECT name, description, updated_at
FROM vault.decrypted_secrets
WHERE name ILIKE '%cron%' OR name ILIKE '%secret%'
ORDER BY name;
""")

# 15. Net._http_response detaljer for 401/503
run("15. NET._HTTP_RESPONSE 401/503 detaljer", """
SELECT status_code, content::text, timed_out, error_msg, created
FROM net._http_response
WHERE created > now() - interval '6 hours'
  AND (status_code = 401 OR status_code = 503)
ORDER BY created DESC
LIMIT 30;
""")

cur.close()
conn.close()
print("\n\nSKANNING FULLFORT")

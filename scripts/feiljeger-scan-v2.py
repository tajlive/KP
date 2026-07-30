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

if not url:
    print("Fant ikke POSTGRES_URL_NON_POOLING")
    sys.exit(1)

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
            for row in rows[:20]:
                d = dict(zip(cols, row))
                parts = []
                for k, v in d.items():
                    if v is None:
                        continue
                    if isinstance(v, (int, float)):
                        parts.append(f"{k}={v:.4f}" if isinstance(v, float) else f"{k}={v}")
                    elif isinstance(v, str) and len(v) > 80:
                        parts.append(f"{k}={v[:80]}...")
                    else:
                        parts.append(f"{k}={v}")
                print("  " + " | ".join(parts[:7]))
            if len(rows) > 20:
                print(f"  ... og {len(rows)-20} til")
    except Exception as e:
        print(f"  FEIL: {e}")

# 1. cron_health_events
run("1. CRON_HEALTH_EVENTS siste 24t (ikke-200 / timeout)", """
SELECT detected_at, job_name, status_code, timed_out, error_detail
FROM cron_health_events
WHERE detected_at > now() - interval '24 hours'
ORDER BY detected_at DESC
LIMIT 50;
""")

# 2. net._http_response
run("2. NET._HTTP_RESPONSE siste 24t (ikke-200)", """
SELECT status_code, timed_out, error_msg, created
FROM net._http_response
WHERE created > now() - interval '24 hours'
  AND (status_code IS NULL OR status_code >= 300)
ORDER BY created DESC
LIMIT 50;
""")

# 3. cron.job_run_details
run("3. CRON.JOB_RUN_DETAILS siste 24t (ikke succeeded/running)", """
SELECT jobid, jobname, status, start_time, end_time, return_message
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
  AND status NOT IN ('succeeded', 'running')
ORDER BY start_time DESC
LIMIT 50;
""")

# 4. bot_health
run("4. BOT_HEALTH status", """
SELECT bot_name, status, last_heartbeat, error_count, last_error_message
FROM bot_health
ORDER BY last_heartbeat DESC NULLS LAST;
""")

# 5. trading_sessions
run("5. TRADING_SESSIONS feil/crashed/stale", """
SELECT id, user_id, status, mode, started_at, updated_at, error_message,
       now() - updated_at as stale_age
FROM trading_sessions
WHERE (
    (error_message IS NOT NULL)
    OR (status = 'crashed')
    OR (status IN ('active','running') AND updated_at < now() - interval '10 minutes')
)
AND started_at > now() - interval '24 hours'
ORDER BY started_at DESC
LIMIT 50;
""")

# 6. trades
run("6. TRADES failed/rejected + prisavvik", """
SELECT t.id, t.symbol, t.status, t.side, t.price as trade_price, cp.price as market_price,
       ABS(t.price - cp.price) / NULLIF(cp.price, 0) * 100 as pct_diff,
       t.created_at
FROM trades t
LEFT JOIN coin_prices cp ON cp.symbol = t.symbol
WHERE t.created_at > now() - interval '24 hours'
  AND (t.status IN ('failed','rejected')
       OR (cp.price IS NOT NULL AND ABS(t.price - cp.price) / NULLIF(cp.price, 0) > 0.20))
ORDER BY t.created_at DESC
LIMIT 50;
""")

# 7. error/alert/log-tabeller
run("7. ERROR/ALERT/LOG-tabeller", """
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%error%' OR table_name ILIKE '%alert%' OR table_name ILIKE '%log%')
ORDER BY table_name;
""")

# 8. cron-jobber
run("8. Aktive cron-jobber", """
SELECT jobname, schedule, active FROM cron.job WHERE active = true ORDER BY jobname;
""")

# 9. balansekonsistens
run("9. Paper accounts balansekonsistens", """
SELECT pa.user_id, pa.current_balance as paper_balance, up.paper_balance as profile_balance,
       pa.current_balance - up.paper_balance as diff
FROM paper_accounts pa
JOIN user_profiles up ON up.user_id = pa.user_id
WHERE ABS(pa.current_balance - up.paper_balance) > 0.01;
""")

# 10. Siste trades
run("10. Siste trades (alle statuser)", """
SELECT id, symbol, side, status, price, created_at
FROM trades
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 11. Siste sesjoner
run("11. Siste sesjoner", """
SELECT id, user_id, status, mode, started_at, updated_at
FROM trading_sessions
WHERE started_at > now() - interval '24 hours'
ORDER BY started_at DESC
LIMIT 20;
""")

# 12. Open trades
run("12. Open trades (ikke lukket)", """
SELECT t.id, t.symbol, t.side, t.price, t.status, t.created_at,
       cp.price as current_price,
       CASE WHEN t.price > 0 THEN (cp.price - t.price) / t.price * 100 ELSE NULL END as unrealized_pct
FROM trades t
LEFT JOIN coin_prices cp ON cp.symbol = t.symbol
WHERE t.status NOT IN ('closed', 'completed', 'failed', 'rejected')
  AND t.created_at > now() - interval '7 days'
ORDER BY t.created_at DESC
LIMIT 30;
""")

# 13. Sesjonsaktivitet - aktive nå
run("13. Aktive sesjoner nå", """
SELECT id, user_id, status, mode, started_at, updated_at, now() - updated_at as age
FROM trading_sessions
WHERE status IN ('active', 'running')
ORDER BY updated_at DESC
LIMIT 20;
""")

# 14. coin_prices freshness
run("14. coin_prices ferskhet", """
SELECT symbol, price, updated_at, now() - updated_at as age
FROM coin_prices
ORDER BY updated_at DESC
LIMIT 10;
""")

# 15. user_auto_trading_configs
run("15. Auto-trading konfigurasjoner", """
SELECT user_id, is_enabled, mode, updated_at
FROM user_auto_trading_configs
WHERE is_enabled = true
ORDER BY updated_at DESC
LIMIT 20;
""")

cur.close()
conn.close()
print("\n\nSKANNING FULLFORT")

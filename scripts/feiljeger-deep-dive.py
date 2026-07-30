#!/usr/bin/env python3
import os, sys

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
            for row in rows[:30]:
                d = dict(zip(cols, row))
                parts = []
                for k, v in d.items():
                    if v is None:
                        continue
                    if isinstance(v, str) and len(v) > 300:
                        parts.append(f"{k}={v[:300]}...")
                    else:
                        parts.append(f"{k}={v}")
                print("  " + " | ".join(parts[:6]))
    except Exception as e:
        print(f"  FEIL: {e}")

# 1. Hent hele session_maintenance kode
run("1. SESSION_MAINTENANCE() full kode", """
SELECT pg_get_functiondef('session_maintenance'::regproc);
""")

# 2. Sjekk smart_trader_enabled på aktive sesjoner
run("2. AKTIVE SESJONER - smart_trader_enabled", """
SELECT id, user_id, status, smart_trader_enabled, updated_at, 
       EXTRACT(EPOCH FROM (now() - updated_at))/60 as stale_min
FROM trading_sessions
WHERE status = 'active'
ORDER BY updated_at DESC;
""")

# 3. Hvorfor smart-trader-v3 sier ingen aktive? Sjekk user_auto_trading_configs
run("3. USER_AUTO_TRADING_CONFIGS for aktive sesjoner", """
SELECT uatc.user_id, uatc.is_enabled, uatc.phase, uatc.last_trade_at,
       ts.id as session_id, ts.status, ts.smart_trader_enabled
FROM user_auto_trading_configs uatc
LEFT JOIN trading_sessions ts ON ts.user_id = uatc.user_id AND ts.status = 'active'
WHERE uatc.is_enabled = true
ORDER BY uatc.last_trade_at DESC NULLS LAST
LIMIT 20;
""")

# 4. Hva er trade_status verdier?
run("4. TRADE_STATUS enum", """
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'trade_status'::regtype ORDER BY enumsortorder;
""")

# 5. Siste smart_trader_log (alle tider)
run("5. SMART_TRADER_LOG (siste 20 uansett tid)", """
SELECT * FROM smart_trader_log ORDER BY created_at DESC LIMIT 20;
""")

# 6. Siste execution_logs (alle tider)
run("6. EXECUTION_LOGS (siste 20 uansett tid)", """
SELECT * FROM execution_logs ORDER BY created_at DESC LIMIT 20;
""")

# 7. Siste cron_execution_logs
run("7. CRON_EXECUTION_LOGS (siste 20)", """
SELECT * FROM cron_execution_logs ORDER BY executed_at DESC LIMIT 20;
""")

# 8. Sjekk coin_prices - hvorfor bare LINK er oppdatert?
run("8. COIN_PRICES - alle symboler og ferskhet", """
SELECT symbol, price, last_updated, created_at,
       now() - COALESCE(last_updated, created_at) as age
FROM coin_prices
ORDER BY COALESCE(last_updated, created_at) DESC;
""")

# 9. Hvilke Edge Functions ble kalt nylig (fra net._http_response) med 200
run("9. NET._HTTP_RESPONSE 200 nylig - URL-hint", """
SELECT status_code, LEFT(content::text, 150), created
FROM net._http_response
WHERE created > now() - interval '1 hour'
  AND status_code = 200
ORDER BY created DESC
LIMIT 15;
""")

cur.close()
conn.close()
print("\n\nSKANNING FULLFORT")

#!/usr/bin/env python3
import os, sys, json

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
                    if isinstance(v, str) and len(v) > 120:
                        parts.append(f"{k}={v[:120]}...")
                    else:
                        parts.append(f"{k}={v}")
                print("  " + " | ".join(parts[:7]))
    except Exception as e:
        print(f"  FEIL: {e}")

# 1. Hvilke cron-kall feiler med 401?
run("1. NET._HTTP_RESPONSE 401 - URL/destinasjoner", """
SELECT status_code, LEFT(content::text, 200), error_msg, created,
       -- Prøv å hente ut URL fra content hvis mulig
       CASE WHEN content::text LIKE '%url%' THEN 'har url' ELSE content::text END as hint
FROM net._http_response
WHERE created > now() - interval '24 hours'
  AND status_code = 401
ORDER BY created DESC
LIMIT 10;
""")

# 2. Hva er de faktiske kommandoene i cron som feiler?
run("2. CRON.JOB_RUN_DETAILS feil (riktig kolonner)", """
SELECT jobid, command, status, start_time, end_time, return_message
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
  AND status NOT IN ('succeeded', 'running')
ORDER BY start_time DESC
LIMIT 20;
""")

# 3. Trades med riktig kolonne
run("3. SISTE TRADES (riktig kolonne)", """
SELECT id, trading_pair, side, status, price, created_at
FROM trades
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
""")

# 4. Open trades
run("4. OPEN TRADES", """
SELECT t.id, t.trading_pair, t.side, t.price, t.status, t.created_at,
       cp.price as current_price,
       CASE WHEN t.price > 0 THEN (cp.price - t.price) / t.price * 100 ELSE NULL END as unrealized_pct
FROM trades t
LEFT JOIN coin_prices cp ON cp.symbol = t.trading_pair
WHERE t.status NOT IN ('closed', 'completed', 'failed', 'rejected')
  AND t.created_at > now() - interval '7 days'
ORDER BY t.created_at DESC
LIMIT 30;
""")

# 5. Bot health riktig
run("5. BOT_HEALTH", """
SELECT bot_name, status, last_heartbeat, error_count, last_error
FROM bot_health
ORDER BY last_heartbeat DESC NULLS LAST;
""")

# 6. Client errors riktig kolonner
run("6. CLIENT_ERRORS (sjekk kolonner først)", """
SELECT column_name FROM information_schema.columns WHERE table_name = 'client_errors' ORDER BY ordinal_position;
""")

# 7. Prøv client_errors med generisk select
run("7. CLIENT_ERRORS siste 24t", """
SELECT * FROM client_errors
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 10;
""")

# 8. cron_execution_logs kolonner
run("8. CRON_EXECUTION_LOGS kolonner", """
SELECT column_name FROM information_schema.columns WHERE table_name = 'cron_execution_logs' ORDER BY ordinal_position;
""")

# 9. Prøv execution_logs
run("9. EXECUTION_LOGS siste 24t", """
SELECT * FROM execution_logs
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 10;
""")

# 10. smart_trader_log
run("10. SMART_TRADER_LOG siste 24t", """
SELECT * FROM smart_trader_log
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 10;
""")

# 11. Hvilke coin_prices er ferske?
run("11. COIN_PRICES etter 2026-07-29", """
SELECT symbol, price, created_at, now() - created_at as age
FROM coin_prices
WHERE created_at > '2026-07-29'::timestamptz
ORDER BY created_at DESC;
""")

# 12. Sjekk om det finnes en sync-prices cron og når den sist kjørte
run("12. SYNC-PRICES CRON HISTORIKK", """
SELECT command, status, start_time, end_time, return_message
FROM cron.job_run_details
WHERE command ILIKE '%sync%price%'
  AND start_time > now() - interval '7 days'
ORDER BY start_time DESC
LIMIT 10;
""")

# 13. Hvilke Edge Functions kalles fra cron (url-mønster)
run("13. NET._HTTP_RESPONSE URL-mønster siste 6t", """
SELECT status_code, LEFT(content::text, 100), created
FROM net._http_response
WHERE created > now() - interval '6 hours'
  AND status_code IS NOT NULL
ORDER BY created DESC
LIMIT 30;
""")

# 14. Sjekk om CRON_SECRET stemmer overens
run("14. CRON_SECRET sammenligning (hash)", """
SELECT name, updated_at, LENGTH(decrypted_secret) as secret_len
FROM vault.decrypted_secrets
WHERE name = 'CRON_SECRET';
""")

cur.close()
conn.close()
print("\n\nSKANNING FULLFORT")

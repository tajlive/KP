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

print("="*60)
print("VERIFIKASJON: SmartTrader etter fix")
print("="*60)

# 1. Siste smart-trader-v3 cron-kjøring
cur.execute("""
SELECT start_time, status, return_message
FROM cron.job_run_details
WHERE command ILIKE '%smart-trader-v3%'
ORDER BY start_time DESC
LIMIT 3;
""")
print("\n  Siste smart-trader-v3 cron-kjøringer:")
for r in cur.fetchall():
    print(f"    {r[0]} | status={r[1]} | {str(r[2])[:80]}")

# 2. Siste net._http_response for smart-trader-v3
cur.execute("""
SELECT status_code, LEFT(content::text, 200), created
FROM net._http_response
WHERE created > now() - interval '30 minutes'
  AND content::text ILIKE '%smart%'
ORDER BY created DESC
LIMIT 5;
""")
print("\n  Siste net-responser med 'smart' i content:")
for r in cur.fetchall():
    print(f"    {r[2]} | status={r[0]} | {r[1][:120]}")

# 3. Siste net._http_response generelt (siste 10 min)
cur.execute("""
SELECT status_code, LEFT(content::text, 200), created
FROM net._http_response
WHERE created > now() - interval '10 minutes'
ORDER BY created DESC
LIMIT 10;
""")
print("\n  Siste net-responser siste 10 min:")
for r in cur.fetchall():
    print(f"    {r[2]} | status={r[0]} | {r[1][:100]}")

# 4. Aktive sesjoner med smart_trader_enabled nå
cur.execute("""
SELECT COUNT(*) 
FROM trading_sessions 
WHERE status = 'active' AND smart_trader_enabled = true;
""")
print(f"\n  Aktive sesjoner med smart_trader_enabled=true: {cur.fetchone()[0]}")

# 5. Siste trades etter fix-tidspunkt
cur.execute("""
SELECT id, trading_pair, side, status, price, created_at
FROM trades
WHERE created_at > '2026-07-30 17:30:00'::timestamptz
ORDER BY created_at DESC;
""")
rows = cur.fetchall()
print(f"\n  Trades etter 17:30: {len(rows)}")
for r in rows[:10]:
    print(f"    {r[5]} | {r[1]} | {r[2]} | {r[3]} | price={r[4]}")

conn.commit()
cur.close()
conn.close()

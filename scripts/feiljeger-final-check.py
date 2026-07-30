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
print("SISTE STATUS")
print("="*60)

# 1. Totale trades siste time
cur.execute("""
SELECT COUNT(*), 
       COUNT(*) FILTER (WHERE side = 'buy') as buys,
       COUNT(*) FILTER (WHERE side = 'sell') as sells
FROM trades
WHERE created_at > now() - interval '1 hour';
""")
r = cur.fetchone()
print(f"\n  Trades siste time: {r[0]} (buy={r[1]}, sell={r[2]})")

# 2. Siste 5 trades
cur.execute("""
SELECT trading_pair, side, status, price, created_at
FROM trades
ORDER BY created_at DESC
LIMIT 5;
""")
print(f"\n  Siste 5 trades:")
for r in cur.fetchall():
    print(f"    {r[4]} | {r[0]} | {r[1]} | {r[2]} | {r[3]}")

# 3. Sesjoner status
cur.execute("""
SELECT status, COUNT(*), 
       COUNT(*) FILTER (WHERE smart_trader_enabled = true) as smart_on
FROM trading_sessions
GROUP BY status;
""")
print(f"\n  Sesjoner etter status:")
for r in cur.fetchall():
    print(f"    {r[0]}: {r[1]} totalt, {r[2]} med smart_trader_enabled")

# 4. Siste smart-trader-v3 respons
cur.execute("""
SELECT status_code, LEFT(content::text, 150), created
FROM net._http_response
WHERE content::text ILIKE '%smart%'
ORDER BY created DESC
LIMIT 3;
""")
print(f"\n  Siste smart-trader net-responser:")
for r in cur.fetchall():
    print(f"    {r[2]} | status={r[0]} | {r[1][:120]}")

# 5. API-helse sjekk
import urllib.request
try:
    req = urllib.request.Request("https://www.klarpakke.no/api/health")
    with urllib.request.urlopen(req, timeout=10) as resp:
        health = resp.read().decode()
        print(f"\n  API-helse: {health[:200]}")
except Exception as e:
    print(f"\n  API-helse FEIL: {e}")

# 6. Sjekk om det er flere 401-feil nylig
cur.execute("""
SELECT COUNT(*) FROM net._http_response
WHERE created > now() - interval '1 hour'
  AND status_code = 401;
""")
print(f"\n  401-feil siste time: {cur.fetchone()[0]}")

# 7. Sjekk om det er flere 503-feil nylig
cur.execute("""
SELECT COUNT(*) FROM net._http_response
WHERE created > now() - interval '1 hour'
  AND status_code = 503;
""")
print(f"  503-feil siste time: {cur.fetchone()[0]}")

conn.commit()
cur.close()
conn.close()

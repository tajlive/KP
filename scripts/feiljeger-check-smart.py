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
print("SJEKK: smart_trader_enabled default og auto-trading configs")
print("="*60)

# 1. Sjekk kolonne-default
cur.execute("""
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'trading_sessions' AND column_name = 'smart_trader_enabled';
""")
for row in cur.fetchall():
    print(f"  trading_sessions.smart_trader_enabled: default={row[1]}, nullable={row[2]}")

# 2. Sjekk user_auto_trading_configs for aktive brukere
cur.execute("""
SELECT uatc.user_id, uatc.is_enabled, uatc.phase,
       ts.id as session_id, ts.smart_trader_enabled, ts.smart_trader_config
FROM user_auto_trading_configs uatc
JOIN trading_sessions ts ON ts.user_id = uatc.user_id AND ts.status = 'active'
WHERE uatc.is_enabled = true;
""")
rows = cur.fetchall()
print(f"\n  Aktive auto-trading brukere med aktive sesjoner: {len(rows)}")
for r in rows:
    print(f"    user={r[0][:8]}... | uatc_enabled={r[1]} | phase={r[2]} | session={r[3][:8]}... | smart_enabled={r[4]} | config={r[5]}")

# 3. Sjekk om smart_trader_config har noe verdifullt
cur.execute("""
SELECT smart_trader_config
FROM trading_sessions
WHERE status = 'active' AND smart_trader_enabled = false
LIMIT 1;
""")
row = cur.fetchone()
if row:
    print(f"\n  Eksempel smart_trader_config på aktiv men disabled sesjon: {row[0]}")

# 4. Teller aktive sesjoner per smart_trader_enabled
cur.execute("""
SELECT smart_trader_enabled, COUNT(*) 
FROM trading_sessions 
WHERE status = 'active' 
GROUP BY smart_trader_enabled;
""")
print(f"\n  Aktive sesjoner etter smart_trader_enabled:")
for r in cur.fetchall():
    print(f"    smart_trader_enabled={r[0]}: {r[1]} sesjoner")

# 5. Sjekk historikk - når ble smart_trader_enabled satt til false?
cur.execute("""
SELECT id, user_id, smart_trader_enabled, updated_at, started_at
FROM trading_sessions
WHERE status = 'active'
ORDER BY updated_at DESC;
""")
print(f"\n  Aktive sesjoner detaljer:")
for r in cur.fetchall():
    print(f"    {r[0][:8]}... | user={r[1][:8]}... | smart={r[2]} | updated={r[3]} | started={r[4]}")

cur.close()
conn.close()

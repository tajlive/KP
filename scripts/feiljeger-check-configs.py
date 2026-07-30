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
print("SJEKK: auto_trading_configs vs user_auto_trading_configs")
print("="*60)

# Sjekk om auto_trading_configs finnes
cur.execute("""
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'auto_trading_configs'
);
""")
exists_auto = cur.fetchone()[0]
print(f"\n  auto_trading_configs eksisterer: {exists_auto}")

if exists_auto:
    cur.execute("SELECT COUNT(*) FROM auto_trading_configs;")
    print(f"  Rader i auto_trading_configs: {cur.fetchone()[0]}")
    
    cur.execute("SELECT COUNT(*) FROM auto_trading_configs WHERE is_enabled = true;")
    print(f"  is_enabled=true i auto_trading_configs: {cur.fetchone()[0]}")
    
    cur.execute("SELECT user_id, is_enabled FROM auto_trading_configs WHERE is_enabled = true LIMIT 20;")
    print(f"\n  auto_trading_configs brukere med is_enabled=true:")
    for r in cur.fetchall():
        print(f"    {r[0][:8]}... | is_enabled={r[1]}")

# Sjekk user_auto_trading_configs
cur.execute("SELECT COUNT(*) FROM user_auto_trading_configs;")
print(f"\n  Rader i user_auto_trading_configs: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM user_auto_trading_configs WHERE is_enabled = true;")
print(f"  is_enabled=true i user_auto_trading_configs: {cur.fetchone()[0]}")

# Sjekk om det er en view
cur.execute("""
SELECT table_type FROM information_schema.tables WHERE table_name = 'auto_trading_configs';
""")
row = cur.fetchone()
if row:
    print(f"  auto_trading_configs table_type: {row[0]}")

# Sammenlign brukere med aktive sesjoner mot auto_trading_configs
cur.execute("""
SELECT ts.user_id, ts.id, ts.smart_trader_enabled
FROM trading_sessions ts
WHERE ts.status = 'active'
ORDER BY ts.user_id;
""")
active_sessions = cur.fetchall()
print(f"\n  Aktive sesjoner ({len(active_sessions)}):")
for r in active_sessions:
    uid = r[0]
    # Sjekk om brukeren finnes i auto_trading_configs
    if exists_auto:
        cur.execute("SELECT is_enabled FROM auto_trading_configs WHERE user_id = %s;", (uid,))
        atc_row = cur.fetchone()
        atc_enabled = atc_row[0] if atc_row else "IKKE FUNNET"
    else:
        atc_enabled = "TABELL FINNES IKKE"
    
    # Sjekk user_auto_trading_configs
    cur.execute("SELECT is_enabled FROM user_auto_trading_configs WHERE user_id = %s;", (uid,))
    uatc_row = cur.fetchone()
    uatc_enabled = uatc_row[0] if uatc_row else "IKKE FUNNET"
    
    print(f"    {uid[:8]}... | session={r[1][:8]}... | smart={r[2]} | auto_cfg={atc_enabled} | user_auto_cfg={uatc_enabled}")

# Sjekk om smart_trader_enabled ble satt til true noen gang
cur.execute("""
SELECT COUNT(*) FROM trading_sessions WHERE smart_trader_enabled = true;
""")
print(f"\n  Totale sesjoner med smart_trader_enabled=true: {cur.fetchone()[0]}")

cur.close()
conn.close()

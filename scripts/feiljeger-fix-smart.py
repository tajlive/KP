#!/usr/bin/env python3
"""Fix: Aktiver smart_trader_enabled på aktive paper-sesjoner for auto-trading-brukere"""
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
print("FIKS: Aktiver smart_trader_enabled på aktive auto-trading-sesjoner")
print("="*60)

# FØR: tell aktive sesjoner med smart_trader_enabled=false for auto-trading-brukere
cur.execute("""
SELECT COUNT(*) 
FROM trading_sessions ts
JOIN auto_trading_configs atc ON atc.user_id = ts.user_id
WHERE ts.status = 'active' 
  AND ts.mode = 'paper'
  AND ts.smart_trader_enabled = false
  AND atc.is_enabled = true;
""")
before_count = cur.fetchone()[0]
print(f"  FØR: {before_count} aktive paper-sesjoner uten smart_trader_enabled (auto-trading brukere)")

# Utfør oppdatering
cur.execute("""
UPDATE trading_sessions ts
SET smart_trader_enabled = true,
    updated_at = NOW()
FROM auto_trading_configs atc
WHERE ts.user_id = atc.user_id
  AND ts.status = 'active'
  AND ts.mode = 'paper'
  AND ts.smart_trader_enabled = false
  AND atc.is_enabled = true;
""")
updated = cur.rowcount
print(f"  OPPDATERT: {updated} rader")

# ETTER: verifiser
cur.execute("""
SELECT COUNT(*) 
FROM trading_sessions ts
JOIN auto_trading_configs atc ON atc.user_id = ts.user_id
WHERE ts.status = 'active' 
  AND ts.mode = 'paper'
  AND ts.smart_trader_enabled = false
  AND atc.is_enabled = true;
""")
after_count = cur.fetchone()[0]
print(f"  ETTER: {after_count} aktive paper-sesjoner uten smart_trader_enabled")

# Vis hvilke sesjoner som ble oppdatert
cur.execute("""
SELECT ts.id, ts.user_id, ts.smart_trader_enabled, ts.updated_at
FROM trading_sessions ts
JOIN auto_trading_configs atc ON atc.user_id = ts.user_id
WHERE ts.status = 'active'
  AND ts.mode = 'paper'
  AND atc.is_enabled = true
ORDER BY ts.updated_at DESC;
""")
print(f"\n  Aktive auto-trading-sesjoner ETTER fix:")
for r in cur.fetchall():
    print(f"    {r[0][:8]}... | user={r[1][:8]}... | smart={r[2]} | updated={r[3]}")

# Sjekk de 2 sesjonene uten auto_trading_configs
cur.execute("""
SELECT ts.id, ts.user_id, ts.smart_trader_enabled
FROM trading_sessions ts
LEFT JOIN auto_trading_configs atc ON atc.user_id = ts.user_id
WHERE ts.status = 'active'
  AND ts.mode = 'paper'
  AND atc.user_id IS NULL;
""")
orphan = cur.fetchall()
if orphan:
    print(f"\n  ADVARSEL: {len(orphan)} aktive sesjoner uten auto_trading_configs (bør stoppes?):")
    for r in orphan:
        print(f"    {r[0][:8]}... | user={r[1][:8]}... | smart={r[2]}")

conn.commit()
cur.close()
conn.close()
print("\n  FIKS FULLFORT")

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

# Sjekk om det finnes triggers på trading_sessions som påvirker smart_trader_enabled
cur.execute("""
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trading_sessions'
ORDER BY trigger_name;
""")
print("Triggers på trading_sessions:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2][:100]}...")

if not cur.fetchall():
    print("  Ingen triggers funnet.")

# Sjekk om det finnes foreign keys eller constraints som påvirker smart_trader_enabled
cur.execute("""
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'trading_sessions'
ORDER BY constraint_name;
""")
print("\nConstraints på trading_sessions:")
for r in cur.fetchall():
    print(f"  {r[0]} ({r[1]})")

# Sjekk om smart_trader_enabled har en check constraint
cur.execute("""
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%smart%';
""")
print("\nCheck constraints med 'smart':")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

cur.close()
conn.close()

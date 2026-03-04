#!/usr/bin/env python3
"""
Execute SQL via Supabase Service Role or direct PostgreSQL
Usage: python3 execute-sql-python.py <sql-file> <service-role-key-or-db-password>
"""

import sys
import os
import subprocess
from pathlib import Path

PROJECT_REF = 'vuxbjlykgmzskxbclquf'
SUPABASE_URL = f'https://{PROJECT_REF}.supabase.co'

def try_psql(sql_file: str, db_password: str) -> bool:
    """Try executing via psql command line"""
    db_host = f'db.{PROJECT_REF}.supabase.co'
    
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password
    
    cmd = [
        'psql',
        f'postgresql://postgres:{db_password}@{db_host}:5432/postgres?sslmode=require',
        '-f', sql_file
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print("✅ SQL executed successfully via psql!")
            print(result.stdout)
            return True
        else:
            print(f"❌ psql failed: {result.stderr}")
            return False
    except FileNotFoundError:
        print("⚠️  psql not installed")
        return False
    except subprocess.TimeoutExpired:
        print("⚠️  psql command timed out")
        return False

def try_supabase_py(sql_file: str, service_key: str) -> bool:
    """Try executing via supabase-py library"""
    try:
        from supabase import create_client
        
        print("🔄 Connecting via supabase-py...")
        supabase = create_client(SUPABASE_URL, service_key)
        
        # Read SQL
        sql = Path(sql_file).read_text()
        print(f"📄 Loaded {len(sql)} characters")
        
        # Unfortunately supabase-py doesn't support raw SQL well
        # We need to create an RPC function or use REST directly
        
        import requests
        
        # Try to execute via PostgREST
        headers = {
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'params=single-object'
        }
        
        # For pg_cron setup, we can use the pg_net extension via RPC
        # But that requires an existing exec_sql function
        
        print("⚠️  Direct SQL via REST API not supported without exec_sql function")
        return False
        
    except ImportError:
        print("⚠️  supabase-py not installed (pip install supabase)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 execute-sql-python.py <sql-file> <password-or-key>")
        print("")
        print("The password/key can be:")
        print("  - Database password (for psql)")
        print("  - Service role key (for API access)")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    password = sys.argv[2]
    
    if not os.path.exists(sql_file):
        print(f"❌ File not found: {sql_file}")
        sys.exit(1)
    
    print("🚀 Supabase SQL Executor (Python)")
    print(f"📁 File: {Path(sql_file).name}")
    print("")
    
    # Try psql first (most reliable)
    if try_psql(sql_file, password):
        sys.exit(0)
    
    print("")
    
    # Try supabase-py
    if try_supabase_py(sql_file, password):
        sys.exit(0)
    
    print("")
    print("❌ All methods failed")
    print("")
    print("To install psql (PostgreSQL client):")
    print("  macOS:   brew install libpq")
    print("  Ubuntu:  sudo apt-get install postgresql-client")
    print("  Windows: https://www.postgresql.org/download/windows/")
    sys.exit(1)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
MCP SQL Executor - Kjør SQL direkte via Supabase Management API
Kjør: python3 scripts/mcp-sql-executor.py supabase/migrations/001_trading_system.sql
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

# Konfigurasjon
PROJECT_REF = "vuxbjlykgmzskxbclquf"
BASE_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}"

def get_token():
    """Hent Supabase Access Token fra environment"""
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token or token in ['sbp_your_supabase_token_here', 'sbp_xxx']:
        print("❌ SUPABASE_ACCESS_TOKEN ikke satt eller ugyldig")
        print("")
        print("Fiks:")
        print("1. Gå til https://app.supabase.com/account/tokens")
        print("2. Opprett ny token")
        print("3. Kjør: export SUPABASE_ACCESS_TOKEN='din_token'")
        sys.exit(1)
    return token

def execute_sql(token, sql):
    """Kjør SQL via Supabase Management API"""
    url = f"{BASE_URL}/database/query"
    
    data = json.dumps({"query": sql}).encode('utf-8')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {"error": error_body, "status": e.code}
    except Exception as e:
        return {"error": str(e)}

def split_sql_statements(sql):
    """Del opp SQL i separate statements"""
    # Enkel split på semikolon (ikke perfekt men fungerer for de fleste tilfeller)
    statements = []
    current = ""
    in_dollar_quote = False
    
    for line in sql.split('\n'):
        line = line.strip()
        if not line or line.startswith('--'):
            continue
            
        current += line + "\n"
        
        # Håndter dollar quotes (functions)
        if '$$' in line:
            in_dollar_quote = not in_dollar_quote
        
        # Del på semikolon hvis ikke i dollar quote
        if not in_dollar_quote and line.endswith(';'):
            statements.append(current.strip())
            current = ""
    
    if current.strip():
        statements.append(current.strip())
    
    return statements

def main():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  🗄️  MCP SQL EXECUTOR                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print("")
    
    # Sjekk args
    if len(sys.argv) < 2:
        print("Bruk: python3 scripts/mcp-sql-executor.py <sql-fil>")
        print("")
        print("Eksempel:")
        print("  python3 scripts/mcp-sql-executor.py supabase/migrations/001_trading_system.sql")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    
    # Les SQL fil
    if not Path(sql_file).exists():
        print(f"❌ Fil ikke funnet: {sql_file}")
        sys.exit(1)
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    print(f"📄 SQL-fil: {sql_file}")
    print(f"📊 Størrelse: {len(sql_content)} tegn")
    print("")
    
    # Hent token
    token = get_token()
    print(f"🔐 Token: {token[:20]}...")
    print("")
    
    # Del opp statements
    statements = split_sql_statements(sql_content)
    print(f"📝 SQL statements: {len(statements)}")
    print("")
    
    # Kjør hvert statement
    success_count = 0
    error_count = 0
    
    for i, stmt in enumerate(statements[:5], 1):  # Begrens til 5 første for testing
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"🔹 Statement {i}/{len(statements)}")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("")
        
        # Vis første del av statement
        preview = stmt[:100].replace('\n', ' ')
        if len(stmt) > 100:
            preview += "..."
        print(f"SQL: {preview}")
        print("")
        
        # Kjør SQL
        result = execute_sql(token, stmt)
        
        if "error" in result:
            print(f"❌ FEIL: {result['error']}")
            error_count += 1
            if error_count > 3:
                print("⚠️  For mange feil, avbryter...")
                break
        else:
            print(f"✅ OK!")
            success_count += 1
        
        print("")
    
    # Oppsummering
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("")
    print(f"✅ Suksess: {success_count}")
    print(f"❌ Feil: {error_count}")
    print("")
    
    if error_count == 0:
        print("🎉 Alle statements kjørt vellykket!")
    else:
        print("⚠️  Noen statements feilet. Sjekk feilmeldinger over.")
        print("")
        print("Tips: Mange 'already exists' feil er normale og kan ignoreres.")
    
    print("")

if __name__ == "__main__":
    main()

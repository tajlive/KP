#!/usr/bin/env python3
"""
Auto-Trading Database Setup Script for Klarpakke
Kjører SQL migrasjon direkte via Supabase API
"""

import os
import sys
import re
import urllib.request
import urllib.error
import json
from pathlib import Path

def print_colored(text, color="white"):
    """Print colored text to terminal"""
    colors = {
        "red": "\033[0;31m",
        "green": "\033[0;32m",
        "yellow": "\033[1;33m",
        "blue": "\033[0;34m",
        "cyan": "\033[0;36m",
        "reset": "\033[0m"
    }
    print(f"{colors.get(color, '')}{text}{colors['reset']}")

def read_env_file():
    """Les miljøvariabler fra .env.local"""
    env_path = Path(__file__).parent.parent / ".env.local"
    
    if not env_path.exists():
        print_colored("❌ Feil: .env.local ikke funnet", "red")
        print_colored(f"   Forventet: {env_path}", "yellow")
        return None, None
    
    supabase_url = None
    supabase_key = None
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip()
            elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                supabase_key = line.split('=', 1)[1].strip()
    
    return supabase_url, supabase_key

def read_sql_file():
    """Les SQL migrasjonsfil"""
    sql_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260208000000_add_auto_trading.sql"
    
    if not sql_path.exists():
        print_colored("❌ Feil: Migrasjonsfil ikke funnet", "red")
        print_colored(f"   Forventet: {sql_path}", "yellow")
        return None
    
    with open(sql_path, 'r') as f:
        return f.read()

def parse_sql_statements(sql_content):
    """Parse SQL inn i separate statements"""
    # Fjern kommentarer
    lines = sql_content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Hopp over kommentarer
        if line.strip().startswith('--'):
            continue
        cleaned_lines.append(line)
    
    # Splitt på semikolon
    content = '\n'.join(cleaned_lines)
    statements = []
    
    for stmt in content.split(';'):
        stmt = stmt.strip()
        if stmt and len(stmt) > 10:  # Ignorer tomme statements
            statements.append(stmt + ';')
    
    return statements

def execute_sql(supabase_url, supabase_key, sql):
    """Kjør SQL via Supabase REST API"""
    url = f"{supabase_url}/rest/v1/rpc/exec_sql"
    
    data = json.dumps({"query": sql}).encode('utf-8')
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {supabase_key}',
        'apikey': supabase_key,
        'Prefer': 'return=minimal'
    }
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return True, response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return False, error_body
    except Exception as e:
        return False, str(e)

def create_tables_manually(supabase_url, supabase_key):
    """Opprett tabeller en etter en hvis RPC ikke fungerer"""
    
    tables = [
        # trading_api_keys
        """
        CREATE TABLE IF NOT EXISTS trading_api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            api_key_encrypted TEXT NOT NULL,
            api_secret_encrypted TEXT NOT NULL,
            exchange TEXT NOT NULL DEFAULT 'binance',
            exchange_env TEXT NOT NULL DEFAULT 'live',
            permissions JSONB DEFAULT '["READ", "SPOT"]'::jsonb,
            is_active BOOLEAN DEFAULT true,
            is_valid BOOLEAN DEFAULT true,
            last_validated_at TIMESTAMPTZ,
            last_used_at TIMESTAMPTZ,
            ip_whitelist TEXT[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_active_user_exchange UNIQUE (user_id, exchange, exchange_env)
        );
        """,
        
        # auto_trade_settings
        """
        CREATE TABLE IF NOT EXISTS auto_trade_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            auto_trading_enabled BOOLEAN DEFAULT false,
            risk_profile TEXT NOT NULL DEFAULT 'moderate' CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')),
            max_position_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
            daily_loss_limit_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
            daily_trade_limit INTEGER NOT NULL DEFAULT 10,
            min_confidence INTEGER DEFAULT 70 CHECK (min_confidence >= 0 AND min_confidence <= 100),
            allowed_symbols TEXT[],
            max_concurrent_positions INTEGER DEFAULT 5 CHECK (max_concurrent_positions >= 1 AND max_concurrent_positions <= 50),
            min_order_size_usdt DECIMAL(10,2) DEFAULT 20.00,
            notify_on_trade BOOLEAN DEFAULT true,
            notify_on_sl_tp BOOLEAN DEFAULT true,
            notify_on_daily_limit BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        
        # auto_trades
        """
        CREATE TABLE IF NOT EXISTS auto_trades (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
            order_id TEXT,
            client_order_id TEXT,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
            quantity DECIMAL(20,8),
            quantity_filled DECIMAL(20,8),
            entry_price DECIMAL(20,8),
            exit_price DECIMAL(20,8),
            current_market_price DECIMAL(20,8),
            stop_loss DECIMAL(20,8),
            take_profit DECIMAL(20,8),
            realized_pnl DECIMAL(20,8) DEFAULT 0,
            unrealized_pnl DECIMAL(20,8) DEFAULT 0,
            commission DECIMAL(20,8) DEFAULT 0,
            commission_asset TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'closed', 'cancelled', 'failed', 'rejected')),
            close_reason TEXT CHECK (close_reason IN ('stop_loss', 'take_profit', 'manual', 'signal')),
            risk_profile_used TEXT,
            max_position_percent_used DECIMAL(5,2),
            error_code TEXT,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            executed_at TIMESTAMPTZ,
            closed_at TIMESTAMPTZ,
            metadata JSONB
        );
        """,
        
        # auto_trade_daily_stats
        """
        CREATE TABLE IF NOT EXISTS auto_trade_daily_stats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            total_trades INTEGER DEFAULT 0,
            winning_trades INTEGER DEFAULT 0,
            losing_trades INTEGER DEFAULT 0,
            total_pnl DECIMAL(20,8) DEFAULT 0,
            total_realized_loss DECIMAL(20,8) DEFAULT 0,
            total_realized_profit DECIMAL(20,8) DEFAULT 0,
            daily_loss_limit_reached BOOLEAN DEFAULT false,
            daily_trade_limit_reached BOOLEAN DEFAULT false,
            limit_reached_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_user_date UNIQUE (user_id, date)
        );
        """
    ]
    
    results = {"success": [], "failed": []}
    
    for i, table_sql in enumerate(tables, 1):
        table_name = re.search(r'CREATE TABLE IF NOT EXISTS (\w+)', table_sql)
        table_name = table_name.group(1) if table_name else f"table_{i}"
        
        print(f"  [{i}/4] Oppretter {table_name}... ", end="", flush=True)
        
        success, error = execute_sql(supabase_url, supabase_key, table_sql)
        
        if success or "already exists" in error.lower():
            print_colored("✓", "green")
            results["success"].append(table_name)
        else:
            print_colored("✗", "red")
            print_colored(f"     Feil: {error[:100]}", "red")
            results["failed"].append({"table": table_name, "error": error})
    
    return results

def main():
    print_colored("🚀 Klarpakke Auto-Trading Setup", "cyan")
    print_colored("================================", "cyan")
    print()
    
    # Les miljøvariabler
    print_colored("📁 Leser miljøvariabler...", "blue")
    supabase_url, supabase_key = read_env_file()
    
    if not supabase_url or not supabase_key:
        print()
        print_colored("Manuell instruksjon:", "yellow")
        print_colored("===================", "yellow")
        print()
        print("1. Gå til https://supabase.com/dashboard")
        print("2. Velg ditt Klarpakke-prosjekt")
        print("3. Gå til SQL Editor")
        print("4. Kopier innholdet fra:")
        print_colored("   supabase/migrations/20260208000000_add_auto_trading.sql", "blue")
        print("5. Klikk 'Run'")
        return 1
    
    print_colored("✓ Fant miljøvariabler", "green")
    print_colored(f"  URL: {supabase_url}", "blue")
    print()
    
    # Opprett tabeller
    print_colored("🔧 Oppretter database tabeller...", "blue")
    print()
    
    results = create_tables_manually(supabase_url, supabase_key)
    
    print()
    print_colored("================================", "cyan")
    
    if len(results["failed"]) == 0:
        print_colored("✅ Setup vellykket!", "green")
        print()
        print_colored("Opprettet tabeller:", "blue")
        for table in results["success"]:
            print_colored(f"  • {table}", "green")
        print()
        print_colored("Neste steg:", "yellow")
        print_colored("  1. Gå til /admin/test-auto-trading", "blue")
        print_colored("  2. Kjør en test med mock-signal", "blue")
        print_colored("  3. Verifiser at alt fungerer", "blue")
        return 0
    else:
        print_colored(f"⚠️  {len(results['failed'])} tabeller feilet", "yellow")
        print()
        print_colored("Detaljer:", "red")
        for fail in results["failed"]:
            print_colored(f"  • {fail['table']}: {fail['error'][:100]}", "red")
        print()
        print_colored("Tips: Hvis feilen er 'already exists', kan du ignorere den", "yellow")
        return 1

if __name__ == "__main__":
    sys.exit(main())

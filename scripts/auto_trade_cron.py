#!/usr/bin/env python3
"""
Auto-trading cron job for Klarpakke test users.
Generates realistic BUY/SELL trades for 10 Norwegian test users.
Uses Supabase REST API with service role key.
"""
import os
import sys
import json
import random
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

# ── Config ──────────────────────────────────────────────────────────
ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env.local")

def load_env(path):
    env = {}
    if not os.path.exists(path):
        print(f"ERROR: {path} not found")
        sys.exit(1)
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

env = load_env(ENV_FILE)
SUPABASE_URL = env.get("SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

# ── Market prices (approximate for July 8, 2026) ────────────────────
MARKET_PRICES = {
    "BTCUSDT": 60800.0,
    "ETHUSDT": 1775.0,
    "SOLUSDT": 150.0,
}

PRICE_DEVIATION = 0.025  # ±2.5%

QUANTITIES = {
    "BTCUSDT": [0.0005, 0.001, 0.0015, 0.002, 0.003],
    "ETHUSDT": [0.05, 0.08, 0.1, 0.15, 0.2],
    "SOLUSDT": [0.5, 1.0, 1.5, 2.0, 3.0],
}

# ── Helpers ─────────────────────────────────────────────────────────

def api_get(endpoint, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += f"?{qs}"
    req = urllib.request.Request(url, headers={k: v for k, v in HEADERS.items() if k != "Content-Type"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API GET error {e.code}: {body[:300]}")
        return None

def api_post(endpoint, data, prefer="return=representation"):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    hdrs = {**HEADERS, "Prefer": prefer}
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API POST error {e.code}: {body[:300]}")
        return None

def api_patch(endpoint, data, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += f"?{qs}"
    hdrs = {**HEADERS, "Prefer": "return=representation"}
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=hdrs, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API PATCH error {e.code}: {body[:300]}")
        return None

# ── Main logic ──────────────────────────────────────────────────────

def get_test_paper_accounts():
    """Get paper accounts with initial_balance=100000 (the test traders)."""
    print("[1] Finding test paper accounts...")
    accounts = api_get("paper_accounts", {
        "select": "*",
        "initial_balance": "eq.100000",
        "order": "created_at.asc",
    })
    if not accounts:
        print("  ERROR: No test accounts found")
        sys.exit(1)
    print(f"  Found {len(accounts)} test accounts")
    for a in accounts:
        print(f"    {a['user_id'][:8]}... balance={a['current_balance']:.0f} PnL={a['total_profit_loss']:.2f}")
    return accounts

def get_or_create_session(user_id):
    sessions = api_get("trading_sessions", {
        "user_id": f"eq.{user_id}",
        "mode": "eq.paper",
        "status": "eq.active",
        "order": "updated_at.desc",
        "limit": "1",
    })

    if sessions and len(sessions) > 0:
        return sessions[0]

    now = datetime.now(timezone.utc).isoformat()
    session_data = {
        "user_id": user_id,
        "mode": "paper",
        "status": "active",
        "strategy_id": "dca",
        "strategy_config": {},
        "trading_pair": "BTCUSDT",
        "starting_capital_nok": 100000,
        "current_capital_nok": 100000,
        "initial_capital": 100000,
        "current_capital": 100000,
        "total_pnl": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "total_trades": 0,
        "started_at": now,
        "last_heartbeat": now,
        "created_at": now,
        "updated_at": now,
    }
    result = api_post("trading_sessions", session_data)
    if result and len(result) > 0:
        return result[0]
    return None

def generate_trade(user_id, session_id, account):
    coin = random.choice(list(MARKET_PRICES.keys()))
    market_price = MARKET_PRICES[coin]
    side = random.choice(["buy", "sell"])

    # Random price near market (±2.5%)
    price = market_price * (1 + random.uniform(-PRICE_DEVIATION, PRICE_DEVIATION))
    price = round(price, 2)

    qty = random.choice(QUANTITIES[coin])
    total_value = round(price * qty, 2)
    fee = round(total_value * 0.001, 2)

    realized_pnl = None
    if side == "sell":
        # Some profitable (+1-5%), some loss (-5% to -1%)
        pnl_factor = random.choice([
            random.uniform(0.01, 0.05),   # 1-5% profit
            random.uniform(0.01, 0.05),
            random.uniform(0.01, 0.05),
            random.uniform(-0.05, -0.01), # 1-5% loss
            random.uniform(-0.05, -0.01),
        ])
        cost_basis = price * (1 + pnl_factor)
        realized_pnl = round((price - cost_basis) * qty, 2)

    now = datetime.now(timezone.utc)
    minutes_ago = random.randint(5, 360)
    executed_at = now - timedelta(minutes=minutes_ago)

    idempotency_key = f"cron-{user_id[:8]}-{coin}-{side}-{int(executed_at.timestamp())}-{random.randint(1000,9999)}"

    return {
        "session_id": session_id,
        "user_id": user_id,
        "idempotency_key": idempotency_key,
        "mode": "paper",
        "trading_pair": coin,
        "side": side,
        "order_type": "market",
        "quantity": qty,
        "price": price,
        "total_value": total_value,
        "fee": fee,
        "status": "filled",
        "realized_pnl": realized_pnl,
        "is_copy": False,
        "executed_at": executed_at.isoformat(),
        "created_at": now.isoformat(),
    }

def update_session_stats(session, trades):
    total_trades = (session.get("total_trades", 0) or 0) + len(trades)
    winning = (session.get("winning_trades", 0) or 0)
    losing = (session.get("losing_trades", 0) or 0)
    current_capital = float(session.get("current_capital_nok", 100000) or 100000)
    total_pnl = float(session.get("total_pnl", 0) or 0)

    for t in trades:
        if t["realized_pnl"] is not None:
            total_pnl += t["realized_pnl"]
            current_capital += t["realized_pnl"]
            if t["realized_pnl"] > 0:
                winning += 1
            else:
                losing += 1
        elif t["side"] == "buy":
            current_capital -= t["total_value"] + t["fee"]

    return {
        "total_trades": total_trades,
        "winning_trades": winning,
        "losing_trades": losing,
        "current_capital_nok": round(current_capital, 2),
        "current_capital": round(current_capital, 2),
        "total_pnl": round(total_pnl, 2),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

def update_paper_account(account, trades):
    balance = float(account.get("current_balance", 100000) or 100000)
    total_pnl = float(account.get("total_profit_loss", 0) or 0)
    win_count = int(account.get("win_count", 0) or 0)
    loss_count = int(account.get("loss_count", 0) or 0)

    for t in trades:
        if t["realized_pnl"] is not None:
            balance += t["realized_pnl"]
            total_pnl += t["realized_pnl"]
            if t["realized_pnl"] > 0:
                win_count += 1
            else:
                loss_count += 1
        elif t["side"] == "buy":
            balance -= (t["total_value"] + t["fee"])

    return {
        "current_balance": round(balance, 2),
        "total_profit_loss": round(total_pnl, 2),
        "win_count": win_count,
        "loss_count": loss_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

def main():
    print("=" * 60)
    print("KLARPAKKE AUTO-TRADING CRON")
    print(f"Run: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    accounts = get_test_paper_accounts()
    if len(accounts) == 0:
        print("ERROR: No paper accounts found")
        sys.exit(1)

    # Limit to 10 accounts (the test traders)
    accounts = accounts[:10]

    total_trades = 0
    success_users = 0
    errors = []

    for account in accounts:
        user_id = account["user_id"]
        uid_short = user_id[:8]
        print(f"\n[{uid_short}...] balance={account['current_balance']:.0f}", end="", flush=True)

        session = get_or_create_session(user_id)
        if not session:
            errors.append(f"{uid_short}: No session")
            print(" FAILED (no session)")
            continue

        # 1-2 trades per user (60% chance of 1, 40% chance of 2)
        num_trades = random.choices([1, 2], weights=[0.6, 0.4])[0]

        trades_made = []
        for i in range(num_trades):
            trade = generate_trade(user_id, session["id"], account)
            result = api_post("trades", trade)
            if result and len(result) > 0:
                trades_made.append(trade)
                total_trades += 1
                side_label = "🟢 BUY " if trade["side"] == "buy" else "🔴 SELL"
                coin_label = trade["trading_pair"].replace("USDT", "")
                pnl_str = f" PnL=${trade['realized_pnl']:.2f}" if trade["realized_pnl"] else ""
                print(f"\n    {side_label} {coin_label} {trade['quantity']} @ ${trade['price']:.2f}{pnl_str}", end="")
            else:
                errors.append(f"{uid_short}: Trade insert failed")
                print(f"\n    ❌ FAILED", end="")

        if trades_made:
            session_update = update_session_stats(session, trades_made)
            api_patch("trading_sessions", session_update, {"id": f"eq.{session['id']}"})

            account_update = update_paper_account(account, trades_made)
            api_patch("paper_accounts", account_update, {"user_id": f"eq.{user_id}"})

            success_users += 1

    print("\n")
    print("=" * 60)
    print(f"RESULT: {total_trades} trades across {success_users}/{len(accounts)} users")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("Status: ALL OK")
    print("=" * 60)

    if errors:
        sys.exit(1)

if __name__ == "__main__":
    main()

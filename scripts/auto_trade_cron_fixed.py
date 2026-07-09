#!/usr/bin/env python3
"""
Auto-trading cron job for Klarpakke test users (FIXED).
Generates realistic BUY/SELL trades for 10 Norwegian test users.
Uses Supabase REST API with service role key.
Fixed: SSL context for macOS Python 3.14, proper NaN handling.
"""
import os
import sys
import json
import random
import ssl
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

# ── Config ──────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
ENV_FILE = os.path.join(SCRIPT_DIR, "..", ".env.local")

def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                env[k.strip()] = v
    return env

env = load_env(ENV_FILE)
SUPABASE_URL = env.get("SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

# SSL context for macOS Python 3.14
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

# ── Market prices (approximate for July 9, 2026) ────────────────────
MARKET_PRICES = {
    "BTCUSDT": 62350.00,
    "ETHUSDT": 1750.00,
    "SOLUSDT": 78.50,
}

PRICE_DEVIATION = 0.025  # ±2.5%

QUANTITIES = {
    "BTCUSDT": [0.0005, 0.0008, 0.001, 0.0015, 0.002],
    "ETHUSDT": [0.05, 0.08, 0.1, 0.15, 0.2],
    "SOLUSDT": [0.5, 1.0, 1.5, 2.0, 3.0],
}

# The 10 test users from the existing script
TEST_EMAILS = [
    "ola.nordmann@klarpakke.test",
    "kari.aas@klarpakke.test",
    "bjorn.fjell@klarpakke.test",
    "ingrid.sol@klarpakke.test",
    "lars.vik@klarpakke.test",
    "marte.hav@klarpakke.test",
    "per.berg@klarpakke.test",
    "silje.lund@klarpakke.test",
    "trond.dal@klarpakke.test",
    "anne.mo@klarpakke.test",
]

# ── Helpers ─────────────────────────────────────────────────────────

def api_get(endpoint, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += f"?{qs}"
    req = urllib.request.Request(url, headers={k: v for k, v in HEADERS.items() if k != "Content-Type"})
    try:
        with urllib.request.urlopen(req, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API GET error {e.code}: {body[:300]}")
        return None

def api_post(endpoint, data):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    hdrs = {**HEADERS, "Prefer": "return=representation"}
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, context=SSL_CTX) as resp:
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
        with urllib.request.urlopen(req, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API PATCH error {e.code}: {body[:300]}")
        return None

def safe_float(val, default=100000.0):
    """Parse float safely, handling NaN."""
    try:
        f = float(val)
        if f != f:  # NaN check
            return default
        return f
    except (TypeError, ValueError):
        return default

def safe_int(val, default=0):
    try:
        return int(val)
    except (TypeError, ValueError):
        return default

# ── Main logic ──────────────────────────────────────────────────────

def get_test_users():
    """Get test users from auth.users by email."""
    print("[1] Finding test users by email...")
    users = []
    for email in TEST_EMAILS:
        result = api_get("users", {
            "select": "id,email",
            "email": f"eq.{email}",
        })
        if result and len(result) > 0:
            users.append(result[0])
            print(f"    ✅ {email} → {result[0]['id'][:8]}...")
        else:
            print(f"    ❌ {email} — not found")
    return users

def get_paper_accounts(user_ids):
    """Get paper accounts for given user IDs."""
    print("\n[2] Fetching paper accounts...")
    accounts = []
    for uid in user_ids:
        result = api_get("paper_accounts", {
            "select": "*",
            "user_id": f"eq.{uid}",
        })
        if result and len(result) > 0:
            acc = result[0]
            balance = safe_float(acc.get("current_balance"), 100000.0)
            # Fix NaN balances
            if balance != balance:
                balance = 100000.0
            acc["current_balance"] = balance
            acc["total_profit_loss"] = safe_float(acc.get("total_profit_loss"), 0.0)
            acc["win_count"] = safe_int(acc.get("win_count"), 0)
            acc["loss_count"] = safe_int(acc.get("loss_count"), 0)
            accounts.append(acc)
            print(f"    {uid[:8]}... balance={balance:,.0f} PnL={acc['total_profit_loss']:,.0f}")
        else:
            print(f"    {uid[:8]}... NO ACCOUNT — skipping")
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
        "strategy_id": "auto_dca",
        "strategy_config": {},
        "trading_pair": "BTCUSDT",
        "risk_level": "balanced",
        "current_capital": 100000,
        "initial_capital": 100000,
        "current_capital_nok": 100000,
        "starting_capital_nok": 100000,
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "total_pnl": 0,
        "last_heartbeat": now,
        "crash_count": 0,
        "started_at": now,
        "created_at": now,
        "updated_at": now,
        "is_leaderboard_visible": False,
    }
    result = api_post("trading_sessions", session_data)
    if result and len(result) > 0:
        return result[0]
    return None

def generate_trade(user_id, session_id, account):
    coin = random.choice(list(MARKET_PRICES.keys()))
    market_price = MARKET_PRICES[coin]
    side = random.choice(["buy", "sell"])

    price = market_price * (1 + random.uniform(-PRICE_DEVIATION, PRICE_DEVIATION))
    price = round(price, 2)

    qty = random.choice(QUANTITIES[coin])
    total_value = round(price * qty, 2)
    fee = round(total_value * 0.001, 2)

    realized_pnl = None
    reason_code = "cron_buy"
    if side == "sell":
        # Mix: ~60% profitable, ~40% loss
        is_profitable = random.random() < 0.55
        if is_profitable:
            pnl_factor = random.uniform(0.01, 0.06)
            reason_code = "cron_sell_profit"
        else:
            pnl_factor = random.uniform(-0.06, -0.01)
            reason_code = "cron_sell_loss"
        cost_basis = price * (1 + pnl_factor)
        realized_pnl = round((price - cost_basis) * qty, 2)

    now = datetime.now(timezone.utc)
    minutes_ago = random.randint(5, 360)
    executed_at = now - timedelta(minutes=minutes_ago)

    import uuid
    trade_id = str(uuid.uuid4())
    idempotency_key = f"cron-{user_id[:8]}-{coin}-{side}-{int(executed_at.timestamp())}-{random.randint(1000,9999)}"

    return {
        "id": trade_id,
        "session_id": session_id,
        "user_id": user_id,
        "idempotency_key": idempotency_key,
        "idempotency_scope": "auto_trading_cron",
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
        "is_mock": True,
        "reason_code": reason_code,
        "reason_params": {"source": "auto_trading_cron", "run": now.isoformat()},
        "executed_at": executed_at.isoformat(),
        "created_at": now.isoformat(),
    }

def update_session_stats(session, trades):
    total_trades = safe_int(session.get("total_trades"), 0) + len(trades)
    winning = safe_int(session.get("winning_trades"), 0)
    losing = safe_int(session.get("losing_trades"), 0)
    current_capital = safe_float(session.get("current_capital_nok"), 100000)
    total_pnl = safe_float(session.get("total_pnl"), 0)

    for t in trades:
        if t["realized_pnl"] is not None:
            total_pnl = round(total_pnl + t["realized_pnl"], 2)
            current_capital = round(current_capital + t["realized_pnl"], 2)
            if t["realized_pnl"] > 0:
                winning += 1
            else:
                losing += 1
        elif t["side"] == "buy":
            current_capital = round(current_capital - t["total_value"] - t["fee"], 2)

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
    balance = safe_float(account.get("current_balance"), 100000)
    total_pnl = safe_float(account.get("total_profit_loss"), 0)
    win_count = safe_int(account.get("win_count"), 0)
    loss_count = safe_int(account.get("loss_count"), 0)

    for t in trades:
        rpnl = t["realized_pnl"]
        if rpnl is not None:
            balance = round(balance + rpnl, 2)
            total_pnl = round(total_pnl + rpnl, 2)
            if rpnl > 0:
                win_count += 1
            else:
                loss_count += 1
        elif t["side"] == "buy":
            balance = round(balance - t["total_value"] - t["fee"], 2)

    return {
        "current_balance": round(balance, 2),
        "total_profit_loss": round(total_pnl, 2),
        "win_count": win_count,
        "loss_count": loss_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

def main():
    print("=" * 60)
    print("KLARPAKKE AUTO-TRADING CRON (FIXED)")
    print(f"Run: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    users = get_test_users()
    if len(users) == 0:
        print("ERROR: No test users found")
        sys.exit(1)

    user_ids = [u["id"] for u in users]
    accounts = get_paper_accounts(user_ids)
    if len(accounts) == 0:
        print("ERROR: No paper accounts found")
        sys.exit(1)

    # Build user lookup
    user_by_id = {u["id"]: u for u in users}

    total_trades = 0
    success_users = 0
    errors = []
    results = []

    for account in accounts:
        user_id = account["user_id"]
        uid_short = user_id[:8]
        email = user_by_id.get(user_id, {}).get("email", uid_short)
        balance = safe_float(account.get("current_balance"), 100000)

        print(f"\n[{uid_short}] {email} balance={balance:,.0f}", end="", flush=True)

        session = get_or_create_session(user_id)
        if not session:
            errors.append(f"{email}: No session")
            print(" FAILED (no session)")
            continue

        # 1-2 trades per user (50% chance of 2)
        num_trades = random.choices([1, 2], weights=[0.5, 0.5])[0]

        trades_made = []
        for i in range(num_trades):
            trade = generate_trade(user_id, session["id"], account)
            result = api_post("trades", trade)
            if result and len(result) > 0:
                trades_made.append(trade)
                total_trades += 1
                side_label = "🟢 BUY " if trade["side"] == "buy" else "🔴 SELL"
                coin_label = trade["trading_pair"].replace("USDT", "")
                pnl_str = f" PnL=${trade['realized_pnl']:+.2f}" if trade["realized_pnl"] else " (open)"
                print(f"\n    {side_label} {coin_label} {trade['quantity']} @ ${trade['price']:.2f}{pnl_str}", end="")

                results.append({
                    "email": email,
                    "coin": coin_label,
                    "side": trade["side"],
                    "qty": trade["quantity"],
                    "price": trade["price"],
                    "pnl": trade["realized_pnl"],
                })
            else:
                errors.append(f"{email}: Trade insert failed")
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
    profitable = sum(1 for r in results if r["pnl"] is not None and r["pnl"] > 0)
    unprofitable = sum(1 for r in results if r["pnl"] is not None and r["pnl"] < 0)
    print(f"  Profitable: {profitable}  |  Unprofitable: {unprofitable}")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("Status: ALL OK")
    print("=" * 60)

if __name__ == "__main__":
    main()

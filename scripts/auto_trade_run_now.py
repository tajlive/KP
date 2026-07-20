#!/usr/bin/env python3
"""Auto-trading run for Klarpakke's 10 Norwegian test users (2026-07-20).
Prices in NOK (as used by production trades table). Uses service role key via REST API.
"""
import os, sys, json, random, ssl, urllib.request, urllib.error
try:
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CTX = ssl.create_default_context()
from datetime import datetime, timezone, timedelta

ENV_FILE = "/Users/taj/klarpakke/.env.local"

def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

env = load_env(ENV_FILE)
SUPABASE_URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# Current NOK market prices (from latest trades + coin_prices)
MARKET_PRICES = {"BTCUSDT": 631500.0, "ETHUSDT": 18380.0, "SOLUSDT": 747.0}
PRICE_DEVIATION = 0.02  # ±2% around market

QUANTITIES = {
    "BTCUSDT": [0.002, 0.003, 0.005, 0.008, 0.012],
    "ETHUSDT": [0.08, 0.12, 0.2, 0.3, 0.5],
    "SOLUSDT": [2.0, 3.5, 5.0, 8.0, 12.0],
}

def api_get(endpoint, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        url += "?" + "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
    req = urllib.request.Request(url, headers={"apikey": KEY, "Authorization": HEADERS["Authorization"]})
    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode())

def api_post(endpoint, data):
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{endpoint}", data=json.dumps(data).encode(),
                                 headers={**HEADERS, "Prefer": "return=representation"}, method="POST")
    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode())

def api_patch(endpoint, data, params):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}?" + "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
    req = urllib.request.Request(url, data=json.dumps(data).encode(),
                                 headers={**HEADERS, "Prefer": "return=representation"}, method="PATCH")
    with urllib.request.urlopen(req, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode())

def get_or_create_session(user_id):
    s = api_get("trading_sessions", {"user_id": f"eq.{user_id}", "mode": "eq.paper", "status": "eq.active",
                                     "order": "updated_at.desc", "limit": "1"})
    if s:
        return s[0]
    now = datetime.now(timezone.utc).isoformat()
    r = api_post("trading_sessions", {
        "user_id": user_id, "mode": "paper", "status": "active", "strategy_id": "dca",
        "strategy_config": {}, "trading_pair": "BTCUSDT",
        "starting_capital_nok": 100000, "current_capital_nok": 100000,
        "initial_capital": 100000, "current_capital": 100000,
        "total_pnl": 0, "winning_trades": 0, "losing_trades": 0, "total_trades": 0,
        "started_at": now, "last_heartbeat": now, "created_at": now, "updated_at": now})
    return r[0] if r else None

def generate_trade(user_id, session_id):
    coin = random.choice(list(MARKET_PRICES))
    market = MARKET_PRICES[coin]
    side = random.choice(["buy", "sell"])
    price = round(market * (1 + random.uniform(-PRICE_DEVIATION, PRICE_DEVIATION)), 2)
    qty = random.choice(QUANTITIES[coin])
    total_value = round(price * qty, 2)
    fee = round(total_value * 0.001, 2)

    realized_pnl = None
    if side == "sell":
        # 60% profit (+1-4%), 40% loss (-4% to -1%)
        pnl_factor = random.choice([random.uniform(0.01, 0.04)] * 3 + [random.uniform(-0.04, -0.01)] * 2)
        cost_basis = price * (1 + pnl_factor)
        realized_pnl = round((price - cost_basis) * qty, 2)

    now = datetime.now(timezone.utc)
    executed_at = now - timedelta(minutes=random.randint(5, 300))
    key = f"cron-{user_id[:8]}-{coin}-{side}-{int(executed_at.timestamp())}-{random.randint(1000,9999)}"
    return {
        "session_id": session_id, "user_id": user_id, "idempotency_key": key,
        "mode": "paper", "trading_pair": coin, "side": side, "order_type": "market",
        "quantity": qty, "price": price, "total_value": total_value, "fee": fee,
        "status": "filled", "realized_pnl": realized_pnl, "is_copy": False,
        "executed_at": executed_at.isoformat(), "created_at": now.isoformat(),
    }

def main():
    print("KLARPAKKE AUTO-TRADING RUN", datetime.now(timezone.utc).isoformat())
    accounts = api_get("paper_accounts", {"select": "*", "initial_balance": "eq.100000", "order": "created_at.asc"})
    # Skip corrupted accounts, take 10
    accounts = [a for a in accounts if float(a["current_balance"]) > 0][:10]
    print(f"Test accounts: {len(accounts)}")

    total, ok, errors = 0, 0, []
    for a in accounts:
        uid = a["user_id"]
        try:
            session = get_or_create_session(uid)
            if not session:
                raise RuntimeError("no session")
            n = random.choices([1, 2], weights=[0.6, 0.4])[0]
            made = []
            for _ in range(n):
                t = generate_trade(uid, session["id"])
                r = api_post("trades", t)
                if r:
                    made.append(t); total += 1
                    lbl = "BUY " if t["side"] == "buy" else "SELL"
                    pnl = f" PnL={t['realized_pnl']:.0f} kr" if t["realized_pnl"] is not None else ""
                    print(f"  {uid[:8]} {lbl} {t['trading_pair'][:3]} {t['quantity']} @ {t['price']:.0f} kr{pnl}")
            if made:
                balance = float(a["current_balance"]); tpl = float(a["total_profit_loss"])
                wc = int(a.get("win_count") or 0); lc = int(a.get("loss_count") or 0)
                s_cap = float(session.get("current_capital_nok") or 100000)
                s_pnl = float(session.get("total_pnl") or 0)
                s_w = int(session.get("winning_trades") or 0); s_l = int(session.get("losing_trades") or 0)
                s_t = int(session.get("total_trades") or 0)
                for t in made:
                    if t["realized_pnl"] is not None:
                        balance += t["realized_pnl"]; tpl += t["realized_pnl"]; s_cap += t["realized_pnl"]; s_pnl += t["realized_pnl"]
                        if t["realized_pnl"] > 0: wc += 1; s_w += 1
                        else: lc += 1; s_l += 1
                    elif t["side"] == "buy":
                        balance -= t["total_value"] + t["fee"]; s_cap -= t["total_value"] + t["fee"]
                api_patch("paper_accounts", {"current_balance": round(balance, 2), "total_profit_loss": round(tpl, 2),
                          "win_count": wc, "loss_count": lc, "updated_at": datetime.now(timezone.utc).isoformat()},
                          {"user_id": f"eq.{uid}"})
                api_patch("trading_sessions", {"total_trades": s_t + len(made), "winning_trades": s_w, "losing_trades": s_l,
                          "current_capital_nok": round(s_cap, 2), "current_capital": round(s_cap, 2),
                          "total_pnl": round(s_pnl, 2), "updated_at": datetime.now(timezone.utc).isoformat()},
                          {"id": f"eq.{session['id']}"})
                ok += 1
        except Exception as e:
            errors.append(f"{uid[:8]}: {e}")
            print(f"  {uid[:8]} ERROR: {e}")

    print(f"RESULT: {total} trades, {ok}/{len(accounts)} users OK")
    if errors:
        print("ERRORS:", errors); sys.exit(1)

if __name__ == "__main__":
    main()

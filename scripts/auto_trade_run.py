#!/usr/bin/env python3
"""Auto-trading cron for Klarpakke — single-run inline version."""
import ssl, urllib.request, json, random, uuid
from datetime import datetime, timezone, timedelta

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

env = {}
with open("/Users/taj/klarpakke/.env.local") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS_BASE = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
HEADERS_JSON = {**HEADERS_BASE, "Content-Type": "application/json"}

def api_get(endpoint, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += f"?{qs}"
    req = urllib.request.Request(url, headers=HEADERS_BASE)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API GET error {e.code}: {body[:200]}")
        return None

def api_post(endpoint, data):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    hdrs = {**HEADERS_JSON, "Prefer": "return=representation"}
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API POST error {e.code}: {body[:200]}")
        return None

def api_patch(endpoint, data, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += f"?{qs}"
    hdrs = {**HEADERS_JSON, "Prefer": "return=representation"}
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=hdrs, method="PATCH")
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  API PATCH error {e.code}: {body[:200]}")
        return None

def sf(val, default=100000.0):
    try:
        f = float(val)
        return default if f != f else f
    except Exception:
        return default

def si(val, default=0):
    try:
        return int(val)
    except Exception:
        return default

# -- Market prices --
MARKET = {"BTCUSDT": 62350, "ETHUSDT": 1750, "SOLUSDT": 78.50}
QTY = {
    "BTCUSDT": [0.0005, 0.0008, 0.001, 0.0015, 0.002],
    "ETHUSDT": [0.05, 0.08, 0.1, 0.15, 0.2],
    "SOLUSDT": [0.5, 1.0, 1.5, 2.0, 3.0],
}

def main():
    print("=" * 60)
    print("KLARPAKKE AUTO-TRADING CRON")
    print(f"Run: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    # Get test paper accounts
    accounts = api_get("paper_accounts", {
        "select": "*",
        "initial_balance": "eq.100000",
        "order": "created_at.asc",
    })
    if not accounts:
        print("ERROR: No test accounts found")
        return

    accounts = accounts[:10]
    for a in accounts:
        a["current_balance"] = sf(a.get("current_balance"), 100000)
        a["total_profit_loss"] = sf(a.get("total_profit_loss"), 0)
        a["win_count"] = si(a.get("win_count"), 0)
        a["loss_count"] = si(a.get("loss_count"), 0)

    print(f"Found {len(accounts)} accounts:")
    for a in accounts:
        print(f"  {a['user_id'][:8]}... bal={a['current_balance']:,.0f} PnL={a['total_profit_loss']:,.0f}")

    total_trades = 0
    success_users = 0
    errors = []
    all_results = []

    for account in accounts:
        user_id = account["user_id"]
        uid = user_id[:8]

        # Get or create session
        sessions = api_get("trading_sessions", {
            "user_id": f"eq.{user_id}",
            "mode": "eq.paper",
            "status": "eq.active",
            "order": "updated_at.desc",
            "limit": "1",
        })

        if sessions and len(sessions) > 0:
            session = sessions[0]
        else:
            now = datetime.now(timezone.utc).isoformat()
            sid = str(uuid.uuid4())
            session_data = {
                "id": sid,
                "user_id": user_id,
                "mode": "paper",
                "status": "active",
                "strategy_id": "auto_dca",
                "strategy_config": {},
                "trading_pair": "BTCUSDT",
                "risk_level": "balanced",
                "current_capital": 100000,
                "initial_capital": 100000,
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
                session = result[0]
            else:
                errors.append(f"{uid}: No session")
                print(f"[{uid}] FAILED (no session)")
                continue

        balance = account["current_balance"]
        print(f"[{uid}] bal={balance:,.0f}", end="", flush=True)

        num_trades = random.choices([1, 2], weights=[0.5, 0.5])[0]

        trades_made = []
        for i in range(num_trades):
            coin = random.choice(list(MARKET.keys()))
            market_price = MARKET[coin]
            side = random.choice(["buy", "sell"])
            price = round(market_price * (1 + random.uniform(-0.025, 0.025)), 2)
            qty = random.choice(QTY[coin])
            total_value = round(price * qty, 2)
            fee = round(total_value * 0.001, 2)

            realized_pnl = None
            reason_code = "cron_buy"
            if side == "sell":
                profitable = random.random() < 0.55
                pnl_factor = random.uniform(0.01, 0.06) if profitable else random.uniform(-0.06, -0.01)
                cost_basis = price * (1 + pnl_factor)
                realized_pnl = round((price - cost_basis) * qty, 2)
                reason_code = "cron_sell_profit" if profitable else "cron_sell_loss"

            now = datetime.now(timezone.utc)
            minutes_ago = random.randint(5, 360)
            executed_at = now - timedelta(minutes=minutes_ago)

            trade_data = {
                "id": str(uuid.uuid4()),
                "session_id": session["id"],
                "user_id": user_id,
                "idempotency_key": f"cron-{uid}-{coin}-{side}-{int(executed_at.timestamp())}-{random.randint(1000,9999)}",
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

            result = api_post("trades", trade_data)
            if result and len(result) > 0:
                trades_made.append(trade_data)
                total_trades += 1
                side_label = "BUY " if side == "buy" else "SELL"
                coin_label = coin.replace("USDT", "")
                pnl_str = f" PnL=${realized_pnl:+.2f}" if realized_pnl else " (open)"
                print(f"\n    {side_label} {coin_label} {qty} @ ${price:.2f}{pnl_str}", end="")
                all_results.append({
                    "uid": uid, "coin": coin_label, "side": side,
                    "qty": qty, "price": price, "pnl": realized_pnl,
                })
            else:
                errors.append(f"{uid}: Trade insert failed")
                print(f"\n    FAILED", end="")

        if trades_made:
            # Update session
            st = si(session.get("total_trades"), 0) + len(trades_made)
            sw = si(session.get("winning_trades"), 0)
            sl = si(session.get("losing_trades"), 0)
            sc = sf(session.get("current_capital_nok"), sf(session.get("current_capital"), 100000))
            sp = sf(session.get("total_pnl"), 0)

            for t in trades_made:
                if t["realized_pnl"] is not None:
                    sp += t["realized_pnl"]
                    sc += t["realized_pnl"]
                    if t["realized_pnl"] > 0:
                        sw += 1
                    else:
                        sl += 1
                elif t["side"] == "buy":
                    sc -= (t["total_value"] + t["fee"])

            api_patch("trading_sessions", {
                "total_trades": st,
                "winning_trades": sw,
                "losing_trades": sl,
                "current_capital_nok": round(sc, 2),
                "current_capital": round(sc, 2),
                "total_pnl": round(sp, 2),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, {"id": f"eq.{session['id']}"})

            # Update paper account
            ba = account["current_balance"]
            tp = account["total_profit_loss"]
            wc = account["win_count"]
            lc = account["loss_count"]

            for t in trades_made:
                if t["realized_pnl"] is not None:
                    ba += t["realized_pnl"]
                    tp += t["realized_pnl"]
                    if t["realized_pnl"] > 0:
                        wc += 1
                    else:
                        lc += 1
                elif t["side"] == "buy":
                    ba -= (t["total_value"] + t["fee"])

            api_patch("paper_accounts", {
                "current_balance": round(ba, 2),
                "total_profit_loss": round(tp, 2),
                "win_count": wc,
                "loss_count": lc,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, {"user_id": f"eq.{user_id}"})

            success_users += 1

    print()
    print()
    print("=" * 60)
    print(f"RESULT: {total_trades} trades across {success_users}/{len(accounts)} users")
    profitable = sum(1 for r in all_results if r["pnl"] is not None and r["pnl"] > 0)
    unprofitable = sum(1 for r in all_results if r["pnl"] is not None and r["pnl"] < 0)
    print(f"  Profitable: {profitable}  |  Unprofitable: {unprofitable}")
    for r in all_results:
        em = "+" if r["pnl"] is not None and r["pnl"] > 0 else ("-" if r["pnl"] is not None and r["pnl"] < 0 else "o")
        pnl_s = f" PnL=${r['pnl']:+.2f}" if r["pnl"] else ""
        print(f"  [{em}] {r['uid']} {r['side'].upper():4s} {r['coin']:3s} {r['qty']} @ ${r['price']:.2f}{pnl_s}")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("Status: ALL OK")
    print("=" * 60)

if __name__ == "__main__":
    main()

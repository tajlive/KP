#!/usr/bin/env python3
"""Auto-trading simulation for Klarpakke test users."""
import json
import os
import random
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

SUPABASE_URL = "https://pskhryjzkobytnfwucrb.supabase.co"

# Get service role key from env
result = subprocess.run(
    ["grep", "SUPABASE_SERVICE_ROLE_KEY", ".env.local"],
    capture_output=True, text=True, cwd="/Users/taj/klarpakke"
)
SERVICE_KEY = result.stdout.split("=", 1)[1].strip()

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# Get Binance prices
result = subprocess.run([
    "curl", "-s",
    "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D"
], capture_output=True, text=True)
prices = json.loads(result.stdout)

btc_usd = float([p for p in prices if p["symbol"] == "BTCUSDT"][0]["price"])
eth_usd = float([p for p in prices if p["symbol"] == "ETHUSDT"][0]["price"])
sol_usd = float([p for p in prices if p["symbol"] == "SOLUSDT"][0]["price"])

NOK_RATE = 9.6
btc_nok = round(btc_usd * NOK_RATE, 2)
eth_nok = round(eth_usd * NOK_RATE, 2)
sol_nok = round(sol_usd * NOK_RATE, 2)

print(f"Prices: BTC={btc_nok} NOK, ETH={eth_nok} NOK, SOL={sol_nok} NOK")

PAIR_PRICES = {"BTCUSDT": btc_nok, "ETHUSDT": eth_nok, "SOLUSDT": sol_nok}
PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

# 10 active test users
USER_IDS = [
    "eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8",
    "241e1133-c895-4e64-a02f-447af4ea90b6",
    "db00be5b-2558-44fe-a5e3-b3af5f22c3bc",
    "ded5288d-c979-48f7-943b-360c6dd0ed40",
    "814b8c67-1534-4a47-8c66-40a3f80870cd",
    "165b894d-f747-4c1a-8ca1-1e9e2df0925a",
    "832bf495-487d-44a2-8ace-67580e6a851c",
    "1a40e4f1-332f-4451-86f6-0f258f08ed9c",
    "f4d68672-d994-4d4b-855a-36f39c71d09d",
    "1016b26e-f165-4046-a356-a1146bc98af9",
]

def make_req(method, path, data=None):
    url = f"{SUPABASE_URL}{path}" if path.startswith("/") else f"{SUPABASE_URL}/rest/v1/{path}"
    args = ["curl", "-s", "-X", method, url,
            "-H", f"apikey: {SERVICE_KEY}",
            "-H", f"Authorization: Bearer {SERVICE_KEY}",
            "-H", "Content-Type: application/json",
            "-H", "Prefer: return=minimal"]
    if data is not None:
        args.extend(["-d", json.dumps(data)])
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout

total_trades = 0
total_wins = 0
total_losses = 0

for uid in USER_IDS:
    num_trades = random.randint(1, 2)
    
    for _ in range(num_trades):
        pair = random.choice(PAIRS)
        base_nok = PAIR_PRICES[pair]
        
        # 60% sell bias
        side = "sell" if random.random() < 0.6 else "buy"
        
        # Random price near market (±1.5%)
        var_pct = random.uniform(-0.015, 0.015)
        price = round(base_nok * (1 + var_pct), 2)
        
        # Random quantity
        if pair == "BTCUSDT":
            qty = round(random.uniform(0.001, 0.05), 6)
        elif pair == "ETHUSDT":
            qty = round(random.uniform(0.01, 2.0), 6)
        else:
            qty = round(random.uniform(0.1, 30.0), 4)
        
        total_val = round(price * qty, 2)
        fee = round(total_val * 0.002, 2)  # 0.2% slippage
        
        # For sells: ~40% profitable, 60% loss (realistic retail)
        if side == "sell":
            if random.random() < 0.4:
                pnl_pct = random.uniform(0.5, 8.0)
                pnl = round(total_val * pnl_pct / 100, 2)
                total_wins += 1
            else:
                pnl_pct = random.uniform(-12.0, -0.5)
                pnl = round(total_val * pnl_pct / 100, 2)
                total_losses += 1
        else:
            pnl = None
        
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "+00:00"
        
        trade = {
            "user_id": uid,
            "trading_pair": pair,
            "side": side,
            "order_type": "market",
            "quantity": qty,
            "price": price,
            "total_value": total_val,
            "fee": fee,
            "status": "filled",
            "mode": "paper",
            "idempotency_key": str(uuid.uuid4()),
            "executed_at": now,
            "created_at": now,
            "is_mock": True,
            "usdt_nok_rate": NOK_RATE,
        }
        if pnl is not None:
            trade["realized_pnl"] = pnl
        
        resp = make_req("POST", "/trades", trade)
        
        pnl_str = f"{pnl} NOK" if pnl is not None else "— (buy)"
        print(f"  {uid[:8]}... {side.upper()} {qty} {pair} @ {price} NOK | total={total_val} | pnl={pnl_str}")
        total_trades += 1
        time.sleep(0.05)

print(f"\n=== Auto-trading complete ===")
print(f"Total trades: {total_trades}")
print(f"Profitable sells: {total_wins}")
print(f"Loss-making sells: {total_losses}")
if total_wins + total_losses > 0:
    wr = round(total_wins * 100 / (total_wins + total_losses), 1)
    print(f"Win rate: {wr}% of closed trades")
print(f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")

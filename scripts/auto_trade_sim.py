#!/usr/bin/env python3
"""Klarpakke auto-trade sim: 1-2 paper trades for each of the 10 NO test users."""
import json, random, time, uuid, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

# --- env ---
env = {}
for line in open('/Users/taj/klarpakke/.env.local'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HEAD = {'apikey': KEY, 'Authorization': f'Bearer {KEY}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation'}

def req(method, path, body=None):
    r = urllib.request.Request(URL + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers=HEAD, method=method)
    with urllib.request.urlopen(r) as resp:
        t = resp.read().decode()
        return json.loads(t) if t else None

# --- market prices (USDT) live from Binance, fallback to last-known ---
USDT_NOK = 9.67
fallback = {'BTCUSDT': 66306.78, 'ETHUSDT': 1940.00, 'SOLUSDT': 78.44}
try:
    with urllib.request.urlopen('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D', timeout=10) as r:
        live = {d['symbol']: float(d['price']) for d in json.loads(r.read())}
except Exception as e:
    print(f'Binance fetch failed ({e}), using fallback')
    live = fallback
MKT = {s: live[s] * USDT_NOK for s in live}  # NOK prices
print('Market NOK:', {k: round(v, 2) for k, v in MKT.items()})

USERS = {
    '4bd58f81-c41c-49ca-a712-b5aecbc8548d': 'Bjørn Fjell',
    'f4d68672-d994-4d4b-855a-36f39c71d09d': 'Trond Dal',
    '7734a444-0094-4a8a-9744-cd09c2a2cfd2': 'Anne Mo',
    '4211b1c7-2b0d-4a55-b397-a10b3ae598a7': 'Ingrid Sol',
    'eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8': 'Kari Aas',
    '241e1133-c895-4e64-a02f-447af4ea90b6': 'Lars Vik',
    '10de2b9b-62c3-43a0-8d83-c1e38aecba5d': 'Marte Hav',
    '67db9b24-3c98-4196-9f88-e70c2c164a03': 'Ola Nordmann',
    'd4480fda-6c67-4e77-b4a3-ad4b7d00f652': 'Per Berg',
    '165b894d-f747-4c1a-8ca1-1e9e2df0925a': 'Silje Lund',
}

ids = ','.join(USERS)
accounts = {a['user_id']: a for a in req('GET', f'/rest/v1/paper_accounts?user_id=in.({ids})&select=*')}

random.seed()
pairs = list(MKT.keys())
strategies = ['dca', 'grid', 'momentum']
summary = []

# assignment: 4 users single BUY, 6 round trips (3 win / 3 loss)
user_list = list(USERS.items())
random.shuffle(user_list)
plan = (['single'] * 4 + ['win'] * 3 + ['loss'] * 3)
random.shuffle(plan)

for (uid, name), kind in zip(user_list, plan):
    acct = accounts[uid]
    bal = float(acct['current_balance'])
    pair = random.choice(pairs)
    mkt = MKT[pair]
    now = datetime.now(timezone.utc)

    sess = req('POST', '/rest/v1/trading_sessions', {
        'user_id': uid, 'mode': 'paper', 'status': 'active',
        'strategy_id': random.choice(strategies),
        'trading_pair': pair.replace('USDT', '/USDT'),
        'initial_capital': round(bal, 2), 'current_capital': round(bal, 2),
        'starting_capital_nok': round(bal, 2), 'current_capital_nok': round(bal, 2),
    })[0]
    sid = sess['id']

    def insert_trade(side, price, qty, executed_at):
        tv = round(price * qty, 2)
        fee = round(tv * 0.001, 2)
        return req('POST', '/rest/v1/trades', {
            'session_id': sid, 'user_id': uid,
            'idempotency_key': f'cron-sim-{uuid.uuid4()}',
            'mode': 'paper', 'trading_pair': pair, 'side': side,
            'order_type': 'market', 'quantity': qty, 'price': round(price, 8),
            'total_value': tv, 'fee': fee, 'status': 'filled',
            'is_copy': False, 'is_mock': False, 'idempotency_scope': 'trade',
            'venue': 'binance', 'usdt_nok_rate': USDT_NOK,
            'strategy_signal': json.loads(json.dumps({'source': 'auto-trade-cron', 'strategy': sess['strategy_id']})),
            'executed_at': executed_at.isoformat(),
        })[0]

    frac = random.uniform(0.05, 0.15)
    buy_price = mkt * (1 + random.uniform(-0.003, 0.003))
    qty = round((bal * frac) / buy_price, 8)

    realized = None
    buy_t = insert_trade('buy', buy_price, qty, now - timedelta(minutes=random.randint(2, 6)))

    if kind != 'single':
        drift = random.uniform(0.003, 0.015) if kind == 'win' else random.uniform(-0.015, -0.003)
        sell_price = buy_price * (1 + drift)
        sell_t = insert_trade('sell', sell_price, qty, now)
        realized = float(sell_t['realized_pnl']) if sell_t.get('realized_pnl') is not None else None
        n_trades = 2
    else:
        n_trades = 1

    # stop session, fetch final capital
    req('PATCH', f'/rest/v1/trading_sessions?id=eq.{sid}',
        {'status': 'stopped', 'stopped_at': datetime.now(timezone.utc).isoformat()})
    final = req('GET', f'/rest/v1/trading_sessions?id=eq.{sid}&select=current_capital_nok')[0]
    final_bal = float(final['current_capital_nok'])

    pnl_delta = round(final_bal - bal, 2)
    upd = {
        'current_balance': round(final_bal, 2),
        'total_profit_loss': round(float(acct.get('total_profit_loss') or 0) + pnl_delta, 2),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    if realized is not None:
        if realized > 0:
            upd['win_count'] = int(acct.get('win_count') or 0) + 1
        elif realized < 0:
            upd['loss_count'] = int(acct.get('loss_count') or 0) + 1
    req('PATCH', f'/rest/v1/paper_accounts?user_id=eq.{uid}', upd)

    summary.append({'user': name, 'plan': kind, 'pair': pair, 'trades': n_trades,
                    'realized_pnl': realized, 'balance': f'{bal:.2f} -> {final_bal:.2f}'})
    print(summary[-1])
    time.sleep(0.3)

wins = sum(1 for s in summary if (s['realized_pnl'] or 0) > 0)
losses = sum(1 for s in summary if (s['realized_pnl'] or 0) < 0)
print(f'\nDONE: {sum(s["trades"] for s in summary)} trades, {wins} wins, {losses} losses')

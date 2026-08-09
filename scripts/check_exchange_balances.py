#!/usr/bin/env python3
"""Les-Only: sjekk saldo på Kraken og OKX + Kraken-nøkkelens tilganger.
Printer KUN saldoer og status — aldri nøkler."""
import os, time, hmac, hashlib, base64, json, urllib.request, urllib.parse, datetime

KRAKEN_KEY = os.environ.get("KRAKEN_API_KEY", "")
KRAKEN_SECRET = os.environ.get("KRAKEN_API_SECRET", "")
OKX_KEY = os.environ.get("OKX_API_KEY", "")
OKX_SECRET = os.environ.get("OKX_SECRET_KEY", "")
OKX_PASS = os.environ.get("OKX_PASSPHRASE", "")

def kraken_private(method: str, params: dict | None = None):
    path = f"/0/private/{method}"
    nonce = str(int(time.time() * 1000))
    data = {"nonce": nonce, **(params or {})}
    postdata = urllib.parse.urlencode(data)
    encoded = (nonce + postdata).encode()
    message = path.encode() + hashlib.sha256(encoded).digest()
    signature = base64.b64encode(
        hmac.new(base64.b64decode(KRAKEN_SECRET), message, hashlib.sha512).digest()
    )
    req = urllib.request.Request(
        f"https://api.kraken.com{path}", data=postdata.encode(),
        headers={"API-Key": KRAKEN_KEY, "API-Sign": signature.decode()},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def okx_private(request_path: str):
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    msg = ts + "GET" + request_path
    sign = base64.b64encode(
        hmac.new(OKX_SECRET.encode(), msg.encode(), hashlib.sha256).digest()
    ).decode()
    req = urllib.request.Request(
        f"https://www.okx.com{request_path}",
        headers={
            "OK-ACCESS-KEY": OKX_KEY, "OK-ACCESS-SIGN": sign,
            "OK-ACCESS-TIMESTAMP": ts, "OK-ACCESS-PASSPHRASE": OKX_PASS,
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

print("=== KRAKEN saldo (read-only) ===")
try:
    bal = kraken_private("Balance")
    if bal.get("error"):
        print("FEIL:", bal["error"])
    else:
        for asset, amount in bal.get("result", {}).items():
            if float(amount) > 0:
                print(f"  {asset}: {amount}")
        if not bal.get("result"):
            print("  (tom konto)")
except Exception as e:
    print("FEIL:", e)

print("\n=== KRAKEN tilganger (read-only sonder) ===")
# WithdrawInfo er et read-only funding-kall som krever withdraw-tillatelse på nøkkelen
try:
    info = kraken_private("WithdrawInfo", {"asset": "XBT", "key": "test", "amount": "0.001"})
    errs = info.get("error", [])
    if any("Permission denied" in e for e in errs):
        print("  Withdraw-tillatelse: NEI (Permission denied)")
    elif any("Unknown withdraw key" in e or "Invalid amount" in e for e in errs):
        print("  Withdraw-tillatelse: JA (nøkkelen har funding/withdraw-tilgang)")
    else:
        print("  WithdrawInfo-svar:", errs)
except Exception as e:
    print("  FEIL:", e)

print("\n=== OKX saldo (read-only) ===")
try:
    bal = okx_private("/api/v5/account/balance")
    if bal.get("code") != "0":
        print("FEIL:", bal.get("msg"), "(kode", bal.get("code"), ")")
    else:
        found = False
        for d in bal.get("data", []):
            for det in d.get("details", []):
                if float(det.get("eq", 0) or 0) > 0:
                    print(f"  {det['ccy']}: {det['eq']}")
                    found = True
        if not found:
            print("  (tom konto)")
except Exception as e:
    print("FEIL:", e)

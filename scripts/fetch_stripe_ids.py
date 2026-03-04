import os
import requests
import json
import sys

# Key from previous turn
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")

if not STRIPE_SECRET_KEY:
    print("Error: STRIPE_SECRET_KEY not set")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {STRIPE_SECRET_KEY}",
    "Content-Type": "application/x-www-form-urlencoded"
}

PRODUCTS = [
    {
        "name": "Klarpakke Bachelor", # Basis
        "id_key": "PROD_BASIS",
        "prices": [
            {"amount": 24900, "currency": "nok", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY"},
            {"amount": 249000, "currency": "nok", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL"},
             # EUR/USD as well? Config has them.
            {"amount": 2200, "currency": "eur", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_EUR"},
            {"amount": 22000, "currency": "eur", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_EUR"},
            {"amount": 2500, "currency": "usd", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_USD"},
            {"amount": 25000, "currency": "usd", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_USD"},
        ]
    },
    {
        "name": "Klarpakke Master", # Komplett
        "id_key": "PROD_KOMPLETT",
        "prices": [
            {"amount": 49900, "currency": "nok", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY"},
            {"amount": 499000, "currency": "nok", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL"},
            {"amount": 4500, "currency": "eur", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_EUR"},
            {"amount": 45000, "currency": "eur", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_EUR"},
            {"amount": 4900, "currency": "usd", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_USD"},
            {"amount": 49000, "currency": "usd", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_USD"},
        ]
    },
    {
        "name": "Klarpakke Professor", # Pro
        "id_key": "PROD_PRO",
        "prices": [
            {"amount": 124900, "currency": "nok", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY"},
            {"amount": 1249000, "currency": "nok", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL"},
            {"amount": 11000, "currency": "eur", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_EUR"},
            {"amount": 110000, "currency": "eur", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_EUR"},
            {"amount": 12000, "currency": "usd", "interval": "month", "env": "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_USD"},
            {"amount": 120000, "currency": "usd", "interval": "year", "env": "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_USD"},
        ]
    }
]

env_vars = {}

def get_or_create_product(name):
    # Search
    resp = requests.get("https://api.stripe.com/v1/products/search", params={"query": f"active:'true' AND name:'{name}'"}, headers=HEADERS)
    data = resp.json()
    if 'error' in data:
        print(f"Error searching product {name}: {data}")
        sys.exit(1)
    if 'data' in data and data['data']:
        return data['data'][0]['id']
    
    # Create
    resp = requests.post("https://api.stripe.com/v1/products", data={"name": name}, headers=HEADERS)
    return resp.json()['id']

def get_or_create_price(product_id, amount, currency, interval):
    # List prices for product
    resp = requests.get("https://api.stripe.com/v1/prices", params={"product": product_id, "active": "true", "limit": 100}, headers=HEADERS)
    prices = resp.json()['data']
    
    for p in prices:
        if p['unit_amount'] == amount and p['currency'] == currency and p.get('recurring', {}).get('interval') == interval:
            return p['id']
            
    # Create
    data = {
        "product": product_id,
        "unit_amount": amount,
        "currency": currency,
        "recurring[interval]": interval
    }
    resp = requests.post("https://api.stripe.com/v1/prices", data=data, headers=HEADERS)
    return resp.json()['id']

print("Starting Stripe Setup (Python)...")
for prod in PRODUCTS:
    print(f"Checking product: {prod['name']}")
    pid = get_or_create_product(prod['name'])
    print(f"  ID: {pid}")
    
    for price in prod['prices']:
        price_id = get_or_create_price(pid, price['amount'], price['currency'], price['interval'])
        print(f"  Price ({price['currency']} {price['amount']/100}): {price_id}")
        env_vars[price['env']] = price_id

print("\n\nENV VARS:")
for k, v in env_vars.items():
    print(f"{k}={v}")

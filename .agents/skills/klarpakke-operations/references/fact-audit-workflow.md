# FACT-AUDIT Workflow — Eksempel fra 2026-07-27

## SQL-spørringer brukt i verifiseringen

### Finn topp-avkastning fra ekte brukere
```sql
SELECT pa.user_id, pa.current_balance, up.display_name
FROM paper_accounts pa
JOIN user_profiles up ON pa.user_id = up.user_id
WHERE pa.current_balance > 0
  AND pa.user_id::text NOT LIKE '%0000-0000%'
ORDER BY pa.current_balance DESC
LIMIT 10;
```

### Sjekk om leaderboard_bots har reelle handler
```sql
SELECT lb.id, lb.display_name, lb.user_id, COUNT(t.id) as actual_trades
FROM leaderboard_bots lb
LEFT JOIN trades t ON lb.user_id = t.user_id
GROUP BY lb.id, lb.display_name, lb.user_id
ORDER BY actual_trades DESC;
```

### Finn seed-data (alle rader med identisk created_at = bulk-insert)
```sql
SELECT created_at, COUNT(*) FROM leaderboard_entries
GROUP BY created_at ORDER BY COUNT(*) DESC LIMIT 5;
```

### Verifiser reell brukertelling
```sql
SELECT COUNT(*) as real_users
FROM user_profiles
WHERE user_id::text NOT LIKE '%0000-0000%';
```

### Topp tradere fra reell data
```sql
SELECT user_id, total_trades, winning_trades, total_pnl
FROM trading_stats
WHERE user_id::text NOT LIKE '%0000-0000%'
  AND total_trades > 0
ORDER BY total_pnl DESC
LIMIT 10;
```

## Curl-kommandoer for live-verifisering

### Leaderboard API — sjekk at ingen bot-navn eller testkontoer lekker
```bash
curl -s https://www.klarpakke.no/api/leaderboard | python3 -c "
import sys, json
data = json.load(sys.stdin)
names = [d['user_display_name'] for d in data]
bots = ['Anne Mo','Ingrid Sol','Lars Vik','Kari Aas','Marte Hav','Per Berg','Bjørn Fjell','Trond Dal','Silje Lund','Ola Nordmann']
has_bot = any(n in bots for n in names)
bad = ['tom+','sim','verify','direct test','viking','Sitat']
has_bad = any(any(b in n.lower() for b in bad) for n in names)
print(f'Entries: {len(data)} | Bot names: {has_bot} | Test: {has_bad}')
print(f'Names: {names[:8]}')
"
```

### Hero-tekst — sjekk at riktig prosent vises
```bash
curl -sL https://www.klarpakke.no/en | grep -o "+321%\|+343%"
```

### i18n — sjekk at ingen norske strenger lekker på engelsk side
```bash
curl -sL https://www.klarpakke.no/en | grep -c "Lær\|Priser"
```

### Sjekk at /jokertrade er offentlig (HTTP 200, ikke redirect)
```bash
curl -s -o /dev/null -w "%{http_code}" https://www.klarpakke.no/en/jokertrade
```

### Rå i18n-nøkkel — skal aldri vises i HTML
```bash
curl -sL https://www.klarpakke.no/en | grep -c "landing.metadata.title"
```

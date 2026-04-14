# UptimeRobot Setup — Klarpakke

> **Status:** Primær uptime-overvåkning for produksjon. erstatter GitHub Actions `health-monitor.yml`.

---

## 1. Registrer deg (gratis)

Gå til [https://uptimerobot.com](https://uptimerobot.com) og opprett en gratis konto.

## 2. Opprett monitor

Klikk **"Add New Monitor"** og fyll inn:

| Felt | Verdi |
|------|-------|
| **Monitor Type** | `HTTP(s)` |
| **Friendly Name** | `Klarpakke API Health` |
| **URL** | `https://www.klarpakke.no/api/health` |
| **Monitoring Interval** | `5 minutes` (gratis) |
| **Monitor Timeout** | `30 seconds` |
| **HTTP Method** | `GET` |

### Optional: Response validation
- **Keyword** (valgfritt): `healthy`
- Hvis du aktiverer dette, vil UptimeRobot markere monitor som **DOWN** hvis responsen ikke inneholder ordet `healthy`.

## 3. Alert Contacts

Legg til minst én:
- **E-post** (standard)
- **Slack** — krever en Slack Incoming Webhook URL
- **Pushover / Telegram / Discord** — støttes også på gratis-plan

## 4. Pages / Status Page (valgfritt)

På gratis-plan kan du lage én **Status Page**:
- URL: `https://stats.uptimerobot.com/...`
- Del med teamet for transparens

## 5. Deaktiver GitHub Actions Health Monitor

Dette er allerede gjort. `health-monitor.yml` kjører nå kun manuelt (`workflow_dispatch`).

---

## Anbefalte innstillinger for Klarpakke

```text
Monitor 1: API Health
  URL:     https://www.klarpakke.no/api/health
  Interval: 5 min
  Keyword: healthy

Monitor 2: Landing Page (valgfritt)
  URL:     https://www.klarpakke.no/no
  Interval: 5 min
```

## Kostnad

**$0** — UptimeRobot sin gratisplan dekker 50 monitors med 5-minutters intervall.

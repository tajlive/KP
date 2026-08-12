# Failure

System: paper_accounts (Supabase) — pg_cron `klarpakke_hourly_balance_sync` (jobid 1108) + tick-cron skrivevei
Dato: 2026-08-10

Symptom: Toms paper-saldo eksploderte eksponentielt: 100 000 kr → 598 940,50 kr →
697 576,98 kr. Nye sesjoner arvet oppblåst saldo.

Rotårsak: `klarpakke_hourly_balance_sync` summerte ALLE paper-sesjoner (inkl. stoppede)
hver time → re-inflasjon. Tick-cronen hadde en EGET skrivevei (`syncPaperAccountBalance`)
som summerte active+paused+stopped hvert 5. min → re-inflaterte saldoen 4 minutter etter
DB-fiksen.

Fix: sum kun `['active','paused']`. Guard (1.5×) + DB-constraint + regresjonstest i SAMME
commit som reparasjonen. Re-schedule kun påvirket job (1108), ikke alle.

Permanent regel: Kapital summeres KUN fra aktive (active/paused) sesjoner — stoppede er
fryst historikk. `paper_accounts` er eneste fasit; ALDRI summer sesjoner inn i konto.

Arvet av: portfolio/summary, leaderboard, dashboard-kapital (samme mønsterklasse:
«stoppede sesjoner genererer fantom-data»).

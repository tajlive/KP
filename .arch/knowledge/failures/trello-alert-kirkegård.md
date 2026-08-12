# Failure

System: Trello board «Klarpakke Drift» — liste «🚨 Varsler»
Dato: 2026-08-09 → 2026-08-11

Symptom: 85 av 110 kort havnet i «🚨 Varsler»-listen uten noen lukkemekanisme.
Auto-rollback + syntetisk-monitor + Max-Aggressive postet nytt kort ved hver kjøring.

Rotårsak: Hver alert-kilde postet et NYTT kort per hendelse uten deduplisering.
Ingen «løst → lukk»-flyt for varsler → kirkegård.

Fix: Linear-first alert-arkitektur (KLA-279): fingerprint-dedup mot ÅPNE issues —
samme hendelse gir alltid samme issue. Trello arkivert (Fase 4: 78 støy-kort → metadata).

Permanent regel: Alle eksterne varsler har fingerprint + dedup mot åpne issues.
Ingen spam, ingen kirkegård. Se pattern `linear-alert-dedup`.

Arvet av: deploy.yml, synthetic-monitor.yml, max-aggressive-monitor.mjs, sentry-webhook.

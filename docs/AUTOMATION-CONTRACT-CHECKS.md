## Nye automatiske kontraktsjekker

Repoet har nå to GitHub Actions-workflows som kjører validering mot Webflow-sidene og laster opp `reports/*.json` som artifacts:

- `contract-checks.yml`: Kjører på PR + manuelt, og poster en PR-kommentar med kort status.
- `nightly-prod-contract.yml`: Kjører nattlig (og manuelt) mot prod.

### Secrets du må legge inn

- `STAGING_SITE_URL`: f.eks. `https://klarpakke-xxxxxx.webflow.io`
- `PROD_SITE_URL`: f.eks. `https://klarpakke.no`

Ingen hemmelige nøkler legges i Webflow Custom Code; kun ikke-sensitive config via `window.ENV` (se øvrige docs).

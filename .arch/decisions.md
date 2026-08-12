# Arch beslutninger — Klarpakke (prosjektnivå)

## D-2026-08-12-01 — Adopsjon av Hermes Master Prompt v4.0

**Beslutning:** Master Prompt v4.0 (Arch AI Engineering & Operations Architect) er gjeldende
styringsramme. Lagret verbatim i .hermes/prompts/hermes-prompt-v4.md.
**Konsekvens:** Linear = eneste oppgavekilde; git-policy Issue→Branch→…→Review→Main;
secret://-governance; nye agentroller.

## D-2026-08-12-02 — Arch Control Plane bor per prosjekt-repo

**Beslutning:** .arch/ ligger i hvert prosjekts repo-rot (først Klarpakke: tajlive/KP).
Ingen separat Arch-applikasjon — kontrollplanet er konfigurasjon + verktøy (scripts/arch/).
**Alternativ vurdert:** sentral ~/.arch/ — forkastet: repo-anchoring gir versjonskontroll
og naturlig tilgangskontroll per prosjekt.

## D-2026-08-12-03 — Secret Registry v1 = referanser, aldri verdier

**Beslutning:** secrets.yaml inneholder kun secret://-URIer + store-lokasjoner. Verdiene
forblir i eksisterende stores (env.local, BWS, wrangler, GitHub Actions). Ingen flytting i
v1 — produksjonsrisiko uten gevinst. Resolver/audit-scripts er read-only.
**Konsekvens:** overgang til «verdi-migrering» skjer når Tom godkjenner egen oppgave.

## D-2026-08-12-04 — Repo-fakta verifisert

**Fakta:** repo = tajlive/KP (prompt-eksempelet stemte), default branch main,
Supabase pskhryjzkobytnfwucrb, workers klarpakke + klarpakke-staging,
Cloudflare-account 80d5b1d56a3e907150ba7348b6182894.

## D-2026-08-12-06 — Adopsjon av Master Prompt v4.1

**Beslutning:** v4.1 erstatter v4.0 som grunnprompt (lagret i
.hermes/prompts/hermes-prompt-v4.1.md). .arch/ utvides med architecture-history.md (§3).
**Konsekvens:** Project Factory-krav (§4) — init-project.mjs utvides med
backup-strategy og --create-flagg; «direkte push til main er ikke standard» (§9);
rapportformat §18.

## D-2026-08-12-05 — Første issue-basert arbeidsflyt

**Beslutning:** Control Plane-arbeidet følger ny git-policy: Linear KLA-274 → branch
arch-control-plane-v1 → gates → commit med KLA-ref → review (Tom) → main. Ingen push
uten eksplisitt godkjenning (deploy-konsekvens: Task-2-committen 33ce84e26 på local main
endrer Sentry-webhook-oppførsel ved push — LINEAR_API_KEY wrangler-secret må settes først).

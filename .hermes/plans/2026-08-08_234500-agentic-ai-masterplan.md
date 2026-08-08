# Agentic AI Masterplan for Klarpakke — Implementation Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen task-for-task.

**Goal:** Gjøre Klarpakkes «AI» fra en samling isolerte modeller (12 regel-agenter + 1 utrent PPO + LLM-forklaringer) til en ekte **agentisk handelsarkitektur** — et system som observerer, resonnerer, handler, evaluerer seg selv og lærer av hvert tap.

**Architecture:** Tre lag: (1) **Orchestrator-agent** (LLM med tool-use) som sitter over tick-motoren og bestemmer *hvorfor* noe skal handles — ikke bare *hva*; (2) **Refleksjons-løkke** som etter hvert tap/feil kjører en post-mortem-agent og lagrer læringen i Supabase; (3) **Vektlæring** som justerer ensemble-vektene basert på faktisk P&L per agent (i dag er vektene hardkodet). PPO-agenten (STATE_DIM=48, Xavier-init, aldri trent) enten trenes skikkelig eller fjernes — ikke la død kode stå.

**Tech Stack:** Next.js 16 (Cloudflare Workers), Supabase (pg_cron + RPC), Kimi K3 (`api.moonshot.ai`, `$web_search`-tool) som resonnerings-LLM, Kraken som eneste datakilde, eksisterende 12 regel-agenter i `src/lib/ai/agents/`.

---

## Funn fra kartleggingen (fakta, ikke antakelser)

Jeg gikk gjennom koden. Dette er hva Klarpakke **faktisk** har i dag:

| Komponent | Status | Problem |
|---|---|---|
| 12 regel-agenter (`src/lib/ai/agents/`) | Fungerer | Rent deterministic (momentum, RSI, volum) — **ingen resonnering**. De gir score, ikke forklaring. |
| `ensemble-engine.ts` | Fungerer | Vektene er **hardkodede**. Ingen tilbakemelding fra P&L. En agent som taper penger får like mye å si som en som tjener. |
| `confluent-signal-engine.ts` | Fungerer | Kombinerer signaler, men beslutningen er regel-basert (threshold-votering). |
| **PPO-agent** (`rl/ppo-agent.ts`) | ⚠️ **DØD KODE** | `STATE_DIM=48`, Xavier-initialisering (`Math.random`), `train()` er «simplified training». **Vektene er tilfeldige tall.** Ruten `/api/trading/v3/rl/signal` er **ikke koblet inn** i tick-motoren eller autopilot-orkestratoren. Denne agenten predikerer basert på støy. |
| `ai-explanations.ts` / `risk-ai-explanations.ts` | Fungerer | LLM brukes KUN til å forklare i etterkant («hvorfor kjøpte vi») — **aldri til å beslutte**. Det er baklengs. |
| `autopilot/orchestrator.ts` | Fungerer | Kjører grid-strategi på pg_cron. Ingen agentisk overstyring. |

**Konklusjon fra kartleggingen:** Klarpakke kaller seg «AI-trading», men arkitekturen er *regel-motor + LLM-oversetter*. En agentisk AI skal **resonnere og lære**, ikke bare følge if-setninger og forklare etterpå. Det er dette jeg ville fikset med en master i agentic AI.

---

## Hva en master i agentic AI faktisk endrer (kjernen)

En agentisk arkitektur har fire egenskaper Klarpakke mangler:

1. **Tool-use i beslutningsløkka.** LLM-en skal kunne *hente data selv* (Kraken-priser, portefølje, nyheter via `$web_search`) før den beslutter — ikke få alt servert som input.
2. **Refleksjon (self-critique).** Etter hver handel: «Var dette riktig? Hvorfor/Hvorfor ikke?» — og svaret lagres og påvirker neste beslutning.
3. **Episodisk minne.** Agenten husker «sist BTC falt 8% på FOMC-nyheter, taper jeg på long» — og bruker det neste gang lignende regime oppstår.
4. **Meta-læring av vekter.** Ensemble-vektene skal oppdateres fra faktisk P&L per agent (online læring), ikke være konstante.

---

## Task 1: Drep eller tren PPO-agenten (rydding først)

**Objective:** Fjern tilfeldig-vekt-prediksjon fra kodebasen. Død kode som predikerer på støy er farligere enn ingen kode.

**Files:**
- Modify: `src/lib/trading/rl/ppo-agent.ts` (er død — vurder sletting)
- Modify: `src/app/api/trading/v3/rl/signal/route.ts` (ikke wired inn)
- Test: `src/lib/trading/rl/__tests__/`

**Beslutning som hovedarkitekt:** **Slett RL-agenten fra signal-stien** (behold filen som `rl/ppo-agent.ts.bak` eller feature-flagg `RL_ENABLED=false`). Begrunnelse: en utrent PPO med Xavier-init gir `softmax(random·state)` ≈ uniform støy over 5 actions. Den predikerer ingenting. Å trene en PPO skikkelig krever (a) replay-buffer med tusenvis av episoder, (b) en reward-funksjon som er bevist å ikke lære å gamble, (c) offline-trening mot historiske data med walk-forward-validering. Det er Task 5 — ikke noe man rusker til. **Først: fjern den fra beslutningsstien så den aldri kan påvirke en ekte handel.**

**Step 1:** Test som beviser at RL-signal-ruten ikke er koblet i tick:
```ts
it("RL-agent påvirker ikke live/paper-tick", () => {
  // grep beviser: ingen import av rl/signal i tick/autopilot/cron
});
```

**Step 2:** Verifiser at testen viser at ruten er isolert (den er det — kartlagt over).

**Step 3:** Feature-flagg ruten: `if (process.env.RL_ENABLED !== "true") return NextResponse.json({error:"disabled"}, {status:503})`.

**Step 4:** Test PASS.

**Step 5: Commit** `chore(rl): isoler utrent PPO-agent bak feature-flagg — skal aldri påvirke handler`.

---

## Task 2: Orchestrator-agent — LLM med tool-use over tick-motoren

**Objective:** Flytt beslutningen fra ren threshold-votering til en LLM-agent som kan hente data og resonnere før den godkjenner/avviser et signal.

**Files:**
- Create: `src/lib/ai/orchestrator-agent.ts`
- Modify: `src/lib/trading/confluent-signal-engine.ts` (legg til valgfri `orchestratorVeto`-sjekk)
- Modify: `src/app/api/cron/autopilot-orchestrator/route.ts`
- Test: `src/lib/ai/__tests__/orchestrator-agent.test.ts`

**Design (kjernen i agentisk AI):**
```ts
// Orchestrator-agenten får IKKE svaret servert. Den får verktøy.
const tools = [
  { name: "get_portfolio", fn: () => getPortfolioState(userId) },
  { name: "get_recent_trades", fn: (n) => getRecentTrades(userId, n) },
  { name: "get_market_regime", fn: (sym) => getRegime(sym) },
  { name: "web_search", fn: (q) => kimiWebSearch(q) }, // $web_search-tool
  { name: "get_past_reflections", fn: (sym) => getReflections(userId, sym) },
];

async function shouldExecuteSignal(signal: Signal): Promise<Decision> {
  // Agenten resonnerer: "Confluent-engine sier BUY BTC. Men:
  // 1. Hva sier mine tidligere refleksjoner om BTC-long i dette regimet?
  // 2. Er det makro-nyheter jeg bør vite om? (web_search)
  // 3. Hvor mye av porteføljen er allerede eksponert mot BTC?"
  // → returner { execute: bool, adjusted_size: number, reasoning: string }
}
```

**Kritisk sikkerhetsdesign (§BUD + pengemaskin-lov):** Orchestrator-agenten kan kun **redusere/avvise** et signal, aldri **forstørre** posisjonen utover hva `confluent-engine` + `risk-validator` allerede godkjente. LLM får aldri rå tilgang til order-utførelse. Den er en *klok gatekeeper*, ikke en *trigger-happy cowboy*. Dette er den viktigste sikkerhetsgrensen i hele planen.

**Step 1–5:** TDD per skill. Mock LLM-respons i test. Test at veto-respekt: `adjusted_size <= confluent_size` alltid.

**Step 5: Commit** `feat(agent): orchestrator-agent med tool-use — LLM resonnerer før utførelse`.

---

## Task 3: Refleksjons-løkke — agenten lærer av hvert tap

**Objective:** Etter hver lukket posisjon, kjør en post-mortem-agent som analyserer hvorfor og lagrer læringen.

**Files:**
- Create: `src/lib/ai/reflection-agent.ts`
- Create: `supabase/migrations/YYYYMMDDHHMMSS_trade_reflections.sql`
- Modify: tick/lukk-posisjon-sti (kall refleksjon async etter `realized_pnl` settes)
- Test: `src/lib/ai/__tests__/reflection-agent.test.ts`

**DB-skjema:**
```sql
CREATE TABLE trade_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  trade_id uuid NOT NULL,
  symbol text NOT NULL,
  realized_pnl numeric NOT NULL,
  regime text,                    -- bull/bear/sideways fra ensemble
  reflection text NOT NULL,       -- LLM sin post-mortem
  lesson_tags text[] NOT NULL,    -- f.eks. ['fomo-entry','macro-news-missed','oversized']
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_reflections_user_symbol ON trade_reflections(user_id, symbol);
-- RLS: brukere leser egne; service-role skriver
```

**Refleksjons-prompt (kjernen):**
> «Du er en trading-coach. En handel ble nettopp lukket: [symbol, side, inngang, utgang, P&L, regime, hvilke agenter som stemte for]. Bruk `web_search` til å sjekke om det var nyheter/makro-hendelser i perioden. Analyser: (1) Var inngangen god? (2) Var størrelsen riktig? (3) Hva er den ENE viktigste læringen? Svar på norsk, maks 3 setninger, + opptil 3 lesson_tags.»

**Step 1–5:** TDD. Mock LLM + web_search. Verifiser DB-insert og RLS (bruker ser kun egne).

**Step 5: Commit** `feat(agent): refleksjons-løkke — post-mortem på hver lukkede handel`.

---

## Task 4: Episodisk minne — refleksjoner påvirker neste beslutning

**Objective:** Koble Task 3 sin læring inn i Task 2 sin beslutning. Dette er det som gjør systemet *agentisk* — det husker.

**Files:**
- Modify: `src/lib/ai/orchestrator-agent.ts` (legg til `get_past_reflections`-tool — allerede skissert i Task 2)
- Modify: `src/lib/ai/reflection-agent.ts` (hent-funksjon med relevance-ranking)
- Test: `src/lib/ai/__tests__/memory-integration.test.ts`

**Design:** `get_past_reflections(symbol)` henter de 5 siste refleksjonene for symbolet + de 3 mest relevante på tvers av symboler (match på `regime` + `lesson_tags` — ikke dyr vector-søk, enkel tag/regime-matching holder). Orchestrator-agenten får disse i kontekst: *«Sist du gikk long BTC i bear-regime tapte du 340 kr (fomo-entry). Vurder om dette er samme situasjon.»*

**Step 1–5:** TDD. Test at en lagret refleksjon med `lesson_tags=['fomo-entry']` faktisk dukker opp i agentens kontekst ved neste lignende signal.

**Step 5: Commit** `feat(agent): episodisk minne — refleksjoner påvirker fremtidige beslutninger`.

---

## Task 5: Meta-læring av ensemble-vekter fra P&L

**Objective:** Juster agent-vektene i `ensemble-engine.ts` basert på hvilken agent som faktisk tjente penger — i stedet for hardkodede vekter.

**Files:**
- Modify: `src/lib/ai/ensemble-engine.ts`
- Create: `supabase/migrations/YYYYMMDDHHMMSS_agent_attribution.sql`
- Create: `src/app/api/cron/agent-weight-learner/route.ts` (daglig pg_cron)
- Test: `src/lib/ai/__tests__/weight-learner.test.ts`

**Design:** Hver handel logger hvilke agenter som stemte for/mot (`agent_attribution`-tabell: `trade_id, agent_name, vote, weight_at_trade`). En daglig cron regner ut **realisert P&L per agent** (sum P&L der agenten stemte med vinner-siden) og oppdaterer vektene med en **exponential moving average** (ikke rå erstatning — unngår at én heldig uke kaster om alt). Vektene lagres i `agent_weights`-tabell, ikke i kode.

**Ytelsesgrense (Klarpakke-loven):** Vekt-oppdatering skjer i cron (ikke i tick-hot-path). Tick leser ferske vekter fra cache (KV) — ingen DB-hit i signal-genereringen. Krav: <50ms ekstra latency i tick.

**Step 1–5:** TDD. Test at en agent med vedvarende positiv attributt-P&L får høyere vekt etter N dager, og at vektene summeres til 1.

**Step 5: Commit** `feat(agent): meta-læring — ensemble-vekter læres fra faktisk P&L`.

---

## Task 6 (sist, størst, krever dato-bevis): Tren PPO skikkelig — eller la den ligge

**Objective:** Hvis (og bare hvis) Task 1–5 viser målbar P&L-forbedring, tren RL-agenten offline med walk-forward.

**Files:**
- Modify: `src/lib/trading/rl/ppo-agent.ts` (ekte gradient-descent, replay-buffer)
- Modify: `src/lib/trading/walk-forward.ts` (egen RL-valideringsløp)
- Create: `scripts/train-ppo-offline.ts`

**Design:** Bruk historiske Kraken-klines + eksisterende `backtestEngine.ts` som simulator. Tren offline (aldrig i prod-tick). Valider med walk-forward (trening på 2024–2025, test på 2026). **Gate:** RL-agenten aktiveres (`RL_ENABLED=true`) KUN hvis den slår grid-baseline på out-of-sample Sharpe. Ellers forblir den av. Dette er den eneste ærlige måten å gjøre RL på — ikke «simplified training».

**Step 1–5:** TDD + walk-forward-rapport. **Krever Tom-OK med konkrete tall før aktivering.**

**Step 5: Commit** `feat(rl): offline-trent PPO — aktivert kun ved bevist out-of-sample edge`.

---

## Ikke-mål (YAGNI)

- **Ingen multi-agent-sverm** (12 LLM-agenter som debatterer hverandre). Kostbart, tregt, ingen bevist edge. Regel-agentene + 1 orchestrator-LLM er nok.
- **Ingen autonomous self-modification.** Agenten endrer aldri egen kode eller risk-grenser. `risk-validator` er urørlig.
- **Ingen on-chain-agent** eller sentiment-API-er som koster penger. `$web_search` (Kimi, allerede betalt) dekker nyheter.
- **Ingen RL i hot path.** LLM-kall (Task 2) skjer FØR tick-beslutningen er fattet, men order-utførelsen er fortsatt synkron og rask. Hvis LLM er treg/timeout → fall tilbake til ren confluent-engine (fail-open til regler, aldri fail-closed til «ingen handel» uten grunn).

## Kostnadskontroll (pengemaskin-loven)

| Tiltak | Kostnad |
|---|---|
| Orchestrator-LLM per signal | ~1 Kimi-kall (K3). Veto-raten begrenser: kun signaler confluent allerede likte. |
| Refleksjon per lukket handel | ~1 Kimi-kall + ev. 1 web_search. |
| Vektlæring | 0 — ren SQL i daglig cron. |
| **Grepbar logging** | Hvert LLM-kall logges (`/api/admin/ai-calls`-mønster, §C-11) med tokens+formål → Tom ser kostnad per agent. |

## Risiko & åpne spørsmål

1. **LLM-latens i beslutningsløkka** — Kimi-kall tar sekunder. Løsning: orchestrator-veto kjører *mellom* signal-generering og utførelse, men hvis det tar >5s → skip veto (fail til regler). **Spørsmål til Tom:** akseptabelt at noen signaler utføres uten LLM-veto ved timeout?
2. **Refleksjoner kan lære feil leksjon** (én tilfeldig tap → overforsiktig). Løsning: refleksjoner er *råd* i kontekst, ikke *regler*. Vektlæring (Task 5) er den harde mekanismen; refleksjoner er myk kontekst.
3. **KIMI_API_KEY er suspendert (429, saldo)** — Task 2–4 er blokkert til Tom lader opp. Task 1 og 5 (RL-isolering + vekt-SQL) kan starte nå.

## Verifiseringsplan

Per task: tsc 0, vitest grønn, eslint 0, CI test-gate → deploy → e2e-smoke-prod.
**Helhetlig bevis (før «ferdig»):** kjør en paper-sesjon i 7 dager der orchestrator+refleksjon er på, og sammenlign P&L mot en kontroll-sesjon med ren confluent-engine. Rapporter differansen til Tom med grep-evidence. Ingen aktivering av RL (Task 6) uten dette beviset.

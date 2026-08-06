# AI-signal-pipeline-audit (2026-08-01)

Diagnose og fiks av P1: «ai-engine kjører hvert 15. min med success, men
ensemble-signaler nådde ALDRI trading_signals».

## Symptom-kjede

1. `ai_decision_log` = **0 rader** (legacy observability — bevis på at steg 3 aldri lyktes)
2. `trading_signals` siste 24t: kun 63 rader med `signal_type='technical'` (seed-fallback), `model_version` = NULL
3. `tick/route.ts` leser KUN `signal_type='ensemble_ai'` → tick levde på in-tick-fallback
   (kun for live-safety; CryptoPilot-sesjoner fikk aldri reelle AI-signaler)

## Rotårsak — to uavhengige feil i én insert

`src/app/api/cron/ai-engine/route.ts` steg 3:

```typescript
// FØR (brutt):
await db.from('ai_decision_log').insert({
  symbol,                  // ✗ finnes ikke
  decision_type,           // ✗ finnes ikke
  sentiment_score,         // ✗ finnes ikke
  analysis_data,           // ✗ finnes ikke
  decision_reason,         // ✗ finnes ikke
  executed_at,             // ✗ finnes ikke
  user_id: '6408d389-2021-4a2f-92b6-bebf0459a398',  // ✗ finnes ikke i auth.users → FK-feil
});
if (insertError) { results.push({...}); continue; }  // ✗ BLOKKERTE steg 4-5 (trading_signals!)
```

Faktisk skjema (`information_schema.columns WHERE table_name='ai_decision_log'`):
`id, user_id, strategy_id, timestamp, sentiment_value, sentiment_classification,
sentiment_recommendation, sentiment_confidence, sentiment_reasoning,
performance_total_return, performance_win_rate, performance_drawdown,
performance_sharpe_ratio, performance_volatility, performance_last_7_days,
performance_last_30_days, adjustments, explanation, created_at, opik_trace_id,
idempotency_key, idempotency_scope`

Gammel UUID `6408d389-…` fantes ikke i `auth.users` → `ai_decision_log_user_id_fkey`
(`ON DELETE CASCADE`) feilet uansett kolonnenavn. Gyldig systembruker:
`b0700000-0000-0000-0000-000000000001` (algo1@klarpakke.no). Andre systembrukere:
`…0002` (algo2), `…0003` (algo3).

## Fiks

```typescript
// ETTER:
await db.from('ai_decision_log').insert({
  user_id: SYSTEM_SIGNAL_USER_ID,   // = 'b0700000-0000-0000-0000-000000000001'
  strategy_id: 'ensemble-v2',
  timestamp: asOf,
  sentiment_value: consensus.confidence,
  sentiment_classification: consensus.action.toUpperCase(),
  sentiment_recommendation: consensus.action,
  sentiment_confidence: consensus.confidence,
  sentiment_reasoning: consensus.reasoning,
  adjustments: { ensemble: true, ensemble_run_id: consensus.runId, ... },
  explanation: consensus.reasoning,
  idempotency_key: `ai-engine-${symbol}-${asOf}`,
  idempotency_scope: 'ai-decision',
});
if (insertError) {
  // Observability er best-effort — logg og fortsett, ALDRI blokkér trading_signals
  console.error(`[Cron AI-Engine] ai_decision_log insert error for ${symbol}:`, insertError);
}
```

## Verifisering mot prod

FØR deploy:
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://www.klarpakke.no/api/cron/ai-engine
# → "ADAUSDT: db_error — Could not find the 'analysis_data' column of 'ai_decision_log' in the schema cache"
```
Bekreftet diagnosen live: 6/10 `skipped_low_volume` (bevisst kvalitetsfilter < 5M USDT 24h)
+ 4/10 `db_error` (inserten).

ETTER deploy (forventet):
```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://www.klarpakke.no/api/cron/ai-engine
# → success: true, executed/logged per symbol
# DB: SELECT COUNT(*), MAX(created_at) FROM ai_decision_log;  → >0 rader
# DB: SELECT signal_type, COUNT(*) FROM trading_signals WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY 1;
# → ensemble_ai med model_version='ensemble-v2'
```

## Regresjonstest (route.test.ts)

- Mock `@/lib/supabase/server` createClient → dbMock med per-tabell insert-mock.
- `ai_decision_log`-mock returnerer `{ error: { message: 'Could not find the X column' } }` — simulerer skjema-feil.
- `trading_signals`-mock samler innsatte rader.
- `runEnsembleForSymbol`-mock returnerer konsensus med `action: 'buy'` + agentResults.
- `fetchKlinesViaProxy`-mock: **55 candles med stigende priser** (close = 60000 + i*10) —
  flat pris ga 4h-trend 'bear' → MTF-filter senket confidence < 55 → 'hold' → master-signal
  aldri skrevet → test feilet av feil grunn. Volum > 5M USDT 24h kreves for å passere volum-gaten.

Påstander:
1. `trading_signals` inneholder master-rad (`agent_id='ensemble_master'`, `signal_type='ensemble_ai'`)
   SELV OM ai_decision_log-inserten feiler.
2. ai_decision_log-inserten bruker gyldig systembruker `b0700000-0000-0000-0000-000000000001`.

## Kontekst: cron-landskapet rundt signaler (2026-08-01)

- `klarpakke-ai-engine` (*/15) → `/api/cron/ai-engine` — ensemble-signaler (det tick leser). NÅ fikset.
- `signal-engine` (Supabase EF) produserer `technical`-signaler — kalles ikke av noen cron
  (kun manuelle scripts); `signal-engine-5min`-cronen ble repurposed til
  `/api/cron/signal-health-selfcheck` (migrasjon 20260622010000) som heartbeat-kilde
  for `bot_health.bot_name='signal-engine'` — bevisst, ikke feilkobling.
- `seed_signal_if_stale(20)` (PG-fallback, `signal-fallback-seed-5min`) skriver
  `technical`-signaler kun for SignalFeed-UI — tick leser dem ikke.
- `klarpakke-signal-health-selfcheck` (*/30) var duplikat av signal-engine-5min →
  fjernet 2026-08-01.

## Relaterte fakta

- `trading_signals` har ingen `user_id`-kolonne (bruker `agent_id`); `ai_decision_log`
  har `user_id` FK til `auth.users`.
- `idempotency_key` i trades bruker `smart-trader-*`-prefiks → trades utføres av
  smart-trader-v3 EF, ikke tick — sjekk prefiks før du konkluderer hvem som handler.

-- Fix: onboarding_events_step_check avviser steg-verdier sendt fra /api/onboarding/events
-- (deployet 2026-07-23, acede812c): checklist_viewed, first_trade_completed, history_viewed
-- DB-constrainten hadde kun gamle verdier (email, bankid, video, checklist, completed)
-- → e2e-smoke-auth-prod feilet med 500 hver deploy. Utvider constrainten.
ALTER TABLE onboarding_events DROP CONSTRAINT IF EXISTS onboarding_events_step_check;
ALTER TABLE onboarding_events ADD CONSTRAINT onboarding_events_step_check
  CHECK (step = ANY (ARRAY[
    'email', 'bankid', 'video', 'checklist', 'completed',
    'checklist_viewed', 'first_trade_completed', 'history_viewed'
  ]::text[]));

# Lesson: Edge-runtime + Supabase = krasj

Ser du `runtime: "edge"` og `@supabase/supabase-js` i samme API-rute → det krasjer i
prod (500) fordi `process.version` mangler i V8 isolates.

Regel: supabase-js-ruter = `runtime: "nodejs"`. `Buffer` finnes heller ikke i edge.

Kilde: `failures/cf-edge-runtime-avvik.md`.

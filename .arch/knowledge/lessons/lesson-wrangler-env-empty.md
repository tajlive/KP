# Lesson: wrangler multi-env → --env ""

`wrangler.jsonc` med flere environments → alle `wrangler deploy`/`versions`-kommandoer
MÅ ha `--env ""` (tom streng) for å treffe default-prod. Uten det treffer du feil
environment eller feiler.

Kilde: KLA-278 wrangler `versions secret put` (versjon 4faac85d).

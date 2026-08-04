#!/bin/bash
# with-timeout.sh SEKUNDER kommando [args...]
#
# Hard timeout for macOS (GNU timeout mangler). Kjører kommandoen i sin egen
# prosessgruppe (set -m) og dreper HELE gruppen (npx → node → playwright →
# chromium) ved tidsavbrudd, slik at gater aldri kan henge stille igjen.
#
# Bruk:  bash scripts/with-timeout.sh 300 npx playwright test ...
# Exit:  kommandoens egen kode, eller 137 ved tidsavbrudd.
#
# Laget 2026-08-04 etter at E2E smoke-testen hang >30 min mot en overbelastet
# lokal dev-server og blokkerte pre-commit.

SECS=$1
shift

set -m
"$@" &
PID=$!

(
  sleep "$SECS"
  kill -KILL -- -"$PID" 2>/dev/null
) &
WATCH=$!

wait "$PID"
EXIT=$?

kill "$WATCH" 2>/dev/null
wait "$WATCH" 2>/dev/null

set +m

if [ "$EXIT" -eq 137 ]; then
  echo "⏱️  with-timeout: prosessen ble drept etter ${SECS}s (tidsavbrudd)" >&2
fi

exit "$EXIT"

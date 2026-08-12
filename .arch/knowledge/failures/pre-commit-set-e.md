# Failure

System: Pre-commit-hook (Klarpakke repo)
Dato: 2026-08-12 (fiks: commit 33ce84e26)

Symptom: Commits passerte selv om en gate (lint / type-check / test) feilet.
Feilende gate stoppet IKKE commiten.

Rotårsak: Pre-commit-hooken manglet `set -e` → en feilende gate returnerte ikke
ikke-null exit-kode, og hooken passerte stille.

Fix: `set -e` i hooken — enhver gate-feil stopper commit umiddelbart (fail-closed).

Permanent regel: Pre-commit-gater MÅ fail-closed (`set -e`). Ingen commit uten grønn
gate. Verifiser med bevisst feilende sjekk i staging, ikke anta at hooken virker.

Arvet av: alle Arch-repoer (mal i F2).

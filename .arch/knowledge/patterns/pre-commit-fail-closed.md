# Pattern: Pre-commit fail-closed

Bruk når: Et repo har commit-gates som skal beskytte main.

Implementasjon: Pre-commit-hook med `set -e` + lint-staged (formatter + linter).

Regler:

- **`set -e`** — enhver gate-feil stopper commit umiddelbart (fail-closed, aldri fail-open).
- Gates: `tsc --noEmit` + eslint + vitest (minstegate v4.1 §8).
- **Test hooken bevisst** (feilende sjekk i staging) før du stoler på den.

Kilde: fiks `33ce84e26` — se `failures/pre-commit-set-e.md`.

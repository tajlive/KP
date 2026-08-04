/**
 * Delt konkurranse-konfigurasjon.
 *
 * competition_id identifiserer sesongen i competition_entries-tabellen.
 * Datoer brukes av leaderboard-hero (nedtelling). Oppdater per sesong —
 * eller hent fra DB hvis vi senere lar admin styre konkurranser.
 */
export const COMPETITION_ID = "2026-08";
export const COMPETITION_START = new Date("2026-08-01T00:00:00+02:00");
export const COMPETITION_END = new Date("2026-08-15T23:59:59+02:00");

/** Deltakerpremie-terskel: alle med minst dette antall handler er med i trekningen. */
export const PARTICIPATION_MIN_TRADES = 5;

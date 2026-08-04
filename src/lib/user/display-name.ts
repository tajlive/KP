/**
 * Delt kallenavn-logikk for trading-konkurranse / leaderboard.
 * Brukes av både bruker-onboarding (/api/user/display-name) og
 * admin-redigering (admin user-profile validerer likt).
 */

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 30;

const VALID_RE = /^[\p{L}\p{N} _-]+$/u;

export function validateDisplayName(
  raw: string | null | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = (raw ?? "").trim();
  if (value.length < DISPLAY_NAME_MIN) {
    return { ok: false, error: `Kallenavn må være minst ${DISPLAY_NAME_MIN} tegn` };
  }
  if (value.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `Kallenavn kan være maks ${DISPLAY_NAME_MAX} tegn` };
  }
  if (!VALID_RE.test(value)) {
    return {
      ok: false,
      error: "Kun bokstaver, tall, mellomrom, bindestrek og understrek",
    };
  }
  return { ok: true, value };
}

const ADJECTIVES = [
  "Rask", "Stille", "Modig", "Kald", "Lur", "Sterk", "Vill", "Ro",
  "Skarp", "Dyp", "Fri", "Klar", "Hard", "Mild", "Sikker", "Våken",
] as const;

const ANIMALS = [
  "Rev", "Ulv", "Hauk", "Bjørn", "Elg", "Laks", "Ørn", "Gaupe",
  "Hval", "Sel", "Ravn", "Falk", "Geit", "Hare", "Ekorn", "Måke",
] as const;

/** «RaskRev», «StilleHval» — norsk, minneverdig, anonymt. */
export function generateDisplayNameSuggestion(rng: () => number = Math.random): string {
  const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(rng() * ANIMALS.length)];
  return `${adj}${animal}`;
}

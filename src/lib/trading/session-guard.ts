/**
 * session-guard.ts
 *
 * Forsvar i dybden mot trading på deaktiverte sesjoner (Task 0.3).
 *
 * Guarden (pilot_health_guard) deaktiverer slik:
 *   - NY (2026-07-31+): status='stopped' + stopped_at + error_message='GUARD: …'
 *   - GAMMEL: smart_trader_enabled=false + error_message='GUARD: …',
 *     status forble 'active' → tick fortsatte å kjøpe (prod-bevis:
 *     kjøp 06:08 og 07:45 etter guard 05:04).
 *
 * VIKTIG (regresjonsfiks 2026-07-31 kveld): smart_trader_enabled=false er
 * IKKE et deaktiveringssignal — kolonnen har DB-default false og betyr bare
 * "sesjonen bruker ikke SmartTrader v3-edge-funksjonen". DCA- og
 * CryptoPilot-sesjoner har enabled=false og SKAL trades av tick-motoren.
 * Det pålitelige guard-signalet er error_message LIKE 'GUARD:%' (+ status).
 *
 * En sesjon regnes som tradeable kun hvis BEGGE kriteriene er oppfylt:
 *   1. status = 'active'
 *   2. error_message NOT LIKE 'GUARD:%'
 *
 * Brukes av /api/cron/tick og /api/pilot-engine (query-filtre + JS-filter).
 */

export interface TradeableSessionLike {
  status?: string | null;
  smart_trader_enabled?: boolean | null;
  error_message?: string | null;
  next_expected_action_at?: string | null;
}

/** GUARD-prefiksen guard-funksjonen setter i error_message. */
export const GUARD_ERROR_PREFIX = "GUARD:";

export function isGuardError(message: string | null | undefined): boolean {
  return typeof message === "string" && message.startsWith(GUARD_ERROR_PREFIX);
}

/**
 * Kan denne sesjonen handle? false = skal ekskluderes fra ALL trading
 * (tick, PilotTrade, auto-trader).
 *
 * Merk: smart_trader_enabled sjekkes IKKE her — se fil-headeren.
 * Guard-deaktivering fanges via status ('stopped') og GUARD-feilmelding.
 */
export function isSessionTradeable(
  session: TradeableSessionLike | null | undefined,
): boolean {
  if (!session) return false;
  if (session.status !== "active") return false;
  if (isGuardError(session.error_message)) return false;
  // Backoff: sesjoner som venter på neste handling (f.eks. OKX rate-limit
  // 429) er midlertidig IKKE tradebare — de hoppes over til backoffen utløper.
  if (session.next_expected_action_at) {
    const nextAt = new Date(session.next_expected_action_at).getTime();
    if (Number.isFinite(nextAt) && nextAt > Date.now()) return false;
  }
  return true;
}

/**
 * Menneskes-lesbar årsak til at sesjonen ble hoppet over — for logging.
 * Returnerer null når sesjonen ER tradeable.
 */
export function sessionSkipReason(
  session: TradeableSessionLike | null | undefined,
): string | null {
  if (!session) return "manglende sesjon";
  if (session.status !== "active") {
    return `status=${session.status} (krever 'active')`;
  }
  if (isGuardError(session.error_message)) {
    return `error_message='${session.error_message}'`;
  }
  if (session.next_expected_action_at) {
    const nextAt = new Date(session.next_expected_action_at).getTime();
    if (Number.isFinite(nextAt) && nextAt > Date.now()) {
      return `backoff til ${session.next_expected_action_at}`;
    }
  }
  return null;
}

/**
 * PostgREST-or-filter for å ekskludere guard-deaktiverte sesjoner PÅ
 * QUERY-NIVÅ. error_message kan være NULL — `not.like` alene ville
 * filtrert bort NULL-rader, derfor or() med is.null.
 */
export const GUARD_ERROR_OR_FILTER =
  "error_message.is.null,error_message.not.like.GUARD:%";

/**
 * Filtrer en liste med sesjoner ned til kun tradebare. Returnerer også
 * de hoppede-over med årsak, for logging. Brukes som JS-forsvar i tick
 * og pilot-engine i tillegg til query-filtrene.
 */
export function filterTradeableSessions<T extends TradeableSessionLike>(
  sessions: T[] | null | undefined,
): { tradeable: T[]; skipped: Array<{ session: T; reason: string }> } {
  if (!sessions) return { tradeable: [], skipped: [] };
  const tradeable: T[] = [];
  const skipped: Array<{ session: T; reason: string }> = [];
  for (const s of sessions) {
    const reason = sessionSkipReason(s);
    if (reason) skipped.push({ session: s, reason });
    else tradeable.push(s);
  }
  return { tradeable, skipped };
}

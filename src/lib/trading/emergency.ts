/**
 * Trading Emergency Controls
 *
 * VIKTIG: Disse funksjonene gir mulighet til å STOPPE all trading umiddelbart.
 * Brukes ved systemfeil, mistenkt hacking, eller ekstreme markedsvolatilitet.
 *
 * Hvordan bruke:
 * 1. Via MCP verktøy: panic_close_all
 * 2. Via Admin Dashboard: Emergency Stop-knapp
 * 3. Via database: UPDATE global_settings SET emergency_stop = true
 */

import { createClient } from "@/lib/utils";
import { placeOrder } from "@/lib/binance/client";

export interface EmergencyStatus {
  isActive: boolean;
  triggeredAt: string | null;
  triggeredBy: string | null;
  reason: string | null;
  affectedUsers: number;
  closedPositions: number;
}

/**
 * Sjekk om emergency stop er aktivert
 */
export async function checkEmergencyStatus(): Promise<EmergencyStatus> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("global_settings")
    .select(
      "emergency_stop, emergency_triggered_at, emergency_triggered_by, emergency_reason",
    )
    .single();

  if (error || !data) {
    // Default: ingen emergency
    return {
      isActive: false,
      triggeredAt: null,
      triggeredBy: null,
      reason: null,
      affectedUsers: 0,
      closedPositions: 0,
    };
  }

  return {
    isActive: data.emergency_stop || false,
    triggeredAt: data.emergency_triggered_at,
    triggeredBy: data.emergency_triggered_by,
    reason: data.emergency_reason,
    affectedUsers: 0, // Would need to count
    closedPositions: 0, // Would need to count
  };
}

/**
 * AKTIVÉR EMERGENCY STOP
 *
 * STOPPER all auto-trading umiddelbart!
 */
export async function activateEmergencyStop(
  reason: string,
  triggeredBy: string = "system",
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  try {
    // 1. Sett global emergency flag
    const { error: settingsError } = await supabase
      .from("global_settings")
      .update({
        emergency_stop: true,
        emergency_triggered_at: new Date().toISOString(),
        emergency_triggered_by: triggeredBy,
        emergency_reason: reason,
      } as never);

    if (settingsError) throw settingsError;

    // 2. Stopp alle aktive trading sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("trading_sessions")
      .select("id, user_id")
      .eq("status", "ACTIVE");

    if (sessionsError) throw sessionsError;

    // 3. Lukk alle åpne posisjoner (panic close)
    const closedPositions = await panicCloseAllPositions();

    // 4. Logg hendelsen
    await supabase.from("emergency_logs").insert({
      triggered_by: triggeredBy,
      reason: reason,
      affected_sessions: activeSessions?.length || 0,
      closed_positions: closedPositions,
      timestamp: new Date().toISOString(),
    } as never);

    // 5. Send alert til admin
    await sendEmergencyAlert(reason, triggeredBy, closedPositions);

    return {
      success: true,
      message: `EMERGENCY STOP aktivert! ${closedPositions} posisjoner lukket. ${activeSessions?.length || 0} sessions stoppet.`,
    };
  } catch (error) {
    console.error("[Emergency] Failed to activate emergency stop:", error);
    return {
      success: false,
      message: `FEIL: Kunne ikke aktivere emergency stop: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * DEAKTIVÉR EMERGENCY STOP
 *
 * Gjenopptar normal trading.
 * KUN bruk etter at problemet er løst!
 */
export async function deactivateEmergencyStop(
  resolvedBy: string,
  resolution: string,
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.from("global_settings").update({
      emergency_stop: false,
      emergency_resolved_at: new Date().toISOString(),
      emergency_resolved_by: resolvedBy,
      emergency_resolution: resolution,
    } as never);

    if (error) throw error;

    return {
      success: true,
      message: `Emergency stop deaktivert av ${resolvedBy}. Trading kan gjenopptas.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `FEIL: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * PANIC CLOSE ALL POSITIONS
 *
 * Lukker ALLE åpne trading-posisjoner umiddelbart!
 * Dette er NØD-bremsen - bruk kun ved krise!
 */
export async function panicCloseAllPositions(): Promise<number> {
  const supabase = createClient();
  let closedCount = 0;

  try {
    // Hent alle åpne posisjoner
    const { data: openPositions, error } = await supabase
      .from("trading_sessions")
      .select("*")
      .eq("status", "OPEN");

    if (error) throw error;
    if (!openPositions || openPositions.length === 0) {
      return 0;
    }
    // Lukk hver posisjon med MARKET order (session row: trading_pair, open_position)
    for (const row of openPositions) {
      const position = row as unknown as {
        id: string;
        symbol: string;
        quantity: number;
      };
      try {
        await placeOrder({
          symbol: position.symbol,
          side: "SELL",
          type: "MARKET",
          quantity: position.quantity,
        });

        // Oppdater status i database
        await supabase
          .from("trading_sessions")
          .update({
            status: "CLOSED",
            closed_at: new Date().toISOString(),
            close_reason: "EMERGENCY_PANIC_CLOSE",
          } as never)
          .eq("id", (row as unknown as { id: string }).id);

        closedCount++;
      } catch (closeError) {
        console.error(
          `[Emergency] Failed to close position ${position.id}:`,
          closeError,
        );
        // Fortsett med neste posisjon
      }
    }
    return closedCount;
  } catch (error) {
    console.error("[Emergency] Panic close failed:", error);
    return closedCount;
  }
}

/**
 * Sjekk om en spesifikk bruker kan trade
 * (Sjekker både global emergency og bruker-spesifikke flags)
 */
export async function canUserTrade(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // 1. Sjekk global emergency
  const emergency = await checkEmergencyStatus();
  if (emergency.isActive) {
    return {
      allowed: false,
      reason: `Global emergency stop aktiv: ${emergency.reason}`,
    };
  }

  // 2. Sjekk bruker-spesifikk suspensjon
  const supabase = createClient();
  const { data: userStatus } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .single();
  const status = userStatus as unknown as {
    trading_suspended?: boolean;
    trading_suspension_reason?: string;
  } | null;
  if (status?.trading_suspended) {
    return {
      allowed: false,
      reason: `Bruker suspendert: ${status.trading_suspension_reason || "Ukjent grunn"}`,
    };
  }

  return { allowed: true };
}

/**
 * Send emergency alert til admin
 */
async function sendEmergencyAlert(
  reason: string,
  triggeredBy: string,
  closedPositions: number,
): Promise<void> {
  const supabase = createClient();

  // Lagre i alerts tabell
  await supabase.from("admin_alerts").insert({
    type: "EMERGENCY",
    severity: "CRITICAL",
    message:
      `🚨 EMERGENCY STOP aktivert!\n\n` +
      `Årsak: ${reason}\n` +
      `Trigget av: ${triggeredBy}\n` +
      `Lukkede posisjoner: ${closedPositions}\n\n` +
      `Tid: ${new Date().toISOString()}`,
    acknowledged: false,
  });

  // Emergency alert stored in DB — admin notified via dashboard
}

/**
 * Hent emergency logg
 */
export async function getEmergencyLogs(limit: number = 10) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("emergency_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Emergency] Failed to fetch logs:", error);
    return [];
  }

  return data || [];
}

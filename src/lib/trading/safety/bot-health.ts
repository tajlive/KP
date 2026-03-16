/**
 * KLA-137: Bot Health Monitoring
 * 
 * Heartbeat, state transitions, and error tracking for trading bots.
 */

import { createClient } from "@/lib/supabase/server";

export type BotStatus = "running" | "paused" | "error" | "stopped";

export interface BotHealth {
  id: string;
  userId: string;
  status: BotStatus;
  lastHeartbeat: Date;
  lastError?: string;
  errorCount: number;
  consecutiveErrors: number;
  maxConsecutiveErrors: number;
  updatedAt: Date;
}

/**
 * Get bot health status
 */
export async function getBotHealth(botId: string): Promise<BotHealth | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bot_health")
    .select("id, user_id, status, last_heartbeat, last_error, error_count, consecutive_errors, max_consecutive_errors, updated_at")
    .eq("id", botId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id ?? "",
    status: data.status as BotStatus,
    lastHeartbeat: new Date(data.last_heartbeat ?? 0),
    lastError: data.last_error ?? undefined,
    errorCount: data.error_count ?? 0,
    consecutiveErrors: data.consecutive_errors ?? 0,
    maxConsecutiveErrors: data.max_consecutive_errors ?? 0,
    updatedAt: new Date(data.updated_at ?? 0),
  };
}

/**
 * Update bot heartbeat
 * Called periodically by running bots
 */
export async function updateBotHeartbeat(
  botId: string,
  status: BotStatus = "running"
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("bot_health")
      .upsert({
        id: botId,
        bot_name: botId,
        status,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "id",
      });

    if (error) {
      console.error("[BotHealth] Failed to update heartbeat:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[BotHealth] Unexpected error updating heartbeat:", error);
    return false;
  }
}

/**
 * Record a bot error
 * May trigger state transition if too many consecutive errors
 */
export async function recordBotError(
  botId: string,
  error: string
): Promise<void> {
  const supabase = createClient();

  try {
    // Get current state
    const { data: current } = await supabase
      .from("bot_health")
      .select("consecutive_errors, max_consecutive_errors, error_count")
      .eq("id", botId)
      .single();

    const consecutiveErrors = (current?.consecutive_errors ?? 0) + 1;
    const maxConsecutive = current?.max_consecutive_errors ?? 3;
    const shouldPause = consecutiveErrors >= maxConsecutive;

    const { error: updateError } = await supabase
      .from("bot_health")
      .upsert({
        id: botId,
        bot_name: botId,
        status: shouldPause ? "error" : "running",
        last_error: error,
        error_count: (current?.error_count ?? 0) + 1,
        consecutive_errors: consecutiveErrors,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "id",
      });

    if (updateError) {
      console.error("[BotHealth] Failed to record error:", updateError);
    }

    // Log state transition
    if (shouldPause) {
      console.warn(`[BotHealth] Bot ${botId} paused after ${consecutiveErrors} consecutive errors`);
      
      // Log to trade_decisions for audit
      await supabase.from("trade_decisions").insert({
        user_id: botId, // Simplified - should look up actual user_id
        decision_type: "reject",
        trading_mode: "live",
        symbol: "SYSTEM",
        side: "buy",
        requested_quantity: 0,
        requested_price: 0,
        rejection_reason: "BOT_NOT_HEALTHY",
      });
    }
  } catch (err) {
    console.error("[BotHealth] Unexpected error recording bot error:", err);
  }
}

/**
 * Transition bot status with validation
 */
export async function transitionBotStatus(
  botId: string,
  newStatus: BotStatus,
  reason?: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: current } = await supabase
      .from("bot_health")
      .select("status, consecutive_errors")
      .eq("id", botId)
      .single();

    // Validate transitions
    const validTransition = isValidTransition(
      (current?.status as BotStatus) || "stopped",
      newStatus
    );

    if (!validTransition) {
      console.warn(
        `[BotHealth] Invalid transition: ${current?.status} -> ${newStatus}`
      );
      return false;
    }

    const updateData: {
      id: string;
      bot_name: string;
      status: string;
      updated_at: string;
      consecutive_errors?: number;
    } = {
      id: botId,
      bot_name: botId,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "running") {
      updateData.consecutive_errors = 0;
    }

    const { error } = await supabase
      .from("bot_health")
      .upsert(updateData, { onConflict: "id" });

    if (error) {
      console.error("[BotHealth] Failed to transition status:", error);
      return false;
    }

    console.log(`[BotHealth] Bot ${botId} transitioned: ${current?.status} -> ${newStatus}${reason ? ` (${reason})` : ""}`);
    return true;
  } catch (error) {
    console.error("[BotHealth] Unexpected error transitioning status:", error);
    return false;
  }
}

/**
 * Check if a state transition is valid
 */
function isValidTransition(from: BotStatus, to: BotStatus): boolean {
  const transitions: Record<BotStatus, BotStatus[]> = {
    stopped: ["running", "paused"],
    running: ["paused", "error", "stopped"],
    paused: ["running", "stopped"],
    error: ["paused", "stopped"], // Error must go to paused first (manual intervention)
  };

  return transitions[from]?.includes(to) || false;
}

/**
 * Initialize bot health for a new bot
 */
export async function initializeBotHealth(
  botId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase.from("bot_health").insert({
      id: botId,
      bot_name: botId,
      user_id: userId,
      status: "stopped",
      last_heartbeat: new Date().toISOString(),
      error_count: 0,
      consecutive_errors: 0,
      max_consecutive_errors: 3,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[BotHealth] Failed to initialize bot:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[BotHealth] Unexpected error initializing bot:", error);
    return false;
  }
}

/**
 * Marketing Analytics Helper
 * 
 * Tracks CTA clicks and other marketing events.
 * Works with both authenticated and anonymous users.
 */

import { createClient } from "@/lib/supabase/client";

// Valid tracking IDs whitelist
export const VALID_TRACKING_IDS = new Set([
  "pricing-primary",
  "pricing-secondary",
  "paper-primary",
  "paper-secondary",
  "hero-primary",
  "hero-secondary",
  "course-primary",
  "course-secondary",
  "help-primary",
  "signup-primary",
]);

// Valid funnel stages
export type FunnelStage = "landing" | "paper" | "pricing" | "course" | "signup" | "general";

export const VALID_FUNNEL_STAGES: FunnelStage[] = [
  "landing",
  "paper",
  "pricing",
  "course",
  "signup",
  "general",
];

interface LogCtaClickParams {
  trackingId: string;
  locale: string;
  variant: string;
  href: string;
  location: string;
  experimentKey?: string;
  variantKey?: "A" | "B";
  funnelStage?: FunnelStage;
}

/**
 * Get or create anonymous session ID
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  let sessionId = localStorage.getItem("klarpakke_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("klarpakke_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Get funnel stage for a tracking ID
 */
export function getFunnelStageForTrackingId(trackingId: string): FunnelStage {
  if (trackingId.startsWith("pricing")) return "pricing";
  if (trackingId.startsWith("paper")) return "paper";
  if (trackingId.startsWith("course")) return "course";
  if (trackingId.startsWith("signup")) return "signup";
  if (trackingId.startsWith("hero")) return "landing";
  return "general";
}

/**
 * Log CTA click event
 * Fire-and-forget: Does not block UI, logs errors to console
 */
export async function logCtaClick(params: LogCtaClickParams): Promise<void> {
  try {
    // Validate tracking ID
    if (!VALID_TRACKING_IDS.has(params.trackingId)) {
      console.warn(`[Analytics] Unknown trackingId: ${params.trackingId}`);
    }

    // Auto-detect funnel stage if not provided
    const funnelStage = params.funnelStage || getFunnelStageForTrackingId(params.trackingId);

    const supabase = createClient();

    // Get current user (if logged in)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sessionId = user ? null : getSessionId();

    // Prepare event data
    const eventData = {
      tracking_id: params.trackingId,
      locale: params.locale,
      variant: params.variant,
      href: params.href,
      route: params.location,
      experiment_key: params.experimentKey || null,
      variant_key: params.variantKey || null,
      funnel_stage: funnelStage,
      user_id: user?.id || null,
      session_id: sessionId,
    };

    // Call edge function
    const { error } = await supabase.functions.invoke("log-marketing-cta", {
      body: eventData,
    });

    if (error) {
      // Silent fail - don't break user experience
      console.error("[Analytics] Failed to log CTA click:", error);
    }
  } catch (err) {
    // Silent fail
    console.error("[Analytics] Error in logCtaClick:", err);
  }
}

/**
 * Track marketing event (generic)
 */
export async function trackMarketingEvent(
  eventName: string,
  props?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sessionId = user ? null : getSessionId();

    await supabase.functions.invoke("track-event", {
      body: {
        event_name: eventName,
        props: props || {},
        session_id: sessionId,
        page_path: typeof window !== "undefined" ? window.location.pathname : null,
      },
    });
  } catch (err) {
    console.error("[Analytics] Error tracking event:", err);
  }
}

/**
 * Fetch funnel summary data for admin dashboard
 * Note: Table types must be regenerated after migration
 */
export async function fetchFunnelSummary(_days: number = 30) {
  // This function requires regenerated types after migration
  // Implementation uses direct query in dashboard component instead
  console.log("[Analytics] Use direct query in dashboard for now");
  return null;
}

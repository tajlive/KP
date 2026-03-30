// ═══════════════════════════════════════════════════════════════
// KLARPAKKE — Stripe Webhook Logger
// Logger alle webhook events for monitoring og debugging
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const receivedAt = new Date().toISOString();
  let eventId: string | null = null;
  let eventType: string | null = null;

  try {
    const body = await req.text();
    const event = JSON.parse(body);
    
    eventId = event.id;
    eventType = event.type;

    // Log to webhook_events table
    const { error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        type: eventType,
        stripe_event_id: eventId,
        payload: event,
        received_at: receivedAt,
        processed_at: null,
        status: "processing",
        processing_time_ms: null,
      });

    if (insertError) {
      console.error("[Webhook Logger] Failed to log event:", insertError);
    }

    // Check processing time alert threshold
    const startProcessing = Date.now();

    // Forward to actual webhook handler
    const webhookResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/stripe-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": req.headers.get("stripe-signature") || "",
        },
        body,
      }
    );

    const processedAt = new Date().toISOString();
    const processingTimeMs = Date.now() - startProcessing;

    // Update processing status
    await supabase
      .from("webhook_events")
      .update({
        processed_at: processedAt,
        status: webhookResponse.ok ? "completed" : "failed",
        processing_time_ms: processingTimeMs,
        error_message: webhookResponse.ok ? null : `HTTP ${webhookResponse.status}`,
      })
      .eq("stripe_event_id", eventId);

    // Alert if processing time > 3 seconds
    if (processingTimeMs > 3000) {
      console.warn(
        `[Webhook Logger] SLOW PROCESSING ALERT: ${eventType} took ${processingTimeMs}ms (threshold: 3000ms)`
      );
      
      // Log alert to monitoring table
      await supabase.from("monitoring_alerts").insert({
        severity: "warning",
        category: "webhook_performance",
        message: `Stripe webhook ${eventType} took ${processingTimeMs}ms to process`,
        metadata: {
          event_id: eventId,
          event_type: eventType,
          processing_time_ms: processingTimeMs,
        },
      });
    }

    // Return response from actual handler
    const responseBody = await webhookResponse.text();
    return new Response(responseBody, {
      status: webhookResponse.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Webhook Logger] Error:", error);
    
    // Log failure
    if (eventId) {
      await supabase
        .from("webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          status: "error",
          error_message: error.message || "Unknown error",
        })
        .eq("stripe_event_id", eventId);
    }

    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

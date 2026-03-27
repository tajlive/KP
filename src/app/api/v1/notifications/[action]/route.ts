/**
 * API v1: Notifications Consolidated Endpoint
 * 
 * Consolidates notification operations under /api/v1/notifications/[action]
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

const NOTIFICATION_ACTIONS = ["send", "subscribe", "unsubscribe", "status"] as const;
type NotificationAction = (typeof NOTIFICATION_ACTIONS)[number];

function isValidAction(action: string): action is NotificationAction {
  return NOTIFICATION_ACTIONS.includes(action as NotificationAction);
}

// Configure web-push with VAPID keys (lazy initialization)
let webpushInitialized = false;

function initWebPush() {
  if (webpushInitialized) return true;
  
  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        "mailto:admin@klarpakke.no",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );
      webpushInitialized = true;
      return true;
    } catch (error) {
      console.error("[v1/notifications] Failed to initialize web-push:", error);
      return false;
    }
  }
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: NOTIFICATION_ACTIONS },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const body = await request.json().catch(() => ({}));

    // Verify auth for sensitive operations
    const { data: { user } } = await supabase.auth.getUser();

    switch (action) {
      case "send":
        // Admin-only: requires CRON_SECRET or admin role
        return handleSendNotification(request, supabase, body);
      case "subscribe":
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return handleSubscribe(supabase, body, user.id);
      case "unsubscribe":
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return handleUnsubscribe(supabase, body, user.id);
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/notifications/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleSendNotification(
  request: NextRequest,
  supabase: any,
  body: any
) {
  try {
    // Initialize web-push if possible
    const canSendPush = initWebPush();
    
    // Verify admin/CRON auth
    const authHeader = request.headers.get("authorization");
    const isAdmin = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    if (!isAdmin) {
      // Check if user has admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { title, body: messageBody, icon, url, userIds, broadcast } = body;
    
    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "Title and body required" },
        { status: 400 }
      );
    }

    // Get subscriptions
    let subscriptions;
    if (broadcast) {
      const { data } = await supabase.from("push_subscriptions").select("*");
      subscriptions = data || [];
    } else if (userIds && userIds.length > 0) {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", userIds);
      subscriptions = data || [];
    } else {
      return NextResponse.json(
        { error: "userIds or broadcast required" },
        { status: 400 }
      );
    }

    // Send notifications (if web-push is available)
    if (!canSendPush) {
      return NextResponse.json({
        success: false,
        error: "Push notifications not configured (VAPID keys missing)",
        queued: subscriptions.length,
      }, { status: 503 });
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({ title, body: messageBody, icon, url })
          );
          return { success: true, userId: sub.user_id };
        } catch (error) {
          console.error(`[notifications/send] Failed for ${sub.user_id}`, error);
          return { success: false, userId: sub.user_id, error: String(error) };
        }
      })
    );

    const sent = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;
    const failed = results.length - sent;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("[v1/notifications/send]", error);
    return NextResponse.json(
      { error: "Send notification failed" },
      { status: 500 }
    );
  }
}

async function handleSubscribe(supabase: any, body: any, userId: string) {
  try {
    const { subscription, channel = "default" } = body;
    
    if (!subscription?.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: userId,
        channel,
        subscription,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,channel" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      subscription: data,
    });
  } catch (error) {
    console.error("[v1/notifications/subscribe]", error);
    return NextResponse.json(
      { error: "Subscribe failed" },
      { status: 500 }
    );
  }
}

async function handleUnsubscribe(supabase: any, body: any, userId: string) {
  try {
    const { channel = "default" } = body;

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("channel", channel);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      unsubscribed: true,
    });
  } catch (error) {
    console.error("[v1/notifications/unsubscribe]", error);
    return NextResponse.json(
      { error: "Unsubscribe failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    switch (action) {
      case "status":
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return handleGetStatus(supabase, user.id);
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/notifications/GET]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleGetStatus(supabase: any, userId: string) {
  try {
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("channel, updated_at")
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({
      subscribed: subscriptions && subscriptions.length > 0,
      channels: subscriptions?.map((s: any) => s.channel) || [],
      lastUpdated: subscriptions?.[0]?.updated_at,
    });
  } catch (error) {
    console.error("[v1/notifications/status]", error);
    return NextResponse.json(
      { error: "Status check failed" },
      { status: 500 }
    );
  }
}

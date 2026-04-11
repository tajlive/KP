/**
 * API v1: Admin Consolidated Endpoint
 * 
 * Consolidates admin operations under /api/v1/admin/[resource]/[action]
 * 
 * Resources:
 * - health: github-health, resend-health, stripe-health
 * - users: users, sync, user-tier, user-paper-balance
 * - campaigns: stats, recent
 * - errors: errors, resolve
 * - system: cron-trigger, kla130, verify
 * - dashboard: data, sessions, stats, funnel/stats
 */

import { NextRequest, NextResponse } from "next/server";

const ADMIN_RESOURCES = [
  "health",
  "users",
  "campaigns",
  "errors",
  "system",
  "dashboard",
] as const;

type AdminResource = (typeof ADMIN_RESOURCES)[number];

function isValidResource(resource: string): resource is AdminResource {
  return ADMIN_RESOURCES.includes(resource as AdminResource);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; action: string }> }
) {
  try {
    const { resource, action } = await params;
    
    if (!isValidResource(resource)) {
      return NextResponse.json(
        { error: "Unknown resource", validResources: ADMIN_RESOURCES },
        { status: 400 }
      );
    }

    // Delegate to existing handlers based on resource/action
    switch (resource) {
      case "health":
        return handleHealthAction(action, request);
      case "users":
        return handleUsersAction(action, request);
      case "campaigns":
        return handleCampaignsAction(action, request);
      case "errors":
        return handleErrorsAction(action, request);
      case "system":
        return handleSystemAction(action, request);
      case "dashboard":
        return handleDashboardAction(action, request);
      default:
        return NextResponse.json(
          { error: "Resource not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/admin/${(await params).resource}/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; action: string }> }
) {
  try {
    const { resource, action } = await params;
    
    if (!isValidResource(resource)) {
      return NextResponse.json(
        { error: "Unknown resource", validResources: ADMIN_RESOURCES },
        { status: 400 }
      );
    }

    switch (resource) {
      case "users":
        return handleUsersPostAction(action, request);
      case "errors":
        return handleErrorsPostAction(action, request);
      case "system":
        return handleSystemPostAction(action, request);
      default:
        return NextResponse.json(
          { error: "Resource not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/admin/${(await params).resource}/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Health Actions
// ============================================================================

async function handleHealthAction(action: string, request: NextRequest) {
  switch (action) {
    case "github": {
      const { GET: handler } = await import("@/app/api/admin/github-health/route");
      return handler(request);
    }
    case "resend": {
      const { GET: handler } = await import("@/app/api/admin/resend-health/route");
      return handler(request);
    }
    case "stripe": {
      const { GET: handler } = await import("@/app/api/admin/stripe-health/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown health action", validActions: ["github", "resend", "stripe"] },
        { status: 400 }
      );
  }
}

// ============================================================================
// Users Actions
// ============================================================================

async function handleUsersAction(action: string, request: NextRequest) {
  switch (action) {
    case "list": {
      const { GET: handler } = await import("@/app/api/admin/users/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown users action" },
        { status: 400 }
      );
  }
}

async function handleUsersPostAction(action: string, request: NextRequest) {
  switch (action) {
    case "sync": {
      const { POST: handler } = await import("@/app/api/admin/users/sync/route");
      return handler(request);
    }
    case "tier": {
      const { POST: handler } = await import("@/app/api/admin/user-tier/route");
      return handler(request);
    }
    case "paper-balance": {
      const { POST: handler } = await import("@/app/api/admin/user-paper-balance/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown users POST action" },
        { status: 400 }
      );
  }
}

// ============================================================================
// Campaigns Actions
// ============================================================================

async function handleCampaignsAction(action: string, request: NextRequest) {
  switch (action) {
    case "stats": {
      const { GET: handler } = await import("@/app/api/admin/campaign/stats/route");
      return handler();
    }
    case "recent": {
      const { GET: handler } = await import("@/app/api/admin/campaign/recent/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown campaigns action" },
        { status: 400 }
      );
  }
}

// ============================================================================
// Errors Actions
// ============================================================================

async function handleErrorsAction(action: string, request: NextRequest) {
  switch (action) {
    case "list": {
      const { GET: handler } = await import("@/app/api/admin/errors/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown errors action" },
        { status: 400 }
      );
  }
}

async function handleErrorsPostAction(action: string, request: NextRequest) {
  // Handle error/[id]/resolve pattern
  const errorIdMatch = action.match(/^resolve\/(.+)$/);
  if (errorIdMatch) {
    const errorId = errorIdMatch[1];
    const { POST: handler } = await import("@/app/api/admin/errors/[id]/resolve/route");
    return handler(request, { params: Promise.resolve({ id: errorId }) });
  }

  return NextResponse.json(
    { error: "Unknown errors POST action" },
    { status: 400 }
  );
}

// ============================================================================
// System Actions
// ============================================================================

async function handleSystemAction(action: string, request: NextRequest) {
  switch (action) {
    case "verify": {
      const { GET: handler } = await import("@/app/api/admin/verify/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown system action" },
        { status: 400 }
      );
  }
}

async function handleSystemPostAction(action: string, request: NextRequest) {
  switch (action) {
    case "cron-trigger": {
      const { POST: handler } = await import("@/app/api/admin/cron-trigger/route");
      return handler(request);
    }
    case "kla130": {
      const { POST: handler } = await import("@/app/api/admin/kla130/route");
      return handler(request);
    }
    default:
      return NextResponse.json(
        { error: "Unknown system POST action" },
        { status: 400 }
      );
  }
}

// ============================================================================
// Dashboard Actions
// ============================================================================

async function handleDashboardAction(action: string, request: NextRequest) {
  switch (action) {
    case "data": {
      const { GET: handler } = await import("@/app/api/admin/dashboard/data/route");
      return handler(request);
    }
    case "sessions": {
      const { GET: handler } = await import("@/app/api/admin/sessions/route");
      return handler();
    }
    case "stats": {
      const { GET: handler } = await import("@/app/api/admin/stats/route");
      return handler();
    }
    case "funnel-stats": {
      const { GET: handler } = await import("@/app/api/admin/funnel/stats/route");
      return handler();
    }
    default:
      return NextResponse.json(
        { error: "Unknown dashboard action" },
        { status: 400 }
      );
  }
}

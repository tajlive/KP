/**
 * WebSocket Health Check API
 * 
 * Returns WebSocket connection status, metrics, and diagnostic information.
 * Used for monitoring and alerting.
 */

import { NextResponse } from "next/server";
import { WebSocketManager } from "@/lib/websocket/WebSocketManager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface WebSocketHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  connection: {
    state: string;
    isCircuitOpen: boolean;
  };
  subscriptions: {
    total: number;
    uniqueSymbols: number;
    symbols: string[];
  };
  metrics: {
    connectCount: number;
    reconnectCount: number;
    errorCount: number;
    lastMessageAt: string | null;
    lastConnectAt: string | null;
    messagesReceived: number;
    bytesReceived: number;
    uptimeSeconds: number | null;
  };
  checks: {
    isConnected: boolean;
    hasRecentMessage: boolean;
    hasSubscriptions: boolean;
    noExcessiveReconnects: boolean;
  };
}

const STALE_MESSAGE_THRESHOLD_MS = 60000; // 1 minute
const EXCESSIVE_RECONNECT_THRESHOLD = 10;

export async function GET(): Promise<NextResponse<WebSocketHealthCheck>> {
  const manager = WebSocketManager.getInstance();
  
  const connectionState = manager.getConnectionState();
  const metrics = manager.getMetrics();
  const subscribedSymbols = manager.getSubscribedSymbols();
  const isCircuitOpen = manager.isCircuitOpen();
  
  const now = Date.now();
  
  // Calculate uptime
  const uptimeSeconds = metrics.lastConnectAt 
    ? Math.floor((now - metrics.lastConnectAt) / 1000)
    : null;
  
  // Perform health checks
  const checks = {
    isConnected: connectionState === "connected",
    hasRecentMessage: metrics.lastMessageAt 
      ? (now - metrics.lastMessageAt) < STALE_MESSAGE_THRESHOLD_MS
      : false,
    hasSubscriptions: subscribedSymbols.length > 0,
    noExcessiveReconnects: metrics.reconnectCount < EXCESSIVE_RECONNECT_THRESHOLD,
  };
  
  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy";
  
  if (isCircuitOpen) {
    status = "unhealthy";
  } else if (checks.isConnected && checks.hasRecentMessage) {
    status = "healthy";
  } else if (checks.isConnected || subscribedSymbols.length === 0) {
    // Connected but no recent message, or no subscriptions (idle)
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  const health: WebSocketHealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    connection: {
      state: connectionState,
      isCircuitOpen,
    },
    subscriptions: {
      total: manager.getSubscriptionCount(),
      uniqueSymbols: subscribedSymbols.length,
      symbols: subscribedSymbols.slice(0, 20), // Limit to 20 symbols
    },
    metrics: {
      connectCount: metrics.connectCount,
      reconnectCount: metrics.reconnectCount,
      errorCount: metrics.errorCount,
      lastMessageAt: metrics.lastMessageAt 
        ? new Date(metrics.lastMessageAt).toISOString()
        : null,
      lastConnectAt: metrics.lastConnectAt 
        ? new Date(metrics.lastConnectAt).toISOString()
        : null,
      messagesReceived: metrics.messagesReceived,
      bytesReceived: metrics.bytesReceived,
      uptimeSeconds,
    },
    checks,
  };

  const statusCode = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * POST endpoint to trigger a reconnect or reset
 * Useful for manual intervention when issues are detected
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { action?: "reconnect" | "reset" };
    const manager = WebSocketManager.getInstance();
    
    switch (body.action) {
      case "reconnect": {
        manager.reconnect();
        return NextResponse.json({
          success: true,
          message: "Reconnect triggered",
          timestamp: new Date().toISOString(),
        });
      }
      
      case "reset": {
        WebSocketManager.resetInstance();
        return NextResponse.json({
          success: true,
          message: "WebSocket manager reset",
          timestamp: new Date().toISOString(),
        });
      }
      
      default: {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Use 'reconnect' or 'reset'.",
          },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * API v1: Trade Detail Endpoint
 * 
 * Consolidates trade operations under /api/v1/trades/[tradeId]
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  try {
    const { tradeId } = await params;
    
    // Delegate to existing handler by reconstructing the request
    const { GET: tradeHandler } = await import("@/app/api/trades/[tradeId]/route");
    return tradeHandler(request, { params: Promise.resolve({ tradeId }) });
  } catch (error) {
    console.error(`[v1/trades/${(await params).tradeId}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

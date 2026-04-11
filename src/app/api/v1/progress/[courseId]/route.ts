/**
 * API v1: Progress Consolidated Endpoint
 * 
 * Consolidates progress operations under /api/v1/progress/[courseId]
 */

import { NextRequest, NextResponse } from "next/server";

// For course-specific progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    
    if (courseId === "all" || courseId === "general") {
      // Get all progress
      const { GET: progressHandler } = await import("@/app/api/progress/route");
      return progressHandler(request);
    }
    
    // Delegate to existing handler
    const { GET: courseProgressHandler } = await import("@/app/api/progress/[courseId]/route");
    return courseProgressHandler(request, { params: Promise.resolve({ courseId }) });
  } catch (error) {
    console.error(`[v1/progress/${(await params).courseId}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    
    if (courseId === "update") {
      // Update progress
      const { POST: progressHandler } = await import("@/app/api/progress/route");
      return progressHandler(request);
    }
    
    return NextResponse.json(
      { error: "Invalid courseId for POST" },
      { status: 400 }
    );
  } catch (error) {
    console.error(`[v1/progress/${(await params).courseId}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

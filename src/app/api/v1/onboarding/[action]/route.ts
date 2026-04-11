/**
 * API v1: Onboarding Consolidated Endpoint
 * 
 * Consolidates onboarding operations under /api/v1/onboarding/[action]
 * 
 * Actions:
 * - start: Start onboarding process
 * - complete: Complete onboarding process
 */

import { NextRequest, NextResponse } from "next/server";

const ONBOARDING_ACTIONS = [
  "start",
  "complete",
] as const;

type OnboardingAction = (typeof ONBOARDING_ACTIONS)[number];

function isValidAction(action: string): action is OnboardingAction {
  return ONBOARDING_ACTIONS.includes(action as OnboardingAction);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: ONBOARDING_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "start": {
        const { POST: startHandler } = await import("@/app/api/onboarding/start/route");
        return startHandler(request);
      }
      case "complete": {
        const { POST: completeHandler } = await import("@/app/api/onboarding/complete/route");
        return completeHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/onboarding/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

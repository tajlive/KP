/**
 * API v1: Payments Consolidated Endpoint
 * 
 * Consolidates payment operations under /api/v1/payments/[action]
 * 
 * Actions:
 * - checkout: Create Stripe checkout session
 * - verify-session: Verify Stripe session
 * - customer-portal: Create customer portal session
 */

import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ACTIONS = [
  "checkout",
  "verify-session",
  "customer-portal",
] as const;

type PaymentAction = (typeof PAYMENT_ACTIONS)[number];

function isValidAction(action: string): action is PaymentAction {
  return PAYMENT_ACTIONS.includes(action as PaymentAction);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: PAYMENT_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "checkout": {
        const { POST: checkoutHandler } = await import("@/app/api/stripe/checkout/route");
        return checkoutHandler(request);
      }
      case "customer-portal": {
        const { POST: portalHandler } = await import("@/app/api/stripe/customer-portal/route");
        return portalHandler(request);
      }
      case "verify-session": {
        // verify-session only has GET
        return NextResponse.json(
          { error: "verify-session only supports GET" },
          { status: 405 }
        );
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/payments/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
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
        { error: "Unknown action", validActions: PAYMENT_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "verify-session": {
        // verify-session uses POST, not GET
        return NextResponse.json(
          { error: "verify-session only supports POST" },
          { status: 405 }
        );
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/payments/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

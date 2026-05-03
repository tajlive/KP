/**
 * API v1: Webhooks Consolidated Endpoint
 * 
 * Consolidates webhook handlers under /api/v1/webhooks/[provider]
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const WEBHOOK_PROVIDERS = ["stripe", "resend", "github"] as const;
type WebhookProvider = (typeof WEBHOOK_PROVIDERS)[number];

function isValidProvider(provider: string): provider is WebhookProvider {
  return WEBHOOK_PROVIDERS.includes(provider as WebhookProvider);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    
    if (!isValidProvider(provider)) {
      return NextResponse.json(
        { error: "Unknown provider", validProviders: WEBHOOK_PROVIDERS },
        { status: 400 }
      );
    }

    const body = await request.text();
    const headers = request.headers;

    switch (provider) {
      case "stripe":
        return handleStripeWebhook(body, headers);
      case "resend":
        return handleResendWebhook(body, headers);
      case "github":
        return handleGitHubWebhook(body, headers);
      default:
        return NextResponse.json(
          { error: "Provider not implemented" },
          { status: 501 }
        );
    }
  } catch (error) {
    console.error(`[v1/webhooks/${(await params).provider}]`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleStripeWebhook(body: string, headers: Headers) {
  try {
    const signature = headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // For Stripe, we keep the original endpoint to preserve signature verification
    // This v1 endpoint acts as a proxy/alternative
    return NextResponse.json(
      { 
        message: "Use /api/webhooks/stripe for Stripe webhooks (signature verification)",
        alternative: "/api/v1/webhooks/stripe (for info only)"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v1/webhooks/stripe]", error);
    return NextResponse.json(
      { error: "Stripe webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleResendWebhook(body: string, headers: Headers) {
  try {
    const signature = headers.get("resend-signature") || headers.get("x-resend-signature");
    
    // Delegate to existing resend handler
    const { POST: existingHandler } = await import(
      "@/app/api/webhooks/resend/route"
    );
    
    // Create a proper NextRequest-like object
    const mockRequest = new Request("http://localhost/api/webhooks/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "resend-signature": signature } : {}),
      },
      body,
    }) as unknown as NextRequest;

    return await existingHandler(mockRequest as NextRequest);
  } catch (error) {
    console.error("[v1/webhooks/resend]", error);
    return NextResponse.json(
      { error: "Resend webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleGitHubWebhook(body: string, headers: Headers) {
  try {
    const signature = headers.get("x-hub-signature-256");
    const event = headers.get("x-github-event");
    
    if (!signature || !event) {
      return NextResponse.json(
        { error: "Missing required GitHub headers" },
        { status: 400 }
      );
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    // Verify signature
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("[v1/webhooks/github]", error);
    return NextResponse.json(
      { error: "GitHub webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  if (!isValidProvider(provider)) {
    return NextResponse.json(
      { error: "Unknown provider" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    provider,
    status: "active",
    events: getSupportedEvents(provider),
  });
}

function getSupportedEvents(provider: WebhookProvider): string[] {
  switch (provider) {
    case "stripe":
      return ["checkout.session.completed", "invoice.payment_succeeded", "customer.subscription.updated"];
    case "resend":
      return ["email.delivered", "email.opened", "email.bounced"];
    case "github":
      return ["push", "pull_request", "issues"];
    default:
      return [];
  }
}

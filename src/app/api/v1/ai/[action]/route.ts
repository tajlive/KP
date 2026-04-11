/**
 * API v1: AI Consolidated Endpoint
 * 
 * Consolidates AI operations under /api/v1/ai/[action]
 * 
 * Actions:
 * - chat: AI chat conversation
 * - ensemble: Ensemble AI predictions
 * - market-brief: Market brief generation
 * - explain-strategy: Strategy explanation
 * - explain-trade: Trade explanation
 * - analyze-trade: Trade analysis
 * - sentiment: Sentiment analysis
 */

import { NextRequest, NextResponse } from "next/server";

const AI_ACTIONS = [
  "chat",
  "ensemble",
  "market-brief",
  "explain-strategy",
  "explain-trade",
  "analyze-trade",
  "sentiment",
] as const;

type AiAction = (typeof AI_ACTIONS)[number];

function isValidAction(action: string): action is AiAction {
  return AI_ACTIONS.includes(action as AiAction);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: AI_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing route handlers
    switch (action) {
      case "chat": {
        const { POST: chatHandler } = await import("@/app/api/ai/chat/route");
        return chatHandler(request);
      }
      case "market-brief": {
        // market-brief only has GET
        return NextResponse.json(
          { error: "market-brief only supports GET" },
          { status: 405 }
        );
      }
      case "explain-strategy": {
        const { POST: explainStrategyHandler } = await import("@/app/api/ai/explain-strategy/route");
        return explainStrategyHandler(request);
      }
      case "explain-trade": {
        const { POST: explainTradeHandler } = await import("@/app/api/ai/explain-trade/route");
        return explainTradeHandler(request);
      }
      case "analyze-trade": {
        const { POST: analyzeTradeHandler } = await import("@/app/api/ai/analyze-trade/route");
        return analyzeTradeHandler(request);
      }
      case "ensemble": {
        const { POST: ensembleHandler } = await import("@/app/api/ai/ensemble/route");
        return ensembleHandler(request);
      }
      case "sentiment": {
        // sentiment only has GET
        return NextResponse.json(
          { error: "sentiment only supports GET" },
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
    console.error(`[v1/ai/${(await params).action}]`, error);
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
        { error: "Unknown action", validActions: AI_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "sentiment": {
        const { GET: sentimentHandler } = await import("@/app/api/ai/sentiment/route");
        return sentimentHandler(request);
      }
      case "market-brief": {
        const { GET: marketBriefHandler } = await import("@/app/api/ai/market-brief/route");
        return marketBriefHandler();
      }
      case "ensemble": {
        // ensemble only has POST
        return NextResponse.json(
          { error: "ensemble only supports POST" },
          { status: 405 }
        );
      }
      case "chat": {
        const { GET: chatHandler } = await import("@/app/api/ai/chat/route");
        return chatHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/ai/GET]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Correlation ID middleware.
 *
 * Reads or generates a X-Correlation-Id header and injects it into both:
 * - The response header (for clients/WAF to trace)
 * - The logger's in-memory store (for JSON-structured logs)
 *
 * Enterprise logging: every log line in a request shares the same correlationId.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateCorrelationId, setCorrelationId } from "@/lib/logger";

export function correlationIdMiddleware(
  request: NextRequest,
  response?: NextResponse,
): NextResponse {
  const existing = request.headers.get("X-Correlation-Id");
  const id = existing ?? generateCorrelationId();

  setCorrelationId(id);
  
  const res = response ?? NextResponse.next();
  res.headers.set("X-Correlation-Id", id);
  return res;
}

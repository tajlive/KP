import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareFn } from "./types";
import { isTerminal } from "./types";

/**
 * Compose middlewares into a chain.
 *
 * Each middleware receives the original request plus the accumulated response
 * from previous steps.  If a middleware returns a terminal response
 * (redirect, rewrite, 429, etc.) the chain stops immediately.
 */
export function chain(...middlewares: MiddlewareFn[]) {
  return async (request: NextRequest): Promise<NextResponse> => {
    let response = NextResponse.next();

    for (const mw of middlewares) {
      response = await mw(request, response);
      if (isTerminal(response)) {
        return response;
      }
    }

    return response;
  };
}

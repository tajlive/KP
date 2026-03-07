import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Minimal test middleware
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-middleware-test", "running");
  
  const acceptLang = request.headers.get("accept-language");
  response.headers.set("x-accept-lang", acceptLang || "none");
  
  return response;
}

export const config = {
  matcher: ["/"],
};

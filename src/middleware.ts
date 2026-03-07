import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Test with all paths matcher
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only process root path for now
  if (pathname !== "/") {
    return NextResponse.next();
  }
  
  const response = NextResponse.next();
  response.headers.set("x-middleware-ran", "true");
  
  const acceptLang = request.headers.get("accept-language");
  response.headers.set("x-accept-lang", acceptLang || "none");
  
  return response;
}

// Match all paths except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

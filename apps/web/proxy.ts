import { NextResponse, type NextRequest } from "next/server";
import { getDemoCredentials, isAuthorised } from "@/lib/auth/basicAuth";

/**
 * Password-protects a hosted demo. When DEMO_USER and DEMO_PASSWORD are set,
 * every page and API route requires HTTP Basic auth; locally (unset) the app
 * is open as before.
 */
export function proxy(request: NextRequest) {
  const credentials = getDemoCredentials();
  if (!credentials) return NextResponse.next();

  if (isAuthorised(request.headers.get("authorization"), credentials)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Estate AI demo"' },
  });
}

export const config = {
  // Skip Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

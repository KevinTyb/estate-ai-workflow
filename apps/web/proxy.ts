import { NextResponse, type NextRequest } from "next/server";
import { getDemoAuthMode, isAuthorised } from "@/lib/auth/basicAuth";

/**
 * Password-protects a hosted demo with HTTP Basic auth. Fails closed: if
 * the credentials are half-configured, or missing on a production server
 * without ALLOW_PUBLIC_ACCESS=true, every request is refused.
 */
export function proxy(request: NextRequest) {
  const mode = getDemoAuthMode();

  if (mode.kind === "open") return NextResponse.next();

  if (mode.kind === "misconfigured") {
    console.error(`Demo authentication misconfigured: ${mode.reason}`);
    return new NextResponse(
      "Service unavailable: authentication is not configured.",
      {
        status: 503,
      },
    );
  }

  if (isAuthorised(request.headers.get("authorization"), mode.credentials)) {
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
